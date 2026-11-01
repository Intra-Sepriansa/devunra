import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Reveal, SectionHead } from '../components/Reveal';
import { Tarsier } from '../components/Tarsier';
import { RELEASES, REPO, type Os } from '../lib/env';

const ROWS = [
  { os: 'mac' as const, name: 'macOS', meta: 'Apple Silicon · .dmg · 105 MB', actions: [{ label: 'Unduh .dmg', primary: true }] },
  {
    os: 'win' as const,
    name: 'Windows',
    meta: 'x64 · installer .exe · 83 MB',
    actions: [
      { label: 'Unduh .exe', primary: true },
      { label: 'Portable .zip', primary: false },
    ],
  },
];

export function Download({ os }: { os: Os }): React.ReactElement {
  const [hover, setHover] = useState<string | null>(null);
  const rows = os === 'win' ? [...ROWS].reverse() : ROWS;
  return (
    <section className="sect" id="unduh">
      <div className="wrap">
        <SectionHead index="06" label="Unduh" title="Unduh DEVUNRA." />
        <Reveal className="dl" delay={0.08}>
          {rows.map((row) => (
            <div
              key={row.os}
              className={row.os === os ? 'dl-row is-you' : 'dl-row'}
              onPointerEnter={() => setHover(row.os)}
              onPointerLeave={() => setHover(null)}
            >
              <span className="dl-os">
                {row.name}
                {row.os === os && <span className="dl-you mono">kamu</span>}
              </span>
              <span className="dl-meta mono">{row.meta}</span>
              <span className="dl-actions">
                {row.actions.map((a) => (
                  <motion.a
                    key={a.label}
                    className={a.primary ? 'btn btn-primary' : 'btn btn-ghost'}
                    href={RELEASES}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {a.label}
                  </motion.a>
                ))}
              </span>
              <motion.span
                className="dl-peek"
                aria-hidden="true"
                initial={false}
                animate={{ y: hover === row.os ? '0%' : '100%', opacity: hover === row.os ? 1 : 0 }}
                transition={{ type: 'spring', stiffness: 220, damping: 20 }}
              >
                <Tarsier mood="awake" reach={2.4} />
              </motion.span>
            </div>
          ))}
        </Reveal>
        <Reveal as="p" className="dl-note mono" delay={0.12}>
          Semua rilis ada di{' '}
          <a href={`${REPO}/releases`} target="_blank" rel="noopener noreferrer">
            GitHub Releases
          </a>
          .
        </Reveal>
      </div>
    </section>
  );
}
