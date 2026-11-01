import React, { useCallback, useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, type Variants } from 'motion/react';
import { LedField, type LedFieldHandle } from '../components/LedField';
import { LivePanel } from '../components/LivePanel';
import { Tarsier, type Mood } from '../components/Tarsier';
import { VERSION, type Os } from '../lib/env';

const ease = [0.2, 0.7, 0.1, 1] as const;

const lines: Variants = {
  hidden: { y: '108%' },
  show: (i: number) => ({ y: '0%', transition: { duration: 1.1, ease, delay: 0.1 + i * 0.08 } }),
};
const fade: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.9, ease, delay: 0.35 + i * 0.09 } }),
};

function MagnetLink({ href, children, className }: { href: string; children: React.ReactNode; className: string }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 14 });
  const sy = useSpring(y, { stiffness: 220, damping: 14 });
  return (
    <motion.a
      href={href}
      className={className}
      style={{ x: sx, y: sy }}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse') return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * 0.22);
        y.set((e.clientY - r.top - r.height / 2) * 0.35);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
      whileTap={{ scale: 0.97 }}
    >
      {children}
    </motion.a>
  );
}

export function Hero({ mood, onMood, os }: { mood: Mood; onMood: (m: Mood) => void; os: Os }): React.ReactElement {
  const field = useRef<LedFieldHandle>(null);
  const control = useRef<{ wake: () => void; autoStart: () => void } | null>(null);

  const onStarted = useCallback((led: HTMLElement) => {
    const r = led.getBoundingClientRect();
    field.current?.ripple(r.left + r.width / 2, r.top + r.height / 2, 'ok');
  }, []);

  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(() => control.current?.autoStart(), reduced ? 0 : 1800);
    return () => clearTimeout(t);
  }, []);

  const cta = os === 'win' ? 'Unduh untuk Windows' : os === 'mac' ? 'Unduh untuk macOS' : 'Unduh';

  return (
    <section className="hero">
      <LedField ref={field} />
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <motion.p className="kicker" variants={fade} initial="hidden" animate="show" custom={0}>
            <span className="led led-on pulse" />
            Local dev supervisor · v{VERSION}
          </motion.p>
          <h1 className="hero-h" aria-label="Satu panel. Semua server lokal.">
            {['Satu panel.', 'Semua server', 'lokal'].map((text, i) => (
              <span className="line" key={text} aria-hidden="true">
                <motion.span variants={lines} initial="hidden" animate="show" custom={i}>
                  {text}
                  {i === 2 && <i className="dot">.</i>}
                </motion.span>
              </span>
            ))}
          </h1>
          <motion.p className="hero-sub" variants={fade} initial="hidden" animate="show" custom={1}>
            Apache, PHP, MySQL, PostgreSQL dan Redis asli. HTTPS dan domain .test lokal. macOS dan Windows.
          </motion.p>
          <motion.div className="cta" variants={fade} initial="hidden" animate="show" custom={2}>
            <MagnetLink href="#unduh" className="btn btn-primary">
              {cta}
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                <path d="M8 2v9m0 0 3.5-3.5M8 11 4.5 7.5M2.5 14h11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </MagnetLink>
            <a className="btn btn-ghost" href="#app">
              Lihat aplikasinya
            </a>
          </motion.div>
          <motion.dl className="hero-specs" variants={fade} initial="hidden" animate="show" custom={3}>
            <div>
              <dt>Engine</dt>
              <dd>6 asli</dd>
            </div>
            <div>
              <dt>PHP</dt>
              <dd>8.4–8.6</dd>
            </div>
            <div>
              <dt>OS</dt>
              <dd>macOS · Windows</dd>
            </div>
          </motion.dl>
        </div>

        <motion.div className="hero-stage" variants={fade} initial="hidden" animate="show" custom={4}>
          <div className={mood === 'sleep' ? 'peek is-sleep' : 'peek'}>
            <motion.span
              className="peek-tz"
              animate={{ y: mood === 'sleep' ? 14 : 0 }}
              transition={{ type: 'spring', stiffness: 160, damping: 14 }}
            >
              <Tarsier mood={mood} reach={3.2} onBoop={() => control.current?.wake()} />
            </motion.span>
            <span className="paw paw-l" />
            <span className="paw paw-r" />
          </div>
          <LivePanel onMood={onMood} onStarted={onStarted} controlRef={control} />
        </motion.div>
      </div>
      <motion.a
        className="scroll-cue mono"
        href="#engine"
        aria-label="Gulir ke bawah"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
      >
        <span />
        gulir
      </motion.a>
    </section>
  );
}
