import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring } from 'motion/react';
import { Reveal, SectionHead } from '../components/Reveal';
import { asset, type Theme } from '../lib/env';

/** Real screenshots of the app, in the page's theme, with a slight tilt toward the pointer. */
const SHOTS = [
  { id: 'services', label: 'Services', cap: 'Semua service, satu tabel. LED hijau berarti jalan.' },
  { id: 'projects', label: 'Projects', cap: 'Tiap folder di www jadi situs, lengkap dengan versi PHP-nya.' },
  { id: 'databases', label: 'Databases', cap: 'MySQL dan PostgreSQL berdampingan.' },
  { id: 'query', label: 'Query', cap: 'Query langsung dari aplikasi.' },
  { id: 'engine', label: 'Engine', cap: 'Tool yang ditemukan, dan perintah untuk yang belum ada.' },
] as const;

export function Gallery({ theme }: { theme: Theme }): React.ReactElement {
  const [shot, setShot] = useState<(typeof SHOTS)[number]['id']>('services');
  const rx = useSpring(useMotionValue(0), { stiffness: 110, damping: 18 });
  const ry = useSpring(useMotionValue(0), { stiffness: 110, damping: 18 });
  const src = (id: string) => asset(`img/${id}-${theme}.webp`);
  const current = SHOTS.find((s) => s.id === shot)!;

  // Warm the cache so switching tabs never waits on the network.
  useEffect(() => {
    SHOTS.forEach((s) => (new Image().src = src(s.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  return (
    <section className="sect" id="app">
      <div className="wrap">
        <SectionHead index="06" label="Aplikasi" title="Lihat aplikasinya.">
          <Reveal className="tabs-wrap" delay={0.3}>
            <div className="tabs" role="tablist" aria-label="Tampilan">
            {SHOTS.map((s) => (
              <button key={s.id} type="button" role="tab" aria-selected={shot === s.id} onClick={() => setShot(s.id)}>
                {s.label}
                {shot === s.id && <motion.span layoutId="tab-line" className="tab-line" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              </button>
            ))}
            </div>
          </Reveal>
        </SectionHead>
        <Reveal as="figure" className="shot" delay={0.1}>
          <motion.div
            className="shot-tilt"
            style={{ rotateX: rx, rotateY: ry, transformPerspective: 1800 }}
            onPointerMove={(e) => {
              if (e.pointerType !== 'mouse') return;
              const r = e.currentTarget.getBoundingClientRect();
              ry.set(((e.clientX - r.left) / r.width - 0.5) * 4);
              rx.set(-((e.clientY - r.top) / r.height - 0.5) * 3);
            }}
            onPointerLeave={() => {
              rx.set(0);
              ry.set(0);
            }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.img
                key={`${shot}-${theme}`}
                src={src(shot)}
                width={2240}
                height={1480}
                alt={`Tampilan ${current.label} di DEVUNRA`}
                loading="lazy"
                decoding="async"
                initial={{ opacity: 0, scale: 1.015, filter: 'blur(6px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.99 }}
                transition={{ duration: 0.45, ease: [0.2, 0.7, 0.1, 1] }}
              />
            </AnimatePresence>
          </motion.div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.figcaption key={shot} className="mono dim" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
              {current.cap}
            </motion.figcaption>
          </AnimatePresence>
        </Reveal>
      </div>
    </section>
  );
}
