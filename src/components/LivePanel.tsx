import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useSpring } from 'motion/react';
import { playSound } from '../lib/sound';
import type { Mood } from './Tarsier';

/**
 * A small working copy of the app's Services view. Rows start and stop with the
 * same LED states; the parent hears about every start (for the LED field ripple)
 * and about the overall mood (for the tarsiers).
 */
type Status = 'stopped' | 'starting' | 'running' | 'stopping';

const SERVICES = [
  { id: 'apache', name: 'Apache', sub: 'system binary', ver: '2.4.67', port: 18080, log: 'AH00489: resuming normal operations' },
  { id: 'php', name: 'PHP', sub: 'herd binary', ver: '8.5.8', port: 19001, log: 'fpm is running, pid 4120' },
  { id: 'mysql', name: 'MySQL', sub: 'homebrew binary', ver: '9.6.0', port: 13306, log: 'ready for connections. port: 13306' },
  { id: 'postgresql', name: 'PostgreSQL', sub: 'homebrew binary', ver: '16.15', port: 15432, log: 'database system is ready to accept connections' },
  { id: 'redis', name: 'Redis', sub: 'homebrew binary', ver: '8.4.0', port: 16379, log: 'Ready to accept connections tcp' },
] as const;

type ServiceId = (typeof SERVICES)[number]['id'];
type Row = { status: Status; startedAt: number };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function uptime(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
}

function ledClass(status: Status): string {
  return status === 'running' ? 'led led-on' : status === 'stopped' ? 'led' : 'led led-busy';
}

interface LivePanelProps {
  onMood: (mood: Mood) => void;
  onStarted: (led: HTMLElement) => void;
  /** Set by the parent so booping the tarsier can wake the stack. */
  controlRef: React.MutableRefObject<{ wake: () => void; autoStart: () => void } | null>;
}

export function LivePanel({ onMood, onStarted, controlRef }: LivePanelProps): React.ReactElement {
  const [rows, setRows] = useState<Record<ServiceId, Row>>(
    () => Object.fromEntries(SERVICES.map((s) => [s.id, { status: 'stopped', startedAt: 0 }])) as Record<ServiceId, Row>
  );
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const [now, setNow] = useState(Date.now());
  const [log, setLog] = useState({ src: 'system', text: 'Klik Start all, atau tarsiusnya.' });
  const ledRefs = useRef<Partial<Record<ServiceId, HTMLSpanElement | null>>>({});
  const touched = useRef(false);
  const logQueue = useRef<Array<[string, string]>>([]);
  const typing = useRef(false);
  const lastMood = useRef<Mood>('sleep');

  const rx = useSpring(0, { stiffness: 120, damping: 18 });
  const ry = useSpring(0, { stiffness: 120, damping: 18 });

  const set = (id: ServiceId, row: Row) => setRows((r) => ({ ...r, [id]: row }));

  const pushLog = useCallback(async (src: string, text: string) => {
    logQueue.current.push([src, text]);
    if (typing.current) return;
    typing.current = true;
    while (logQueue.current.length) {
      const [s, t] = logQueue.current.shift()!;
      for (let i = 1; i <= t.length; i++) {
        setLog({ src: s, text: t.slice(0, i) });
        await wait(logQueue.current.length ? 3 : 11);
      }
      await wait(logQueue.current.length ? 110 : 0);
    }
    typing.current = false;
  }, []);

  const start = useCallback(
    async (svc: (typeof SERVICES)[number], byHand = false) => {
      if (rowsRef.current[svc.id].status !== 'stopped') return;
      set(svc.id, { status: 'starting', startedAt: 0 });
      await wait(380 + Math.random() * 520);
      set(svc.id, { status: 'running', startedAt: Date.now() - Math.floor(Math.random() * 4000) });
      if (byHand) playSound('tick');
      const led = ledRefs.current[svc.id];
      if (led) onStarted(led);
      void pushLog(svc.id, svc.log);
    },
    [onStarted, pushLog]
  );

  const stop = useCallback(
    async (svc: (typeof SERVICES)[number], byHand = false) => {
      if (rowsRef.current[svc.id].status !== 'running') return;
      set(svc.id, { status: 'stopping', startedAt: 0 });
      await wait(260 + Math.random() * 240);
      set(svc.id, { status: 'stopped', startedAt: 0 });
      if (byHand) playSound('tick');
      void pushLog(svc.id, `${svc.name} stopped cleanly.`);
    },
    [pushLog]
  );

  const anyOn = () => Object.values(rowsRef.current).some((r) => r.status !== 'stopped');

  const startAll = useCallback(async () => {
    void pushLog('system', 'Starting all services…');
    for (const svc of SERVICES) {
      void start(svc);
      await wait(170);
    }
  }, [pushLog, start]);

  const stopAll = useCallback(async () => {
    for (const svc of [...SERVICES].reverse()) {
      void stop(svc);
      await wait(110);
    }
  }, [stop]);

  controlRef.current = {
    wake: () => {
      if (!anyOn()) {
        touched.current = true;
        void startAll();
      }
    },
    autoStart: () => {
      if (!touched.current && !anyOn()) void startAll();
    },
  };

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const list = Object.values(rows);
  const running = list.filter((r) => r.status === 'running').length;
  const busy = list.some((r) => r.status === 'starting' || r.status === 'stopping');
  const on = list.some((r) => r.status === 'running' || r.status === 'starting');
  const mood: Mood = busy ? 'busy' : running ? 'awake' : 'sleep';

  useEffect(() => {
    if (mood === lastMood.current) return;
    if (lastMood.current === 'sleep') playSound('wake');
    if (mood === 'sleep') playSound('yawn');
    lastMood.current = mood;
    onMood(mood);
  }, [mood, onMood]);

  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 6);
    rx.set(-((e.clientY - r.top) / r.height - 0.5) * 5);
  };

  return (
    <motion.div
      className="win"
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 1400 }}
      onPointerMove={onPointerMove}
      onPointerLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
    >
      <div className="win-bar">
        <span className="win-dots">
          <i />
          <i />
          <i />
        </span>
        <span className="win-title">DEVUNRA</span>
        <span className="win-status">
          <span className={busy ? 'led led-busy' : running ? 'led led-on' : 'led'} />
          {busy ? 'busy' : running ? 'running' : 'idle'}
        </span>
      </div>
      <div className="win-head">
        <div>
          <strong>Services</strong>
          <span className="mono dim">
            <b>{running}</b>/{SERVICES.length} running
          </span>
        </div>
        <button
          type="button"
          className={on ? 'pbtn' : 'pbtn pbtn-primary'}
          onClick={() => {
            touched.current = true;
            void (anyOn() ? stopAll() : startAll());
          }}
        >
          <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
            {on ? <rect x="2.5" y="2.5" width="7" height="7" rx="1" fill="currentColor" /> : <path d="M3 2v8l7-4z" fill="currentColor" />}
          </svg>
          <span>{on ? 'Stop all' : 'Start all'}</span>
        </button>
      </div>
      <div className="ptable" role="table" aria-label="Services">
        <div className="prow phead" role="row">
          <span />
          <span>Service</span>
          <span>Versi</span>
          <span>Port</span>
          <span className="hide-xs">Uptime</span>
          <span />
        </div>
        {SERVICES.map((svc) => {
          const row = rows[svc.id];
          const transitional = row.status === 'starting' || row.status === 'stopping';
          return (
            <div key={svc.id} className={transitional ? 'prow is-busy' : 'prow'} role="row">
              <span className={ledClass(row.status)} ref={(el) => (ledRefs.current[svc.id] = el)} />
              <span className="p-name">
                <b>{svc.name}</b>
                <small>{row.status === 'starting' ? 'memulai…' : row.status === 'stopping' ? 'menghentikan…' : svc.sub}</small>
              </span>
              <span className="p-mono">{svc.ver}</span>
              <span className="p-mono p-port">:{svc.port}</span>
              <span className="p-mono hide-xs">{row.status === 'running' ? uptime(now - row.startedAt) : '-'}</span>
              <button
                type="button"
                className="pbtn pbtn-sm"
                disabled={transitional}
                onClick={() => {
                  touched.current = true;
                  void (row.status === 'stopped' ? start(svc, true) : stop(svc, true));
                }}
              >
                {row.status === 'running' || row.status === 'stopping' ? 'Stop' : 'Start'}
              </button>
            </div>
          );
        })}
      </div>
      <div className="win-log mono" aria-live="polite">
        <span className="log-src">{log.src}</span>
        <span className="log-text">{log.text}</span>
      </div>
    </motion.div>
  );
}
