import React, { useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { Tarsier } from '../components/Tarsier';
import { REPO } from '../lib/env';

/** A giant wordmark that rises in as the page ends, with the tarsier asleep on top. */
export function Footer(): React.ReactElement {
  const ref = useRef<HTMLElement>(null);
  const [awake, setAwake] = useState(false);
  const nap = useRef(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] });
  const y = useTransform(scrollYProgress, [0, 1], ['35%', '12%']);
  const letterSpacing = useTransform(scrollYProgress, [0, 1], ['0.14em', '0.02em']);

  return (
    <footer ref={ref} className="foot">
      <div className="wrap foot-top">
        <span className="foot-note mono">Dijaga tarsius dari Sulawesi.</span>
        <nav className="foot-links mono" aria-label="Tautan">
          <a href={REPO} target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <a href={`${REPO}/releases`} target="_blank" rel="noopener noreferrer">
            Releases
          </a>
          <a href="#top">Ke atas</a>
        </nav>
      </div>
      <div
        className="foot-word"
        onPointerEnter={() => {
          clearTimeout(nap.current);
          setAwake(true);
        }}
        onPointerLeave={() => {
          nap.current = window.setTimeout(() => setAwake(false), 1800);
        }}
      >
        <motion.span className="word" style={{ y, letterSpacing }} aria-hidden="true">
          <span className="foot-tz">
            <Tarsier mood={awake ? 'awake' : 'sleep'} reach={2.6} />
          </span>
          DEVUNRA
        </motion.span>
      </div>
      <div className="wrap foot-bottom mono dim">
        <span>© {new Date().getFullYear()} DEVUNRA</span>
        <span>v1.0.0</span>
      </div>
    </footer>
  );
}
