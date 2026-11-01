import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
export type Os = 'mac' | 'win' | null;

export const REPO = 'https://github.com/Intra-Sepriansa/devunra';
export const VERSION = '1.0.0';
/** Direct link to a file of the latest release (asset names carry the version). */
export const download = (file: string): string => `${REPO}/releases/latest/download/${file}`;

/** Files in public/ resolve against the relative base so the site works under /devunra/. */
export const asset = (file: string): string => `${import.meta.env.BASE_URL}${file}`;

/** Theme lives on <html data-theme>; index.html sets it before first paint. */
export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'));
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('devunra-theme', next);
      } catch {
        // Private mode: the choice lasts for this visit only.
      }
      return next;
    });
  }, []);
  return [theme, toggle];
}

export function detectOs(): Os {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const ua = nav.userAgentData?.platform || navigator.platform || navigator.userAgent;
  if (/win/i.test(ua)) return 'win';
  if (/mac|iphone|ipad/i.test(ua)) return 'mac';
  return null;
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}
