import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const exec = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await readFile(join(root, 'aws-hosting.json'), 'utf8'));
const temp = await mkdtemp(join(tmpdir(), 'devunra-aws-'));

async function aws(args) {
  const { stdout } = await exec('aws', [
    'amplify', ...args, '--region', config.region, '--output', 'json', '--no-cli-pager',
  ], { cwd: root, maxBuffer: 8 * 1024 * 1024 });
  return stdout.trim() ? JSON.parse(stdout) : {};
}

try {
  console.log('Building DEVUNRA…');
  const build = await exec('npm', ['run', 'build'], { cwd: root });
  process.stdout.write(build.stdout);

  const archive = join(temp, 'site.zip');
  await exec('zip', ['-qr', archive, '.'], { cwd: join(root, 'dist') });

  const deployment = await aws([
    'create-deployment', '--app-id', config.appId, '--branch-name', config.branch,
  ]);
  const uploadUrl = new URL(deployment.zipUploadUrl);
  if (uploadUrl.protocol !== 'https:' || !uploadUrl.hostname.endsWith('.amazonaws.com')) {
    throw new Error('AWS returned an unexpected upload destination.');
  }
  const upload = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/zip' },
    body: await readFile(archive),
  });
  if (!upload.ok) throw new Error(`AWS upload failed (${upload.status}).`);

  await aws([
    'start-deployment', '--app-id', config.appId, '--branch-name', config.branch,
    '--job-id', deployment.jobId,
  ]);
  console.log(`AWS deployment ${deployment.jobId} started.`);

  const deadline = Date.now() + 20 * 60_000;
  let previous;
  while (Date.now() < deadline) {
    const { job } = await aws([
      'get-job', '--app-id', config.appId, '--branch-name', config.branch,
      '--job-id', deployment.jobId,
    ]);
    const status = job.summary.status;
    if (status !== previous) console.log(`Deployment: ${status}`);
    previous = status;
    if (status === 'SUCCEED') {
      console.log(`Published to AWS Amplify. Production address: ${config.url}`);
      break;
    }
    if (['FAILED', 'CANCELLED'].includes(status)) {
      throw new Error(`AWS deployment ${deployment.jobId} ${status.toLowerCase()}.`);
    }
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  if (previous !== 'SUCCEED') throw new Error('Deployment is still pending after 20 minutes; check AWS Amplify.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await rm(temp, { recursive: true, force: true });
}
