import React, { useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from 'motion/react';
import { SplitTitle } from '../components/Reveal';
import { Tarsier, type Mood } from '../components/Tarsier';
import { playSound } from '../lib/sound';

/**
 * Port conflict, scrubbed by scroll: Redis listens on 16379, another program grabs
 * the port, the last two digits roll to 16380 and the alert explains what happened.
 */
const STEPS = [
  { key: 'jalan', led: 'led led-on', text: 'listening', mood: 'awake' as Mood },
  { key: 'bentrok', led: 'led led-err', text: 'port dipakai node', mood: 'alert' as Mood },
  { key: 'pindah', led: 'led led-busy', text: 'cari port kosong…', mood: 'busy' as Mood },
  { key: 'beres', led: 'led led-on', text: 'listening', mood: 'awake' as Mood },
];

function Roll({ from, to, on, delay = 0 }: { from: string; to: string; on: boolean; delay?: number }) {
  return (
    <span className="roll">
      <motion.span className="roll-in" animate={{ y: on ? '-50%' : '0%' }} transition={{ type: 'spring', stiffness: 140, damping: 16, delay }}>
        <span>{from}</span>
        <span className={on ? 'roll-new' : undefined}>{to}</span>
      </motion.span>
    </span>
  );
}

export function PortMove(): React.ReactElement {
  const ref = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const bar = useTransform(scrollYProgress, [0, 0.9], [0, 1]);
  const numberScale = useTransform(scrollYProgress, [0, 0.25, 0.5], [0.92, 1, 1]);

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    const next = p < 0.22 ? 0 : p < 0.46 ? 1 : p < 0.66 ? 2 : 3;
    if (next === step) return;
    if (next > step) playSound(next === 1 ? 'uhoh' : next === 3 ? 'wake' : 'tick');
    setStep(next);
  });

  const s = STEPS[step];
  const moved = step >= 2;

  return (
    <section ref={ref} className={`port step-${step}`} id="port">
      <div className="port-sticky">
        <div className="wrap port-in">
          <header className="sect-head">
            <span className="sect-idx mono">02 / Port</span>
            <SplitTitle text={'Port bentrok?\nPindah sendiri.'} />
          </header>
          <div className="port-stage">
            <div className="port-svc mono">
              <span className={s.led} />
              <span>redis</span>
              <span className="dim">{s.text}</span>
            </div>
            <motion.div className="port-num mono" style={{ scale: numberScale }} aria-label={moved ? 'Port 16380' : 'Port 16379'}>
              <span>163</span>
              <Roll from="7" to="8" on={moved} />
              <Roll from="9" to="0" on={moved} delay={0.06} />
            </motion.div>
            <AnimatePresence>
              {step >= 1 && (
                <motion.div
                  className="intruder mono"
                  initial={{ opacity: 0, x: 60 }}
                  animate={{ opacity: step === 3 ? 0.4 : 1, x: 0 }}
                  exit={{ opacity: 0, x: 60 }}
                  transition={{ type: 'spring', stiffness: 160, damping: 20 }}
                >
                  <span className={step === 3 ? 'led' : 'led led-err'} />
                  node · PID 812
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {step === 3 && (
                <motion.div
                  className="port-toast"
                  initial={{ opacity: 0, y: 24, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 16 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                >
                  <span className="pt-tz">
                    <Tarsier mood="awake" reach={2.2} />
                  </span>
                  <div>
                    <strong>Redis pindah ke port 16380</strong>
                    <span>Port 16379 dipakai node (PID 812), jadi DEVUNRA pindah ke port kosong terdekat.</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <span className="port-mood" aria-hidden="true">
              <Tarsier mood={s.mood} reach={2.4} />
            </span>
          </div>
          <div className="port-steps mono" aria-hidden="true">
            <motion.span className="port-bar" style={{ scaleX: bar }} />
            {STEPS.map((st, i) => (
              <span key={st.key} className={i <= step ? 'is-done' : undefined}>
                {st.key}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
