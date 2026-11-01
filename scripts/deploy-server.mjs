import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const exec = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await readFile(join(root, 'hosting.json'), 'utf8'));
const host = process.env.DEVUNRA_SSH_HOST || config.sshHost;
const base = config.path;
const domain = new URL(config.url).hostname;
if (!/^[a-zA-Z0-9_.-]+$/.test(host) || !/^\/var\/www\/[a-zA-Z0-9.-]+$/.test(base) || !/^[a-zA-Z0-9.-]+$/.test(domain)) {
  throw new Error('Invalid deployment host, directory, or domain.');
}
const release = new Date().toISOString().replace(/[-:.]/g, '') + '-' + randomUUID().slice(0, 8);
const destination = `${base}/releases/${release}`;
const next = `${base}/current-${release}`;

function remote(command) {
  return exec('ssh', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15', host, command], { cwd: root });
}

try {
  console.log('Building DEVUNRA…');
  const build = await exec('npm', ['run', 'build'], { cwd: root });
  process.stdout.write(build.stdout);

  const { stdout } = await remote(`readlink ${base}/current`);
  const previous = stdout.trim();
  if (!previous.startsWith(`${base}/releases/`) || !/^[a-zA-Z0-9/_.-]+$/.test(previous)) {
    throw new Error('The existing release could not be verified; deployment stopped.');
  }
  await remote(`mkdir -p ${destination}`);
  await exec('rsync', ['-az', '--', `${join(root, 'dist')}/`, `${host}:${destination}/`], { cwd: root });
  await remote(`set -eu
find ${destination} -type d -exec chmod 0755 {} +
find ${destination} -type f -exec chmod 0644 {} +
ln -s ${destination} ${next}
mv -Tf ${next} ${base}/current`);

  try {
    await remote(`curl --fail --silent --show-error --max-time 20 --resolve ${domain}:443:127.0.0.1 https://${domain}/ -o /dev/null`);
  } catch (error) {
    await remote(`set -eu
ln -s ${previous} ${next}
mv -Tf ${next} ${base}/current`);
    throw new Error(`Website check failed; the previous release was restored. ${error.message}`);
  }
  console.log(`Published ${release} on the Arsinode server. ${config.url}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
