import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, useInView } from 'motion/react';
import { Reveal, SectionHead } from '../components/Reveal';
import { playSound } from '../lib/sound';

/**
 * Sites on the left, the PHP servers they run on at the right. Clicking a site moves
 * it to the next version; the wire re-routes and requests keep flowing along it.
 */
const SITES = ['toko.test', 'blog.test', 'dashboard.test', 'api.test'];
const PHPS = [
  { v: '8.4', port: ':19002' },
  { v: '8.5', port: ':19001' },
  { v: '8.6', port: ':19003' },
];

interface Geometry {
  w: number;
  h: number;
  siteY: number[];
  phpY: number[];
}

export function PhpRoute(): React.ReactElement {
  const [assign, setAssign] = useState([1, 1, 0, 2]);
  const [hot, setHot] = useState(-1);
  const [bump, setBump] = useState<{ i: number; n: number }>({ i: -1, n: 0 });
  const [geo, setGeo] = useState<Geometry | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const siteRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const phpRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const pathRefs = useRef<Array<SVGPathElement | null>>([]);
  const dotRefs = useRef<Array<SVGCircleElement | null>>([]);
  const visible = useInView(boxRef, { amount: 0.05 });

  const measure = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const box = svg.getBoundingClientRect();
    if (!box.width) return setGeo(null);
    const mid = (el: Element | null) => {
      const r = el?.getBoundingClientRect();
      return r ? r.top + r.height / 2 - box.top : 0;
    };
    setGeo({ w: box.width, h: box.height, siteY: siteRefs.current.map(mid), phpY: phpRefs.current.map(mid) });
  }, []);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (boxRef.current) ro.observe(boxRef.current);
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [measure]);

  // Requests: two dots per wire, moved along the live path every frame while visible.
  useEffect(() => {
    if (!visible || !geo || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const dots = SITES.flatMap((_, i) => [0, 0.5].map((t) => ({ i, t, speed: 0.0026 + ((i * 7) % 5) * 0.0004 })));
    let frame = 0;
    const tick = () => {
      dots.forEach((d, k) => {
        d.t = (d.t + d.speed) % 1;
        const path = pathRefs.current[d.i];
        const dot = dotRefs.current[k];
        if (!path || !dot) return;
        const pt = path.getPointAtLength(d.t * path.getTotalLength());
        dot.setAttribute('cx', String(pt.x));
        dot.setAttribute('cy', String(pt.y));
        dot.setAttribute('opacity', String(Math.sin(d.t * Math.PI)));
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [visible, geo]);

  const wire = (i: number) => {
    if (!geo) return '';
    const y1 = geo.siteY[i];
    const y2 = geo.phpY[assign[i]];
    const k = geo.w * 0.45;
    return `M0 ${y1} C${k} ${y1} ${geo.w - k} ${y2} ${geo.w} ${y2}`;
  };

  const retarget = (i: number) => {
    setAssign((a) => a.map((v, n) => (n === i ? (v + 1) % PHPS.length : v)));
    setBump((b) => ({ i, n: b.n + 1 }));
    setHot(i);
    playSound('tick');
  };

  return (
    <section className="sect" id="php">
      <div className="wrap">
        <SectionHead
          index="03"
          label="PHP"
          title={
            <>
              Tiap situs,
              <br />
              versi PHP-nya sendiri.
            </>
          }
          sub="Klik situsnya untuk ganti versi."
        />
        <Reveal className="route">
          <div ref={boxRef} className="route-grid">
            <ul className="route-sites">
              {SITES.map((site, i) => (
                <li key={site}>
                  <motion.button
                    type="button"
                    ref={(el) => (siteRefs.current[i] = el)}
                    className={hot === i ? 'is-hot' : undefined}
                    onClick={() => retarget(i)}
                    onPointerEnter={() => setHot(i)}
                    onPointerLeave={() => setHot(-1)}
                    onFocus={() => setHot(i)}
                    onBlur={() => setHot(-1)}
                    animate={bump.i === i ? { x: [0, 7, 0] } : undefined}
                    key={bump.i === i ? bump.n : 0}
                    transition={{ duration: 0.4 }}
                  >
                    <span className="led led-on" />
                    {site}
                    <span className="site-php mono">php {PHPS[assign[i]].v}</span>
                  </motion.button>
                </li>
              ))}
            </ul>
            <svg ref={svgRef} className="route-svg" viewBox={geo ? `0 0 ${geo.w} ${geo.h}` : undefined} aria-hidden="true">
              {SITES.map((_, i) => (
                <motion.path
                  key={i}
                  ref={(el) => (pathRefs.current[i] = el)}
                  className={hot === i ? 'is-hot' : undefined}
                  initial={false}
                  animate={{ d: wire(i) }}
                  transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                />
              ))}
              {Array.from({ length: SITES.length * 2 }, (_, k) => (
                <circle key={k} r="3.5" ref={(el) => (dotRefs.current[k] = el)} opacity="0" />
              ))}
            </svg>
            <ul className="route-php">
              {PHPS.map((p, n) => (
                <li key={p.v} className={assign.includes(n) ? 'is-used' : undefined}>
                  <span className="php-v" ref={(el) => (phpRefs.current[n] = el)}>
                    {p.v}
                  </span>
                  <span className="php-p mono">{p.port}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
