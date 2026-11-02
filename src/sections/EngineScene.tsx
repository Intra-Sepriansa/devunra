import React, { useMemo, useRef, useState } from 'react';
import { motion, useInView } from 'motion/react';
import { CoreStack, Ground, Silk, Slab, flash, useCompact, usePackets, BASE, type Packet } from '../components/Iso';
import { Reveal, SectionHead } from '../components/Reveal';
import { fromScreen, iso, route } from '../lib/iso';

/**
 * Real engines sit on the floor as small blocks,
 * wired to the DEVUNRA core. Packets travel each trace into the core, whose plates
 * pull apart to show the panel, the supervisor and the engine bus.
 */
const ENGINES = [
  // `at` is the desktop screen position, `m` the taller layout for phones.
  { name: 'Apache', silk: 'httpd', ver: '2.4', at: [-490, 40], m: [-300, 120] },
  { name: 'Nginx', silk: 'nginx', ver: '1.31', at: [490, 40], m: [300, 120] },
  { name: 'PHP', silk: 'php', ver: '8.5', at: [-450, 180], m: [-290, 290] },
  { name: 'MySQL', silk: 'mysql', ver: '9.6', at: [450, 180], m: [290, 290] },
  { name: 'PostgreSQL', silk: 'pgsql', ver: '16', at: [-310, 310], m: [-250, 455] },
  { name: 'MongoDB', silk: 'mongo', ver: '8.0', at: [310, 310], m: [250, 455] },
  { name: 'Redis', silk: 'redis', ver: '8.4', at: [-115, 385], m: [-100, 600] },
  { name: 'Memcached', silk: 'memcache', ver: '1.6', at: [115, 385], m: [100, 600] },
] as const;

const NODE = 34;
const NODE_H = 14;

export function EngineScene(): React.ReactElement {
  const compact = useCompact();
  const wrap = useRef<HTMLDivElement>(null);
  const inView = useInView(wrap, { amount: 0.25 });
  const seen = useInView(wrap, { once: true, amount: 0.25 });
  const [hot, setHot] = useState(-1);
  const [coreHover, setCoreHover] = useState(false);
  const paths = useRef<Array<SVGPathElement | null>>([]);
  const dots = useRef<Array<SVGGElement | null>>([]);
  const portEls = useRef<Array<SVGCircleElement | null>>([]);
  const ledEls = useRef<Array<SVGCircleElement | null>>([]);

  const nodes = useMemo(
    () =>
      ENGINES.map((e) => {
        const at = compact ? e.m : e.at;
        const [x, y] = fromScreen(at[0], at[1]);
        const r = route(x, y, BASE);
        const label = iso(x + NODE, y + NODE, 0);
        return { ...e, x, y, d: r.d, port: r.port, label, led: iso(x + NODE, y, NODE_H / 2) };
      }),
    [compact]
  );

  const packets = useMemo<Packet[]>(
    () =>
      nodes.flatMap((_, i) =>
        [0, 0.5].map((k) => ({ legs: () => [{ path: i }], speed: 1.25 + ((i * 3) % 4) * 0.18, offset: k * 260 + i * 37, from: i }))
      ),
    [nodes]
  );

  usePackets(packets, paths, dots, inView, (leg) => flash(portEls.current[leg.path]));

  const vb = compact ? '-400 -280 800 1010' : '-600 -280 1200 790';

  return (
    <section className="sect" id="engine">
      <div className="wrap">
        <SectionHead
          title={'Engine lokal,\nsiap dijalankan.'}
          sub="Delapan engine dalam paket lengkap Apple Silicon. Pilih paket sesuai OS dan chip di bagian unduh."
        />
        <div ref={wrap} className={compact ? 'iso-scene is-compact' : 'iso-scene'}>
          <svg viewBox={vb} role="img" aria-label="Apache, Nginx, PHP, MySQL, PostgreSQL, MongoDB, Redis, dan Memcached terhubung ke DEVUNRA">
            <Ground />
            {nodes.map((n, i) => (
              <motion.path
                key={`t${i}`}
                ref={(el) => (paths.current[i] = el)}
                d={n.d}
                className={hot === i ? 'iso-trace is-hot' : 'iso-trace'}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={seen ? { pathLength: 1, opacity: 1 } : undefined}
                transition={{ duration: 1.1, delay: 0.5 + i * 0.09, ease: [0.2, 0.7, 0.1, 1] }}
              />
            ))}
            {packets.map((p, i) => (
              <g key={`p${i}`} ref={(el) => (dots.current[i] = el)} className={hot === -1 || hot === p.from ? 'iso-packet' : 'iso-packet is-dim'} style={{ opacity: 0 }}>
                <circle r="7" className="iso-packet-glow" />
                <circle r="3" className="iso-packet-core" />
              </g>
            ))}
            <g onPointerEnter={() => setCoreHover(true)} onPointerLeave={() => setCoreHover(false)}>
              <CoreStack
                labels={['Panel', 'Supervisor', 'Engine bus']}
                open={seen}
                wide={coreHover}
                compact={compact}
                ports={nodes.map((n) => n.port)}
                portRef={(i) => (el) => (portEls.current[i] = el)}
              />
            </g>
            {nodes.map((n, i) => (
              <motion.g
                key={n.name}
                className={hot === i ? 'iso-node is-hot' : 'iso-node'}
                initial={{ opacity: 0, y: -70 }}
                animate={seen ? { opacity: 1, y: hot === i ? -8 : 0 } : undefined}
                transition={{ type: 'spring', stiffness: 170, damping: 15, delay: seen && hot === -1 ? 0.15 + i * 0.08 : 0 }}
                onPointerEnter={() => setHot(i)}
                onPointerLeave={() => setHot(-1)}
              >
                <Slab cx={n.x} cy={n.y} hw={NODE} h={NODE_H} />
                <Silk x={n.x} y={n.y} z={NODE_H} size={n.silk.length > 5 ? 10 : 12.5}>
                  {n.silk}
                </Silk>
                <circle cx={n.led[0]} cy={n.led[1]} r="3.2" className="iso-led" ref={(el) => (ledEls.current[i] = el)} />
                <text x={n.label[0]} y={n.label[1] + 26} textAnchor="middle" className="iso-name">
                  {n.name}
                </text>
                <text x={n.label[0]} y={n.label[1] + 46} textAnchor="middle" className="iso-ver">
                  {n.ver}
                </text>
              </motion.g>
            ))}
          </svg>
        </div>
        <Reveal as="p" className="scene-note mono">
          Paket lengkap Apple Silicon · Engine terpasang · Paket slim
        </Reveal>
      </div>
    </section>
  );
}
