import React, { useEffect, useId, useRef, useState } from 'react';
import { playSound } from '../lib/sound';

/**
 * The DEVUNRA tarsier, the same geometry and moods as the app (src/renderer/Tarsier.tsx):
 *   awake  - blinks, glances around
 *   busy   - eyes scan side to side
 *   alert  - pupils shrink, quick head shake
 *   sleep  - eyes shut, breathing, floating z's
 * Pupils follow the pointer; an eye click blinks (or makes a sleeping tarsier peek);
 * a body click boops; a double click hops; five quick boops make it dizzy.
 */
export type Mood = 'awake' | 'busy' | 'alert' | 'sleep';

const EYES = [
  { cx: 22.5, pupil: 23.25, glint: 21.375 },
  { cx: 41.5, pupil: 40.75, glint: 38.875 },
];
const EYE_Y = 35.375;
const EYE_R = 9.375;

type Gesture = 'blink' | 'peek' | 'boop' | 'hop' | 'dizzy' | 'stretch' | null;
const GESTURE_MS: Record<Exclude<Gesture, null>, number> = { blink: 360, peek: 1600, boop: 650, hop: 720, dizzy: 1700, stretch: 700 };

interface TarsierProps {
  mood?: Mood;
  /** How far the pupils travel toward the pointer, in SVG units. */
  reach?: number;
  className?: string;
  onBoop?: () => void;
}

export function Tarsier({ mood = 'awake', reach = 2.8, className, onBoop }: TarsierProps): React.ReactElement {
  const id = useId().replace(/:/g, '');
  const svgRef = useRef<SVGSVGElement>(null);
  const boops = useRef<number[]>([]);
  const prevMood = useRef(mood);
  const [look, setLook] = useState<{ x: number; y: number } | null>(null);
  const [gesture, setGesture] = useState<Gesture>(null);
  const eyesOpen = mood !== 'sleep' || gesture === 'peek';

  useEffect(() => {
    if (!eyesOpen) {
      setLook(null);
      return;
    }
    let frame = 0;
    let idle = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      window.clearTimeout(idle);
      // Stop staring once the pointer rests; the idle glance takes over again.
      idle = window.setTimeout(() => setLook(null), 4000);
      frame = requestAnimationFrame(() => {
        const box = svgRef.current?.getBoundingClientRect();
        if (!box || box.bottom < 0 || box.top > innerHeight) return;
        const dx = e.clientX - (box.left + box.width / 2);
        const dy = e.clientY - (box.top + box.height / 2);
        const dist = Math.hypot(dx, dy) || 1;
        const r = Math.min(dist / 160, 1) * reach;
        setLook({ x: (dx / dist) * r, y: (dy / dist) * r });
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(idle);
      window.removeEventListener('pointermove', onMove);
    };
  }, [eyesOpen, reach]);

  useEffect(() => {
    if (!gesture) return;
    const t = window.setTimeout(() => setGesture(null), GESTURE_MS[gesture]);
    return () => window.clearTimeout(t);
  }, [gesture]);

  useEffect(() => {
    if (prevMood.current === 'sleep' && mood !== 'sleep') setGesture('stretch');
    prevMood.current = mood;
  }, [mood]);

  const onEyeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setGesture(mood === 'sleep' ? 'peek' : 'blink');
    playSound(mood === 'sleep' ? 'peek' : 'blink');
  };

  const onBodyClick = (e: React.MouseEvent) => {
    if (e.detail === 2) {
      setGesture('hop');
      playSound('yay');
      return;
    }
    const now = Date.now();
    boops.current = [...boops.current.filter((t) => now - t < 2500), now];
    if (boops.current.length >= 5) {
      boops.current = [];
      setGesture('dizzy');
      playSound('dizzy');
      return;
    }
    if (gesture === 'dizzy') return;
    setGesture('boop');
    playSound('boop');
    onBoop?.();
  };

  const tilt = look && gesture !== 'dizzy' ? look.x * 2.2 : 0;
  const classes = [
    'tz',
    `tz-${mood}`,
    look && 'tz-follow',
    gesture === 'blink' && 'tz-blinking',
    gesture && gesture !== 'blink' && `tz-${gesture}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <svg ref={svgRef} className={classes} viewBox="8 10 48 43" role="img" aria-label={`Tarsius DEVUNRA, ${mood}`} onClick={onBodyClick}>
      <defs>
        {EYES.map((eye, i) => (
          <clipPath key={i} id={`${id}-eye${i}`}>
            <circle cx={eye.cx} cy={EYE_Y} r={EYE_R} />
          </clipPath>
        ))}
      </defs>
      <g className="tz-tilt" style={tilt ? { transform: `rotate(${tilt}deg)` } : undefined}>
        <g className="tz-body">
          <g className="tz-ear tz-ear-l">
            <ellipse cx="16.375" cy="19.875" rx="6.5" ry="8" transform="rotate(-26 16.375 19.875)" className="tz-fur" />
            <ellipse cx="16.875" cy="19.75" rx="3.5" ry="5" transform="rotate(-26 16.875 19.75)" className="tz-inner" />
          </g>
          <g className="tz-ear tz-ear-r">
            <ellipse cx="47.625" cy="19.875" rx="6.5" ry="8" transform="rotate(26 47.625 19.875)" className="tz-fur" />
            <ellipse cx="47.125" cy="19.75" rx="3.5" ry="5" transform="rotate(26 47.125 19.75)" className="tz-inner" />
          </g>
          <rect x="12.5" y="21.875" width="39" height="29.375" rx="14.5" className="tz-fur" />
          {EYES.map((eye, i) => (
            <g key={i} className="tz-eye" clipPath={`url(#${id}-eye${i})`} onClick={onEyeClick}>
              <circle cx={eye.cx} cy={EYE_Y} r={EYE_R} className="tz-white" />
              <g className="tz-pupils" style={look ? { transform: `translate(${look.x}px, ${look.y}px)` } : undefined}>
                <circle cx={eye.pupil} cy="36.125" r="5" className="tz-pupil" />
                <circle cx={eye.glint} cy="33.875" r="1.625" className="tz-white" />
              </g>
              <rect x={eye.cx - EYE_R} y={EYE_Y - EYE_R} width={EYE_R * 2} height={EYE_R * 2} className="tz-lid tz-fur" />
              <path d={`M${eye.cx - 5.5} ${EYE_Y + 0.5} Q${eye.cx} ${EYE_Y + 3.6} ${eye.cx + 5.5} ${EYE_Y + 0.5}`} className="tz-closed" />
            </g>
          ))}
          <path d="M30.75 46.375 L33.25 46.375 L32 48 Z" className="tz-nose" />
        </g>
      </g>
      {mood === 'sleep' && gesture !== 'peek' && (
        <g className="tz-zz" aria-hidden="true">
          <text x="50" y="22" className="tz-z">
            z
          </text>
          <text x="53" y="17" className="tz-z tz-z2">
            z
          </text>
        </g>
      )}
    </svg>
  );
}
