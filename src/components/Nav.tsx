import React, { useEffect, useState } from 'react';
import { motion, useScroll, useSpring } from 'motion/react';
import { Tarsier, type Mood } from './Tarsier';
import { REPO, type Theme } from '../lib/env';

const LINKS = [
  ['engine', 'Engine'],
  ['port', 'Port'],
  ['php', 'PHP'],
  ['app', 'Aplikasi'],
  ['unduh', 'Unduh'],
] as const;

export function Nav({ mood, theme, onToggleTheme }: { mood: Mood; theme: Theme; onToggleTheme: () => void }): React.ReactElement {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [stars, setStars] = useState<number | null>(null);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 30, restDelta: 0.001 });

  useEffect(() => {
    const onScroll = () => setScrolled(scrollY > 8);
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-45% 0px -50% 0px' }
    );
    LINKS.forEach(([id]) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    fetch('https://api.github.com/repos/Intra-Sepriansa/devunra')
      .then((r) => (r.ok ? r.json() : null))
      .then((repo) => repo?.stargazers_count > 0 && setStars(repo.stargazers_count))
      .catch(() => undefined);
  }, []);

  return (
    <header className={scrolled ? 'nav is-scrolled' : 'nav'} id="top">
      <motion.span className="progress" style={{ scaleX: progress }} aria-hidden="true" />
      <div className="wrap nav-in">
        <a className="brand" href="#top" aria-label="DEVUNRA">
          <span className="brand-mark">
            <Tarsier mood={mood} reach={2.4} />
          </span>
          <span className="brand-word">DEVUNRA</span>
        </a>
        <nav className="nav-links" aria-label="Bagian">
          {LINKS.map(([id, label]) => (
            <a key={id} href={`#${id}`} className={active === id ? 'is-active' : undefined}>
              {label}
            </a>
          ))}
        </nav>
        <div className="nav-tools">
          <a className="nav-gh" href={REPO} target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path
                fill="currentColor"
                d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
              />
            </svg>
            <span className="nav-gh-label">GitHub</span>
            {stars !== null && <span className="nav-stars">★ {stars}</span>}
          </a>
          <button className="theme-btn" type="button" aria-label={theme === 'dark' ? 'Tema terang' : 'Tema gelap'} onClick={onToggleTheme}>
            <motion.svg key={theme} viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
              {theme === 'dark' ? (
                <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              ) : (
                <>
                  <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </>
              )}
            </motion.svg>
          </button>
        </div>
      </div>
    </header>
  );
}
