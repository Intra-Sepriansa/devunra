import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView } from 'motion/react';
import { Reveal, SectionHead } from '../components/Reveal';
import { usePrefersReducedMotion } from '../lib/env';

/**
 * Follows one request the way DEVUNRA serves it for real: hosts file, TLS with the
 * local root CA, the Apache vhost, .htaccess, PHP-FPM for that site, the response.
 */

type HopId = 'dns' | 'tls' | 'vhost' | 'rule' | 'php' | 'res';
type HopState = 'idle' | 'busy' | 'ok' | 'err' | 'skip';
interface Hop {
  id: HopId;
  detail: string;
  end: 'ok' | 'err' | 'skip';
}
interface Trace {
  hops: Hop[];
  status: string;
  tone: 'ok' | 'err';
  body: string[];
}

const LABEL: Record<HopId, string> = {
  dns: 'hosts',
  tls: 'TLS',
  vhost: 'Apache',
  rule: '.htaccess',
  php: 'PHP-FPM',
  res: 'Respons',
};
const ORDER: HopId[] = ['dns', 'tls', 'vhost', 'rule', 'php', 'res'];

const SITES: Record<string, { root: string; php: string; port: number; app: 'laravel' | 'wordpress' | 'plain' }> = {
  toko: { root: 'www/toko/public', php: '8.4', port: 19002, app: 'laravel' },
  blog: { root: 'www/blog', php: '8.5', port: 19001, app: 'wordpress' },
  api: { root: 'www/api', php: '8.6', port: 19003, app: 'plain' },
};

const PRESETS = ['https://toko.test/produk/5', 'http://blog.test/wp-admin/', 'https://api.test/status.php', 'https://toko.test/.env', 'http://localhost/phpmyadmin/', 'http://kopi.test/'];

/** Tiny, stable fake latency so the same URL always reports the same time. */
function ms(url: string): number {
  let h = 7;
  for (const c of url) h = (h * 31 + c.charCodeAt(0)) % 997;
  return 9 + (h % 23);
}

function trace(input: string): Trace {
  let url: URL;
  try {
    url = new URL(/^[a-z]+:\/\//i.test(input.trim()) ? input.trim() : `http://${input.trim()}`);
  } catch {
    return { hops: [{ id: 'dns', detail: 'URL tidak valid', end: 'err' }], status: 'URL tidak valid', tone: 'err', body: ['Contoh: https://toko.test/produk/5'] };
  }
  const https = url.protocol === 'https:';
  const host = url.hostname.toLowerCase();
  const path = decodeURIComponent(url.pathname || '/');
  const port = https ? 18443 : 18080;
  const local = host === 'localhost' || host === '127.0.0.1';
  const name = host.replace(/\.test$/, '');
  const site = SITES[name];
  const hops: Hop[] = [];

  if (local) hops.push({ id: 'dns', detail: `${host} → 127.0.0.1`, end: 'ok' });
  else if (!host.endsWith('.test')) {
    hops.push({ id: 'dns', detail: `${host} bukan domain lokal`, end: 'err' });
    return { hops, status: 'Bukan situs lokal', tone: 'err', body: ['DEVUNRA melayani localhost dan *.test.'] };
  } else if (!site) {
    hops.push({ id: 'dns', detail: `${host} belum ada di hosts`, end: 'err' });
    return { hops, status: 'Tidak ditemukan', tone: 'err', body: [`Buat folder www/${name}, lalu tekan Sync`, 'di Settings › Domains & TLS.'] };
  } else hops.push({ id: 'dns', detail: `${host} → 127.0.0.1 (blok DEVUNRA)`, end: 'ok' });

  hops.push(https ? { id: 'tls', detail: `sertifikat ${local ? 'localhost' : host} · DEVUNRA Root CA`, end: 'ok' } : { id: 'tls', detail: 'http biasa', end: 'skip' });

  if (local) {
    if (/^\/phpmyadmin(\/|$)/i.test(path)) {
      hops.push({ id: 'vhost', detail: `localhost:${port} · Alias /phpmyadmin`, end: 'ok' });
      hops.push({ id: 'rule', detail: 'tanpa .htaccess', end: 'skip' });
      hops.push({ id: 'php', detail: '8.5 · 127.0.0.1:19001', end: 'ok' });
      hops.push({ id: 'res', detail: `200 OK · ${ms(input)} ms`, end: 'ok' });
      return { hops, status: '200 OK', tone: 'ok', body: ['phpMyAdmin 5.2', 'Server: 127.0.0.1:13306 (MySQL 9.6)'] };
    }
    hops.push({ id: 'vhost', detail: `localhost:${port} · DocumentRoot www`, end: 'ok' });
    hops.push({ id: 'rule', detail: 'ProxyPass / → dashboard DEVUNRA', end: 'ok' });
    hops.push({ id: 'php', detail: 'tidak perlu PHP', end: 'skip' });
    hops.push({ id: 'res', detail: `200 OK · ${ms(input)} ms`, end: 'ok' });
    return { hops, status: '200 OK', tone: 'ok', body: ['DEVUNRA', 'Setiap folder di www jadi situs.'] };
  }

  hops.push({ id: 'vhost', detail: `${host}:${port} → ${site.root}`, end: 'ok' });
  if (/(^|\/)\.(env|git|htaccess)(\/|$)/.test(path)) {
    hops.push({ id: 'rule', detail: 'Require all denied', end: 'err' });
    hops.push({ id: 'php', detail: 'tidak sampai PHP', end: 'skip' });
    hops.push({ id: 'res', detail: `403 Forbidden · ${ms(input)} ms`, end: 'err' });
    return { hops, status: '403 Forbidden', tone: 'err', body: ['Forbidden', `You don't have permission to access ${path}`] };
  }
  const direct = path.endsWith('.php');
  hops.push({
    id: 'rule',
    detail: direct ? 'file ada, langsung ke PHP' : site.app === 'laravel' ? 'RewriteRule ^ index.php [L]' : site.app === 'wordpress' ? 'DirectoryIndex index.php' : 'RewriteRule ^ index.php [QSA,L]',
    end: 'ok',
  });
  hops.push({ id: 'php', detail: `${site.php} · 127.0.0.1:${site.port}`, end: 'ok' });
  hops.push({ id: 'res', detail: `200 OK · ${ms(input)} ms`, end: 'ok' });
  const body =
    site.app === 'laravel'
      ? path === '/'
        ? ['Toko', 'Laravel 12 · PHP 8.4']
        : [`GET ${path}`, '{"id":5,"nama":"Kopi Toraja","stok":12}']
      : site.app === 'wordpress'
        ? ['WordPress › Masuk', 'PHP 8.5 · MySQL 9.6']
        : ['{"ok":true,"php":"8.6.0"}'];
  return { hops, status: '200 OK', tone: 'ok', body };
}

export function RequestTrace(): React.ReactElement {
  const reduced = usePrefersReducedMotion();
  const [url, setUrl] = useState(PRESETS[0]);
  const [result, setResult] = useState<Trace>(() => trace(PRESETS[0]));
  const [states, setStates] = useState<HopState[]>(ORDER.map(() => 'idle'));
  const [done, setDone] = useState(false);
  const run = useRef(0);
  const box = useRef<HTMLDivElement>(null);
  const seen = useInView(box, { once: true, amount: 0.4 });

  const send = useCallback(
    (raw: string) => {
      const id = ++run.current;
      const t = trace(raw);
      setResult(t);
      setDone(false);
      setStates(ORDER.map(() => 'idle'));
      const step = reduced ? 0 : 340;
      t.hops.forEach((hop, i) => {
        const at = ORDER.indexOf(hop.id);
        window.setTimeout(() => {
          if (run.current !== id) return;
          setStates((s) => s.map((v, j) => (j === at ? (hop.end === 'skip' ? 'skip' : 'busy') : v)));
        }, i * step);
        window.setTimeout(() => {
          if (run.current !== id) return;
          setStates((s) => s.map((v, j) => (j === at ? hop.end : v)));
          if (i === t.hops.length - 1) setDone(true);
        }, i * step + (reduced ? 0 : 220));
      });
    },
    [reduced]
  );

  useEffect(() => {
    if (seen) send(PRESETS[0]);
  }, [seen, send]);

  const reached = states.filter((s) => s === 'ok' || s === 'err' || s === 'skip').length;
  const https = /^https:/i.test(url.trim());

  return (
    <section className="sect" id="jalur">
      <div className="wrap">
        <SectionHead title={'Dari URL\nsampai PHP.'} sub="Apache asli, .htaccess, HTTPS lokal. Pilih URL, lihat jalannya." />

        <Reveal className="trace" delay={0.1}>
          <div ref={box}>
            <form
              className="trace-bar"
              onSubmit={(e) => {
                e.preventDefault();
                send(url);
              }}
            >
              <span className={https ? 'trace-lock is-https' : 'trace-lock'} aria-hidden="true">
                <svg viewBox="0 0 16 16" width="13" height="13">
                  {https ? (
                    <path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2M3.5 7h9v6.5h-9z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  ) : (
                    <path d="M8 4.5v4.5M8 11.2v.3M14 8A6 6 0 1 1 2 8a6 6 0 0 1 12 0Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  )}
                </svg>
              </span>
              <input
                className="trace-url mono"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                inputMode="url"
                aria-label="URL"
              />
              <motion.button className="trace-go" type="submit" whileTap={{ scale: 0.95 }}>
                Kirim
                <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
                  <path d="M3 8h9.5m0 0L8.5 4m4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.button>
            </form>

            <div className="trace-presets" role="list">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  role="listitem"
                  className={p === url ? 'trace-preset mono is-on' : 'trace-preset mono'}
                  onClick={() => {
                    setUrl(p);
                    send(p);
                  }}
                >
                  {p.replace(/^https?:\/\//, '')}
                </button>
              ))}
            </div>

            <div className="trace-grid">
              <div className="trace-hops">
                <span className="trace-line" aria-hidden="true">
                  <motion.i initial={false} animate={{ scaleY: reached / ORDER.length }} transition={{ duration: reduced ? 0 : 0.34, ease: 'easeOut' }} />
                </span>
                <ol>
                {ORDER.map((id, i) => {
                  const hop = result.hops.find((h) => h.id === id);
                  const state = states[i];
                  return (
                    <li key={id} className={`hop is-${state}`}>
                      <span className={state === 'ok' ? 'led led-on' : state === 'err' ? 'led led-err' : state === 'busy' ? 'led led-busy' : 'led'} />
                      <span className="hop-k mono">{LABEL[id]}</span>
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={`${id}-${state === 'idle' ? 'idle' : hop?.detail ?? 'none'}`}
                          className="hop-v mono"
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.18 }}
                        >
                          {hop ? (state === 'idle' ? '·' : hop.detail) : '–'}
                        </motion.span>
                      </AnimatePresence>
                    </li>
                  );
                })}
                </ol>
              </div>

              <div className={`trace-res is-${result.tone}`}>
                <div className="trace-res-bar mono">
                  <span className="win-dots" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span key={done ? result.status : 'wait'} className="trace-status" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                      {done ? result.status : 'menunggu…'}
                    </motion.span>
                  </AnimatePresence>
                </div>
                <div className="trace-res-body mono">
                  <AnimatePresence mode="wait" initial={false}>
                    {done && (
                      <motion.div key={url + result.status} initial={{ opacity: 0, filter: 'blur(6px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
                        {result.body.map((line, i) => (
                          <p key={i} className={i === 0 ? 'trace-h' : undefined}>
                            {line}
                          </p>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
