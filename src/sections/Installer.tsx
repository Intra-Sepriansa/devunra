import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView } from 'motion/react';
import { Reveal, SectionHead } from '../components/Reveal';
import { playSound } from '../lib/sound';

/** The new-project installers, replayed as a terminal log. */
type Kind = 'cmd' | 'dim' | 'ok' | 'key';
type Recipe = { title: string; url: string; lines: Array<[Kind, string]> };

const RECIPES: Record<'laravel' | 'wordpress', Recipe> = {
  laravel: {
    title: 'Proyek baru · toko',
    url: 'toko.test siap',
    lines: [
      ['cmd', 'composer create-project laravel/laravel toko'],
      ['dim', 'Creating a "laravel/laravel" project at "./toko"'],
      ['dim', '  - Installing laravel/framework: Extracting archive'],
      ['dim', '  - Installing symfony/http-kernel: Extracting archive'],
      ['dim', 'Package operations: 112 installs, 0 updates, 0 removals'],
      ['ok', '  INFO  Application key set successfully.'],
      ['key', '.env   DB_CONNECTION=mysql  DB_PORT=13306  DB_DATABASE=toko'],
      ['cmd', 'php artisan migrate --force'],
      ['ok', '  create_users_table .................... DONE'],
      ['ok', '  create_cache_table .................... DONE'],
      ['ok', '  create_jobs_table ..................... DONE'],
    ],
  },
  wordpress: {
    title: 'Proyek baru · blog',
    url: 'blog.test siap',
    lines: [
      ['cmd', 'download https://wordpress.org/latest.zip'],
      ['dim', 'latest.zip  26.4 MB'],
      ['ok', 'sha1 cocok dengan wordpress.org'],
      ['dim', 'ekstrak ke www/blog'],
      ['key', "wp-config.php   DB_NAME='blog'  DB_HOST='127.0.0.1:13306'"],
      ['ok', '8 salt baru dibuat'],
      ['cmd', 'CREATE DATABASE blog CHARACTER SET utf8mb4'],
      ['ok', 'Query OK, 1 row affected'],
    ],
  },
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function Installer(): React.ReactElement {
  const [recipe, setRecipe] = useState<keyof typeof RECIPES>('laravel');
  const [lines, setLines] = useState<Array<[Kind, string]>>([]);
  const [done, setDone] = useState(false);
  const run = useRef(0);
  const termRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inView = useInView(termRef, { once: true, amount: 0.5 });

  const play = useCallback(async (which: keyof typeof RECIPES) => {
    const id = ++run.current;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const r = RECIPES[which];
    setDone(false);
    setLines([]);
    for (const [kind, text] of r.lines) {
      if (id !== run.current) return;
      if (kind === 'cmd' && !reduced) {
        for (let n = 1; n <= text.length; n++) {
          if (id !== run.current) return;
          const partial = text.slice(0, n);
          setLines((l) => (n === 1 ? [...l, [kind, partial]] : [...l.slice(0, -1), [kind, partial]]));
          await wait(16);
        }
        await wait(260);
      } else {
        setLines((l) => [...l, [kind, text]]);
        await wait(reduced ? 0 : 110 + Math.random() * 160);
      }
      bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
    }
    if (id !== run.current) return;
    setDone(true);
    playSound('yay');
  }, []);

  useEffect(() => {
    if (inView) void play(recipe);
    // Only the first time it scrolls in; later runs come from the buttons.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  const r = RECIPES[recipe];
  const progress = lines.length / r.lines.length;

  return (
    <section className="sect" id="install">
      <div className="wrap install">
        <SectionHead title={'Laravel. WordPress.\nLangsung jalan.'}>
          <Reveal className="seg" delay={0.3}>
            <div role="tablist" aria-label="Template" className="seg-in">
            {(Object.keys(RECIPES) as Array<keyof typeof RECIPES>).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={recipe === key}
                onClick={() => {
                  setRecipe(key);
                  void play(key);
                }}
              >
                {recipe === key && <motion.span layoutId="seg-pill" className="seg-pill" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />}
                <span className="seg-label">{key === 'laravel' ? 'Laravel' : 'WordPress'}</span>
              </button>
            ))}
            </div>
          </Reveal>
        </SectionHead>
        <Reveal delay={0.1} className="term-wrap">
          <div ref={termRef} className={done ? 'term is-done' : 'term'}>
            <div className="term-bar mono">
              <span className="win-dots">
                <i />
                <i />
                <i />
              </span>
              <span>{r.title}</span>
              <button type="button" className="term-replay" aria-label="Putar ulang" onClick={() => void play(recipe)}>
                ↻
              </button>
            </div>
            <div ref={bodyRef} className="term-body mono">
              {lines.map(([kind, text], i) => (
                <motion.div key={`${recipe}-${i}`} className={`t-${kind}`} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
                  {text}
                </motion.div>
              ))}
            </div>
            <div className="term-foot mono">
              <span className="bar">
                <motion.i animate={{ scaleX: progress }} transition={{ duration: 0.3 }} />
              </span>
              <AnimatePresence>
                {done && (
                  <motion.span className="done" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <span className="led led-on" />
                    {r.url}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
