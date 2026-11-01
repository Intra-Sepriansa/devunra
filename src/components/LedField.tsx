import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

/**
 * A field of tiny LEDs behind the hero. They glow around the pointer, and a ring
 * of light travels out from wherever a service comes up in the live panel.
 * Drawn on a canvas and only animated while something is happening.
 */
export interface LedFieldHandle {
  /** Sends a ring of light out from a viewport point. */
  ripple(clientX: number, clientY: number, tone?: 'ok' | 'accent'): void;
}

interface Ripple {
  x: number;
  y: number;
  t0: number;
  tone: 'ok' | 'accent';
}

const GAP = 24;
const POINTER_R = 170;
const RING_SPEED = 0.55; // px per ms
const RING_WIDTH = 70;
const RING_LIFE = 1700;

function parseColor(value: string): [number, number, number] {
  const hex = value.trim().replace('#', '');
  const n = parseInt(hex.length === 3 ? hex.replace(/./g, '$&$&') : hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const LedField = forwardRef<LedFieldHandle>(function LedField(_props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const api = useRef<LedFieldHandle>({ ripple: () => undefined });
  useImperativeHandle(ref, () => ({ ripple: (x, y, tone) => api.current.ripple(x, y, tone) }), []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let frame = 0;
    let pointer: { x: number; y: number } | null = null;
    let pointerGlow = 0;
    const ripples: Ripple[] = [];
    const colors = { off: [0, 0, 0] as number[], ok: [0, 0, 0] as number[], accent: [0, 0, 0] as number[] };

    const readColors = () => {
      const css = getComputedStyle(document.documentElement);
      colors.off = parseColor(css.getPropertyValue('--led-off'));
      colors.ok = parseColor(css.getPropertyValue('--ok'));
      colors.accent = parseColor(css.getPropertyValue('--accent'));
    };

    const resize = () => {
      const box = canvas.getBoundingClientRect();
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = box.width;
      h = box.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(performance.now());
    };

    function draw(now: number): boolean {
      ctx.clearRect(0, 0, w, h);
      let busy = false;
      for (let i = ripples.length - 1; i >= 0; i--) if (now - ripples[i].t0 > RING_LIFE) ripples.splice(i, 1);
      if (ripples.length) busy = true;
      const target = pointer ? 1 : 0;
      pointerGlow += (target - pointerGlow) * 0.12;
      if (Math.abs(target - pointerGlow) > 0.01) busy = true;

      const offset = (GAP / 2) % GAP;
      for (let y = offset; y < h; y += GAP) {
        for (let x = offset; x < w; x += GAP) {
          let glow = 0;
          let tone = colors.accent;
          if (pointer && pointerGlow > 0.01) {
            const d = Math.hypot(x - pointer.x, y - pointer.y);
            if (d < POINTER_R) glow = Math.pow(1 - d / POINTER_R, 2) * pointerGlow;
          }
          for (const r of ripples) {
            const age = now - r.t0;
            const radius = age * RING_SPEED;
            const d = Math.abs(Math.hypot(x - r.x, y - r.y) - radius);
            if (d < RING_WIDTH) {
              const g = (1 - d / RING_WIDTH) * (1 - age / RING_LIFE);
              if (g > glow) {
                glow = g;
                tone = r.tone === 'ok' ? colors.ok : colors.accent;
              }
            }
          }
          const c = glow > 0 ? colors.off.map((o, k) => Math.round(o + (tone[k] - o) * Math.min(glow * 1.4, 1))) : colors.off;
          ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
          ctx.globalAlpha = 0.55 + glow * 0.45;
          ctx.beginPath();
          ctx.arc(x, y, 1.1 + glow * 1.9, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      return busy;
    }

    const loop = (now: number) => {
      frame = draw(now) ? requestAnimationFrame(loop) : 0;
    };
    const kick = () => {
      if (!frame && !reduced) frame = requestAnimationFrame(loop);
    };

    api.current.ripple = (clientX, clientY, tone = 'ok') => {
      if (reduced) return;
      const box = canvas.getBoundingClientRect();
      ripples.push({ x: clientX - box.left, y: clientY - box.top, t0: performance.now(), tone });
      kick();
    };

    const onMove = (e: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      const x = e.clientX - box.left;
      const y = e.clientY - box.top;
      pointer = x >= 0 && y >= 0 && x <= w && y <= h ? { x, y } : null;
      kick();
    };

    readColors();
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const mo = new MutationObserver(() => {
      readColors();
      draw(performance.now());
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if (matchMedia('(pointer: fine)').matches) window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="ledfield" aria-hidden="true" />;
});
