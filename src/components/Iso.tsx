import React, { useEffect, useId, useRef, useState } from 'react';
import { motion, useSpring, useTransform, type MotionValue } from 'motion/react';
import { flat, iso, slab, type Pt } from '../lib/iso';
import { Tarsier } from './Tarsier';

/* ---------- primitives ---------- */

export function Slab({
  cx = 0,
  cy = 0,
  hw,
  hd = hw,
  h,
  z0 = 0,
  className,
}: {
  cx?: number;
  cy?: number;
  hw: number;
  hd?: number;
  h: number;
  z0?: number;
  className?: string;
}): React.ReactElement {
  const f = slab(cx, cy, hw, hd, h, z0);
  return (
    <g className={className ? `iso-slab ${className}` : 'iso-slab'}>
      <polygon className="iso-left" points={f.left} />
      <polygon className="iso-right" points={f.right} />
      <polygon className="iso-top" points={f.top} />
    </g>
  );
}

/** Text printed flat on a top face, like silkscreen on a board. */
export function Silk({ x, y, z, children, size = 13, className }: { x: number; y: number; z: number; children: React.ReactNode; size?: number; className?: string }) {
  return (
    <text className={className ? `iso-silk ${className}` : 'iso-silk'} transform={flat(x, y, z)} fontSize={size} textAnchor="middle" dominantBaseline="central">
      {children}
    </text>
  );
}

/** Faint isometric floor grid that fades out toward the edges. */
export function Ground({ extent = 640, step = 44 }: { extent?: number; step?: number }) {
  const id = useId().replace(/:/g, '');
  const lines: string[] = [];
  for (let k = -extent; k <= extent; k += step) {
    const a = iso(k, -extent);
    const b = iso(k, extent);
    const c = iso(-extent, k);
    const d = iso(extent, k);
    lines.push(`M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`);
    lines.push(`M${c[0].toFixed(1)} ${c[1].toFixed(1)}L${d[0].toFixed(1)} ${d[1].toFixed(1)}`);
  }
  return (
    <g aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-fade`}>
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="0.75" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id={`${id}-mask`}>
          <ellipse cx="0" cy="40" rx={extent * 0.95} ry={extent * 0.5} fill={`url(#${id}-fade)`} />
        </mask>
      </defs>
      <path className="iso-grid" d={lines.join('')} mask={`url(#${id}-mask)`} />
    </g>
  );
}

/* ---------- the DEVUNRA core in the middle ---------- */

export const BASE = 130;
const MID = 94;
const TOP = 64;
const BASE_H = 18;
const MID_H = 14;
const TOP_H = 12;

function ringPoints(half: number, z: number, count: number): Pt[] {
  const out: Pt[] = [];
  const per = count / 4;
  for (let i = 0; i < count; i++) {
    const side = Math.floor(i / per);
    const t = (i % per) / per;
    const a = -half + 2 * half * t;
    const [x, y] = side === 0 ? [a, -half] : side === 1 ? [half, a] : side === 2 ? [-a, half] : [-half, -a];
    out.push(iso(x, y, z));
  }
  return out;
}

function LayerLabel({ text, at, compact }: { text: string; at: Pt; compact: boolean }) {
  if (compact) return null;
  const x = -560;
  const w = 128;
  return (
    <g className="iso-label">
      <path d={`M${x + w} ${at[1]} L${at[0] - 6} ${at[1]}`} className="iso-leader" />
      <circle cx={at[0] - 4} cy={at[1]} r="2.6" className="iso-leader-dot" />
      <rect x={x} y={at[1] - 16} width={w} height={32} rx="4" className="iso-pill" />
      <text x={x + w / 2} y={at[1] + 1} textAnchor="middle" dominantBaseline="central" className="iso-pill-text">
        {text}
      </text>
    </g>
  );
}

/**
 * Three stacked plates (engine bus, supervisor, panel) that pull apart when the scene
 * is in view, with an LED chase on the supervisor and the tarsier sitting on top.
 */
export function CoreStack({
  labels,
  open,
  wide,
  compact,
  ports,
  portRef,
  mood = 'awake',
}: {
  labels: [string, string, string];
  open: boolean;
  wide: boolean;
  compact: boolean;
  ports: Pt[];
  portRef: (i: number) => (el: SVGCircleElement | null) => void;
  mood?: 'awake' | 'busy' | 'alert' | 'sleep';
}) {
  const gap = useSpring(0, { stiffness: 90, damping: 14 });
  useEffect(() => gap.set(open ? (wide ? 50 : 34) : 0), [open, wide, gap]);
  const ring = ringPoints(MID - 12, BASE_H + MID_H, 28);
  const pulse = iso(0, 0, 0);

  return (
    <g className="iso-core">
      {/* pulse rings on the floor */}
      {[0, 1].map((k) => (
        <motion.ellipse
          key={k}
          className="iso-pulse"
          cx={pulse[0]}
          cy={pulse[1]}
          initial={{ rx: BASE * 1.2, ry: BASE * 0.7, opacity: 0 }}
          animate={open ? { rx: [BASE * 1.25, BASE * 2.6], ry: [BASE * 0.72, BASE * 1.5], opacity: [0.55, 0] } : { opacity: 0 }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeOut', delay: k * 1.6 }}
        />
      ))}
      <Layer z={gap} k={0}>
        <Slab hw={BASE} h={BASE_H} className="iso-base" />
        <polygon points={slab(0, 0, BASE - 16, BASE - 16, 0, BASE_H).top} className="iso-inset" />
        <Silk x={0} y={BASE - 9} z={BASE_H} size={8.5} className="iso-silk-dim">
          DEVUNRA · ENGINE BUS
        </Silk>
        {ports.map((p, i) => (
          <g key={i}>
            <path d={`M${p[0]} ${p[1]} L${p[0]} ${p[1] - BASE_H + 3}`} className="iso-port-riser" />
            <circle cx={p[0]} cy={p[1]} r="4.2" className="iso-port" />
            <circle cx={p[0]} cy={p[1]} r="4.2" className="iso-port-flash" ref={portRef(i)} />
          </g>
        ))}
        <LayerLabel text={labels[2]} at={slab(0, 0, BASE, BASE, BASE_H).leftVertex} compact={compact} />
      </Layer>
      <Layer z={gap} k={1}>
        <Slab hw={MID} h={MID_H} z0={BASE_H} className="iso-mid" />
        {ring.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.4" className="iso-chase" style={{ animationDelay: `${(i * 2.2) / ring.length}s` }} />
        ))}
        <LayerLabel text={labels[1]} at={slab(0, 0, MID, MID, MID_H, BASE_H).leftVertex} compact={compact} />
      </Layer>
      <Layer z={gap} k={2}>
        <Slab hw={TOP} h={TOP_H} z0={BASE_H + MID_H} className="iso-top-plate" />
        <Silk x={0} y={TOP - 14} z={BASE_H + MID_H + TOP_H} size={9}>
          DEVUNRA
        </Silk>
        <g transform={`translate(${-48} ${-(BASE_H + MID_H + TOP_H) - 74})`}>
          <Tarsier mood={mood} reach={2.6} nested width={96} height={86} />
        </g>
        <LayerLabel text={labels[0]} at={slab(0, 0, TOP, TOP, TOP_H, BASE_H + MID_H).leftVertex} compact={compact} />
      </Layer>
    </g>
  );
}

function Layer({ z, k, children }: { z: MotionValue<number>; k: number; children: React.ReactNode }) {
  const y = useTransform(z, (v) => -v * k);
  return <motion.g style={{ y }}>{children}</motion.g>;
}

/* ---------- packets ---------- */

export interface Leg {
  path: number;
  reverse?: boolean;
}

export interface Packet {
  /** Where this packet travels; read again at the start of every trip. */
  legs: () => Leg[];
  speed: number;
  offset: number;
  /** Index used for highlighting (the node it came from). */
  from: number;
}

/**
 * Moves packet dots along the given paths every frame while `running`. `onArrive`
 * fires at the end of each leg (to flash a port or a node).
 */
export function usePackets(
  packets: Packet[],
  paths: React.MutableRefObject<Array<SVGPathElement | null>>,
  dots: React.MutableRefObject<Array<SVGGElement | null>>,
  running: boolean,
  onArrive: (leg: Leg, packet: Packet, last: boolean) => void
) {
  const state = useRef(packets.map((p) => ({ leg: 0, dist: p.offset, legs: p.legs() })));
  const arrive = useRef(onArrive);
  arrive.current = onArrive;

  useEffect(() => {
    if (!running || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const tick = () => {
      packets.forEach((p, i) => {
        const s = state.current[i];
        const dot = dots.current[i];
        let leg = s.legs[s.leg];
        let path = leg && paths.current[leg.path];
        if (!leg || !path || !dot) return;
        let len = path.getTotalLength();
        s.dist += p.speed;
        while (s.dist >= len) {
          s.dist -= len;
          const last = s.leg === s.legs.length - 1;
          arrive.current(leg, p, last);
          s.leg = last ? 0 : s.leg + 1;
          if (last) {
            s.legs = p.legs();
            s.dist = 0;
          }
          leg = s.legs[s.leg];
          path = paths.current[leg.path];
          if (!path) return;
          len = path.getTotalLength();
        }
        const at = path.getPointAtLength(leg.reverse ? len - s.dist : s.dist);
        const fadeIn = s.leg === 0 ? Math.min(1, s.dist / 24) : 1;
        const fadeOut = s.leg === s.legs.length - 1 ? Math.min(1, (len - s.dist) / 24) : 1;
        dot.setAttribute('transform', `translate(${at.x.toFixed(1)} ${at.y.toFixed(1)})`);
        dot.style.opacity = String(Math.min(fadeIn, fadeOut));
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, packets, paths, dots]);
}

/** Short pulse on an SVG circle (port or LED), restarted on every call. */
export function flash(el: SVGElement | null | undefined) {
  if (!el) return;
  el.classList.remove('is-flash');
  void (el as SVGGraphicsElement).getBBox?.();
  el.classList.add('is-flash');
}

export function useCompact(query = '(max-width: 760px)'): boolean {
  const [compact, setCompact] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const mq = matchMedia(query);
    const on = () => setCompact(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return compact;
}
