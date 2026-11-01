import React, { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView } from 'motion/react';
import { CoreStack, Ground, Silk, Slab, flash, useCompact, usePackets, BASE, type Packet } from '../components/Iso';
import { SectionHead } from '../components/Reveal';
import { fromScreen, iso, route } from '../lib/iso';
import { playSound } from '../lib/sound';

/**
 * 03 PHP: sites on the left send requests into DEVUNRA's router, which forwards each
 * one to the PHP version that site is pinned to on the right. Click a site to move it
 * to the next version; its requests take the new route straight away.
 */
const SITES = [
  // `at` is the desktop screen position, `m` the taller layout for phones.
  { host: 'toko.test', silk: 'toko', at: [-530, 90], m: [-300, 110] },
  { host: 'blog.test', silk: 'blog', at: [-470, 210], m: [-270, 260] },
  { host: 'dashboard.test', silk: 'dash', at: [-340, 310], m: [-180, 400] },
  { host: 'api.test', silk: 'api', at: [-150, 360], m: [-50, 520] },
] as const;
const PHPS = [
  { v: '8.4', listen: ':19002', at: [510, 70], m: [300, 110] },
  { v: '8.5', listen: ':19001', at: [450, 200], m: [270, 260] },
  { v: '8.6', listen: ':19003', at: [270, 310], m: [180, 400] },
] as const;

const NODE = 34;
const NODE_H = 14;

function place(at: readonly [number, number]) {
  const [x, y] = fromScreen(at[0], at[1]);
  const r = route(x, y, BASE);
  return { x, y, d: r.d, port: r.port, label: iso(x + NODE, y + NODE, 0), led: iso(x + NODE, y, NODE_H / 2) };
}

export function PhpScene(): React.ReactElement {
  const compact = useCompact();
  const wrap = useRef<HTMLDivElement>(null);
  const inView = useInView(wrap, { amount: 0.25 });
  const seen = useInView(wrap, { once: true, amount: 0.25 });
  const [assign, setAssign] = useState([1, 1, 0, 2]);
  const assignRef = useRef(assign);
  assignRef.current = assign;
  const [hot, setHot] = useState(-1);
  const paths = useRef<Array<SVGPathElement | null>>([]);
  const dots = useRef<Array<SVGGElement | null>>([]);
  const portEls = useRef<Array<SVGCircleElement | null>>([]);
  const phpLeds = useRef<Array<SVGCircleElement | null>>([]);

  const sites = useMemo(() => SITES.map((s) => ({ ...s, ...place(compact ? s.m : s.at) })), [compact]);
  const phps = useMemo(() => PHPS.map((p) => ({ ...p, ...place(compact ? p.m : p.at) })), [compact]);
  // Paths 0..3 are site traces, 4..6 are PHP traces (drawn node to port, walked in reverse).
  const packets = useMemo<Packet[]>(
    () =>
      SITES.flatMap((_, i) =>
        [0, 0.5].map((k) => ({
          legs: () => [{ path: i }, { path: SITES.length + assignRef.current[i], reverse: true }],
          speed: 1.5 + (i % 3) * 0.2,
          offset: k * 300 + i * 53,
          from: i,
        }))
      ),
    []
  );

  usePackets(packets, paths, dots, inView, (leg, _p, last) => {
    if (last) flash(phpLeds.current[leg.path - SITES.length]);
    else flash(portEls.current[leg.path]);
  });

  const cycle = (i: number) => {
    setAssign((a) => a.map((v, n) => (n === i ? (v + 1) % PHPS.length : v)));
    setHot(i);
    playSound('tick');
  };

  const used = new Set(assign);
  const hotPhp = hot >= 0 ? assign[hot] : -1;
  const vb = compact ? '-400 -280 800 900' : '-620 -280 1240 740';

  return (
    <section className="sect" id="php">
      <div className="wrap">
        <SectionHead
          title={'Tiap situs,\nversi PHP-nya sendiri.'}
          sub="Klik situsnya untuk ganti versi."
        />
        <div ref={wrap} className={compact ? 'iso-scene is-compact' : 'iso-scene'}>
          <svg viewBox={vb} role="img" aria-label="Situs diarahkan DEVUNRA ke versi PHP masing-masing">
            <Ground />
            {[...sites, ...phps].map((n, i) => {
              const isSite = i < SITES.length;
              const isHot = isSite ? hot === i : hotPhp === i - SITES.length;
              const idle = !isSite && !used.has(i - SITES.length);
              return (
                <motion.path
                  key={`t${i}`}
                  ref={(el) => (paths.current[i] = el)}
                  d={n.d}
                  className={`iso-trace${isHot ? ' is-hot' : ''}${idle ? ' is-idle' : ''}`}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={seen ? { pathLength: 1, opacity: 1 } : undefined}
                  transition={{ duration: 1.1, delay: 0.5 + i * 0.07, ease: [0.2, 0.7, 0.1, 1] }}
                />
              );
            })}
            {packets.map((p, i) => (
              <g key={`p${i}`} ref={(el) => (dots.current[i] = el)} className={hot === -1 || hot === p.from ? 'iso-packet' : 'iso-packet is-dim'} style={{ opacity: 0 }}>
                <circle r="7" className="iso-packet-glow" />
                <circle r="3" className="iso-packet-core" />
              </g>
            ))}
            <CoreStack
              labels={['Web server', 'Router', 'PHP pool']}
              open={seen}
              wide={hot !== -1}
              compact={compact}
              ports={[...sites, ...phps].map((n) => n.port)}
              portRef={(i) => (el) => (portEls.current[i] = el)}
              mood={hot !== -1 ? 'busy' : 'awake'}
            />
            {sites.map((s, i) => (
              <motion.g
                key={s.host}
                className={hot === i ? 'iso-node is-site is-hot' : 'iso-node is-site'}
                role="button"
                tabIndex={0}
                aria-label={`${s.host}, PHP ${PHPS[assign[i]].v}. Klik untuk ganti versi.`}
                initial={{ opacity: 0, x: -60 }}
                animate={seen ? { opacity: 1, x: 0, y: hot === i ? -8 : 0 } : undefined}
                transition={{ type: 'spring', stiffness: 170, damping: 15 }}
                onClick={() => cycle(i)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), cycle(i))}
                onPointerEnter={() => setHot(i)}
                onPointerLeave={() => setHot(-1)}
                onFocus={() => setHot(i)}
                onBlur={() => setHot(-1)}
              >
                <Slab cx={s.x} cy={s.y} hw={NODE} h={NODE_H} />
                <Silk x={s.x} y={s.y} z={NODE_H} size={12.5}>
                  {s.silk}
                </Silk>
                <circle cx={s.led[0]} cy={s.led[1]} r="3.2" className="iso-led" />
                <text x={s.label[0]} y={s.label[1] + 26} textAnchor="middle" className="iso-name">
                  {s.host}
                </text>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.text
                    key={assign[i]}
                    x={s.label[0]}
                    y={s.label[1] + 46}
                    textAnchor="middle"
                    className="iso-ver is-accent"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                  >
                    php {PHPS[assign[i]].v}
                  </motion.text>
                </AnimatePresence>
              </motion.g>
            ))}
            {phps.map((p, n) => (
              <motion.g
                key={p.v}
                className={`iso-node is-php${hotPhp === n ? ' is-hot' : ''}${used.has(n) ? '' : ' is-idle'}`}
                initial={{ opacity: 0, x: 60 }}
                animate={seen ? { opacity: 1, x: 0, y: hotPhp === n ? -8 : 0 } : undefined}
                transition={{ type: 'spring', stiffness: 170, damping: 15 }}
              >
                <Slab cx={p.x} cy={p.y} hw={NODE + 4} h={NODE_H + 4} />
                <Silk x={p.x} y={p.y} z={NODE_H + 4} size={17} className="iso-silk-big">
                  {p.v}
                </Silk>
                <circle cx={p.led[0] + 3} cy={p.led[1] - 2} r="3.2" className="iso-led" ref={(el) => (phpLeds.current[n] = el)} />
                <text x={p.label[0] + 3} y={p.label[1] + 28} textAnchor="middle" className="iso-name">
                  PHP {p.v}
                </text>
                <text x={p.label[0] + 3} y={p.label[1] + 48} textAnchor="middle" className="iso-ver">
                  {used.has(n) ? `127.0.0.1${p.listen}` : 'tidak dipakai'}
                </text>
              </motion.g>
            ))}
          </svg>
        </div>
      </div>
    </section>
  );
}
