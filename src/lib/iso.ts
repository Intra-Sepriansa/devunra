// Isometric projection for the engine and PHP scenes. World units are pixels on a
// ground plane (x runs down-right on screen, y runs down-left, z is height).
export const COS = Math.cos(Math.PI / 6);
export const SIN = 0.5;

export type Pt = [number, number];

export function iso(x: number, y: number, z = 0): Pt {
  return [(x - y) * COS, (x + y) * SIN - z];
}

/** Ground point under a screen position (z = 0). */
export function fromScreen(sx: number, sy: number): Pt {
  return [(sx / COS + sy / SIN) / 2, (sy / SIN - sx / COS) / 2];
}

export const pts = (list: Pt[]): string => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

/** The three visible faces of a box centred on (cx, cy), standing on z0. */
export function slab(cx: number, cy: number, hw: number, hd: number, h: number, z0 = 0) {
  const z1 = z0 + h;
  const A1 = iso(cx - hw, cy - hd, z1);
  const B1 = iso(cx + hw, cy - hd, z1);
  const C1 = iso(cx + hw, cy + hd, z1);
  const D1 = iso(cx - hw, cy + hd, z1);
  const B0 = iso(cx + hw, cy - hd, z0);
  const C0 = iso(cx + hw, cy + hd, z0);
  const D0 = iso(cx - hw, cy + hd, z0);
  return {
    top: pts([A1, B1, C1, D1]),
    left: pts([D1, C1, C0, D0]),
    right: pts([C1, B1, B0, C0]),
    leftVertex: D1,
    bottomVertex: C0,
    topCenter: iso(cx, cy, z1),
  };
}

/** SVG matrix that lays text flat on the ground plane at (x, y, z), reading along +x. */
export function flat(x: number, y: number, z = 0): string {
  const [sx, sy] = iso(x, y, z);
  return `matrix(${COS},${SIN},${-COS},${SIN},${sx.toFixed(1)},${sy.toFixed(1)})`;
}

/**
 * A trace from a node to one of the two front edges of the central base (the ones
 * the viewer can see), routed along the world axes with one rounded bend like a PCB
 * track. Nodes left of centre enter the front-left edge, the rest the front-right.
 * Returns the projected SVG path and the port where it meets the base.
 */
export function route(nx: number, ny: number, base: number, radius = 26): { d: string; port: Pt } {
  const clamp = (v: number) => Math.max(-base * 0.7, Math.min(base * 0.7, v));
  const left = nx - ny < 0;
  const corner: Pt = left ? [clamp(nx * 0.45), ny] : [nx, clamp(ny * 0.45)];
  const end: Pt = left ? [corner[0], base] : [base, corner[1]];
  const toward = (from: Pt, to: Pt, dist: number): Pt => {
    const len = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1;
    const k = Math.min(dist, len / 2) / len;
    return [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k];
  };
  const before = toward(corner, [nx, ny], radius);
  const after = toward(corner, end, radius);
  const P = (p: Pt) => iso(p[0], p[1]).map((n) => n.toFixed(1)).join(' ');
  return {
    d: `M${P([nx, ny])} L${P(before)} Q${P(corner)} ${P(after)} L${P(end)}`,
    port: iso(end[0], end[1]),
  };
}
