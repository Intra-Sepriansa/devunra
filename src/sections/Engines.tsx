import React, { useEffect, useRef, useState } from 'react';
import { useInView } from 'motion/react';
import { Reveal, SectionHead } from '../components/Reveal';

const ENGINES = [
  { name: 'PHP', ver: '8.4 · 8.5 · 8.6', src: 'herd · homebrew · scoop' },
  { name: 'MySQL', ver: '9.6', src: 'homebrew · laragon · xampp' },
  { name: 'PostgreSQL', ver: '16 · 17', src: 'homebrew · postgres.app · scoop' },
  { name: 'Redis', ver: '8.4', src: 'homebrew · memurai · scoop' },
  { name: 'Composer', ver: '2.x', src: 'herd · homebrew · scoop' },
];

/** One engine row: the LED flickers amber, goes green, and the version types in. */
function EngineRow({ name, ver, src, index }: (typeof ENGINES)[number] & { index: number }) {
  const ref = useRef<HTMLLIElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.7 });
  const [led, setLed] = useState('led');
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (!inView) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cancelled = false;
    const timers: number[] = [];
    const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(() => !cancelled && fn(), reduced ? 0 : ms));
    const base = 90 * (index % 3);
    later(base, () => setLed('led led-busy'));
    later(base + 320, () => setLed('led led-on'));
    for (let n = 1; n <= ver.length; n++) later(base + 320 + n * 28, () => setTyped(ver.slice(0, n)));
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [inView, index, ver]);

  return (
    <li ref={ref} className={led === 'led led-on' ? 'eng is-on' : 'eng'}>
      <span className={led} />
      <span className="eng-name">{name}</span>
      <span className="eng-ver mono">{typed}</span>
      <span className="eng-src mono">{src}</span>
    </li>
  );
}

export function Engines(): React.ReactElement {
  return (
    <section className="sect" id="engine">
      <div className="wrap">
        <SectionHead
          index="01"
          label="Engine"
          title={
            <>
              Engine asli,
              <br />
              bukan simulasi.
            </>
          }
          sub="Pakai yang sudah terpasang di komputermu."
        />
        <ol className="engines">
          {ENGINES.map((e, i) => (
            <EngineRow key={e.name} {...e} index={i} />
          ))}
        </ol>
        <Reveal as="p" className="eng-note mono">
          Belum terpasang? Settings › Engine kasih perintah install-nya.
        </Reveal>
      </div>
    </section>
  );
}
