import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Reveal, SectionHead } from '../components/Reveal';
import { Tarsier, type Mood } from '../components/Tarsier';
import { RELEASE, REPO, VERSION, download, type Os, type ReleaseFile } from '../lib/env';

type Platform = 'mac' | 'win';
type Pick = ReleaseFile & { label: string; kind: string; format: string; first: string };

const EASE = [0.2, 0.7, 0.1, 1] as const;

/** Steps after the first one; the first depends on the picked file. */
const PLATFORMS: Record<Platform, { name: string; chip: string; needs: string; files: Pick[]; steps: { text: string; cmd?: string }[] }> = {
  mac: {
    name: 'macOS',
    chip: 'Apple Silicon',
    needs: 'macOS 12+',
    files: [{ ...RELEASE.mac, label: 'Unduh .dmg', kind: 'Disk image', format: '.dmg', first: 'Buka .dmg, seret DEVUNRA ke Applications.' }],
    steps: [
      { text: 'Diblokir Gatekeeper? Izinkan sekali:', cmd: 'xattr -dr com.apple.quarantine /Applications/DEVUNRA.app' },
      { text: 'Settings › Engine › Pasang semua.' },
    ],
  },
  win: {
    name: 'Windows',
    chip: 'x64',
    needs: 'Windows 10+',
    files: [
      { ...RELEASE.winSetup, label: 'Unduh .exe', kind: 'Installer', format: '.exe', first: 'Jalankan installer, pilih folder.' },
      { ...RELEASE.winZip, label: 'Unduh .zip', kind: 'Portable', format: '.zip', first: 'Ekstrak .zip, jalankan DEVUNRA.exe.' },
    ],
    steps: [
      { text: 'SmartScreen muncul? More info › Run anyway.' },
      { text: 'Settings › Engine › Pasang semua (lewat Scoop).' },
    ],
  },
};

const NEW = [
  { label: 'Apache asli + .htaccess', href: '#jalur' },
  { label: 'HTTPS lokal', href: '#jalur' },
  { label: 'Domain .test', href: '#jalur' },
  { label: 'Pasang engine sekali klik', href: '#app' },
  { label: 'mail() PHP tertangkap', href: '#app' },
];

function useCopy(): [boolean, (text: string) => void] {
  const [done, setDone] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = (text: string) => {
    void navigator.clipboard?.writeText(text).catch(() => undefined);
    setDone(true);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setDone(false), 1800);
  };
  return [done, copy];
}

function CopyIcon({ done }: { done: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
      {done ? (
        <path d="m3 8.5 3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M5.5 5.5V3.2c0-.4.3-.7.7-.7h6.6c.4 0 .7.3.7.7v6.6c0 .4-.3.7-.7.7h-2.3M3.2 5.5h6.6c.4 0 .7.3.7.7v6.6c0 .4-.3.7-.7.7H3.2a.7.7 0 0 1-.7-.7V6.2c0-.4.3-.7.7-.7Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
      )}
    </svg>
  );
}

/** The release file's checksum: tap to see all of it, copy with one click. */
function Checksum({ sha }: { sha: string }) {
  const [open, setOpen] = useState(false);
  const [done, copy] = useCopy();
  return (
    <div className="dlx-sha">
      <span className="dlx-k mono">SHA-256</span>
      <button type="button" className="dlx-hash mono" aria-expanded={open} onClick={() => setOpen((o) => !o)} title="Lihat lengkap">
        {open ? sha : `${sha.slice(0, 12)}…${sha.slice(-8)}`}
      </button>
      <button type="button" className={done ? 'dlx-copy is-done' : 'dlx-copy'} onClick={() => copy(sha)} aria-label="Salin checksum">
        <CopyIcon done={done} />
        <span>{done ? 'Tersalin' : 'Salin'}</span>
      </button>
    </div>
  );
}

function CommandChip({ cmd }: { cmd: string }) {
  const [done, copy] = useCopy();
  return (
    <button type="button" className={done ? 'dlx-cmd mono is-done' : 'dlx-cmd mono'} onClick={() => copy(cmd)} aria-label="Salin perintah">
      <span className="dlx-cmd-text">{cmd}</span>
      <CopyIcon done={done} />
    </button>
  );
}

/** The real download link; the click also plays a short fill so the page answers right away. */
function DownloadButton({ file, onState }: { file: Pick; onState: (busy: boolean) => void }) {
  const [phase, setPhase] = useState<'idle' | 'fire' | 'done'>('idle');
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const fire = () => {
    timers.current.forEach(clearTimeout);
    setPhase('fire');
    onState(true);
    timers.current = [
      window.setTimeout(() => setPhase('done'), 1100),
      window.setTimeout(() => {
        setPhase('idle');
        onState(false);
      }, 3600),
    ];
  };
  return (
    <motion.a className="btn btn-primary dlx-go" href={download(file.file)} rel="noopener" onClick={fire} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
      <motion.span
        className="dlx-fill"
        aria-hidden="true"
        initial={false}
        animate={{ scaleX: phase === 'idle' ? 0 : 1, opacity: phase === 'done' ? 0 : 1 }}
        transition={{ duration: phase === 'fire' ? 1.1 : 0.4, ease: EASE }}
      />
      <span className="dlx-go-in">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={phase} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} transition={{ duration: 0.2 }}>
            {phase === 'done' ? 'Unduhan dimulai' : phase === 'fire' ? 'Menyiapkan…' : file.label}
          </motion.span>
        </AnimatePresence>
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          {phase === 'done' ? (
            <path d="m3 8.5 3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <path d="M8 2v9m0 0 3.5-3.5M8 11 4.5 7.5M2.5 14h11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
      </span>
    </motion.a>
  );
}

export function Download({ os }: { os: Os }): React.ReactElement {
  const [pick, setPick] = useState<Platform>(os === 'win' ? 'win' : 'mac');
  const [fileIdx, setFileIdx] = useState(0);
  const [mood, setMood] = useState<Mood>('sleep');
  const platform = PLATFORMS[pick];
  const file = platform.files[Math.min(fileIdx, platform.files.length - 1)];

  const choose = (next: Platform) => {
    setPick(next);
    setFileIdx(0);
  };

  return (
    <section className="sect" id="unduh">
      <div className="wrap">
        <SectionHead index="07" label="Unduh" title="Unduh DEVUNRA." />
        <Reveal className="dlx" delay={0.08}>
          <div className="dlx-switch" role="tablist" aria-label="Sistem operasi">
            {(Object.keys(PLATFORMS) as Platform[]).map((id) => (
              <button key={id} type="button" role="tab" aria-selected={pick === id} onClick={() => choose(id)}>
                {pick === id && <motion.span layoutId="dlx-pill" className="dlx-pill" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
                <span className="dlx-switch-label">{PLATFORMS[id].name}</span>
                {os === id && <span className="dlx-you mono">kamu</span>}
              </button>
            ))}
          </div>

          <div
            className="dlx-card"
            onPointerEnter={() => setMood((m) => (m === 'busy' ? m : 'awake'))}
            onPointerLeave={() => setMood((m) => (m === 'busy' ? m : 'sleep'))}
          >
            <span className="dlx-tz" aria-hidden="true">
              <Tarsier mood={mood} reach={2.4} />
            </span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={pick}
                className="dlx-grid"
                initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(8px)' }}
                transition={{ duration: 0.45, ease: EASE }}
              >
                <div className="dlx-main">
                  <div className="dlx-title">
                    <h3>{platform.name}</h3>
                    <span className="dlx-ver mono">
                      <span className="led led-on" />v{VERSION}
                    </span>
                  </div>

                  {platform.files.length > 1 && (
                    <div className="dlx-kind" role="radiogroup" aria-label="Jenis file">
                      {platform.files.map((f, i) => (
                        <button key={f.file} type="button" role="radio" aria-checked={i === fileIdx} onClick={() => setFileIdx(i)}>
                          {f.kind}
                        </button>
                      ))}
                    </div>
                  )}

                  <dl className="dlx-specs mono">
                    {[
                      ['Chip', platform.chip],
                      ['Format', file.format],
                      ['Ukuran', `${file.mb} MB`],
                      ['Butuh', platform.needs],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.dd key={v} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
                            {v}
                          </motion.dd>
                        </AnimatePresence>
                      </div>
                    ))}
                  </dl>

                  <div className="dlx-actions">
                    <DownloadButton file={file} onState={(busy) => setMood(busy ? 'busy' : 'awake')} />
                    <span className="dlx-date mono">Rilis {RELEASE.date}</span>
                  </div>
                  <Checksum sha={file.sha256} />
                </div>

                <ol className="dlx-steps">
                  {[{ text: file.first } as { text: string; cmd?: string }, ...platform.steps].map((s, i) => (
                    <motion.li
                      key={s.text}
                      initial={{ opacity: 0, x: 14 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, ease: EASE, delay: 0.12 + i * 0.08 }}
                    >
                      <span className="dlx-n mono">{i + 1}</span>
                      <span className="dlx-step">
                        {s.text}
                        {s.cmd && <CommandChip cmd={s.cmd} />}
                      </span>
                    </motion.li>
                  ))}
                </ol>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="dlx-new">
            <span className="dlx-k mono">Baru di {VERSION}</span>
            <div className="dlx-chips">
              {NEW.map((n) => (
                <a key={n.label} href={n.href} className="dlx-chip">
                  {n.label}
                </a>
              ))}
            </div>
          </div>
        </Reveal>
        <Reveal as="p" className="dl-note mono" delay={0.12}>
          Versi lama dan catatan rilis ada di{' '}
          <a href={`${REPO}/releases`} target="_blank" rel="noopener noreferrer">
            GitHub Releases
          </a>
          .
        </Reveal>
      </div>
    </section>
  );
}
