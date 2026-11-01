import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
export type Os = 'mac' | 'win' | null;

export const REPO = 'https://github.com/Intra-Sepriansa/devunra';
export const VERSION = '1.1.0';
/** Direct link to a file of the latest release (asset names carry the version). */
export const download = (file: string): string => `${REPO}/releases/latest/download/${file}`;

export interface ReleaseFile {
  file: string;
  /** Mebibytes, as Finder and Explorer show them. */
  mb: number;
  sha256: string;
}

/** The files attached to the GitHub release for VERSION. */
export const RELEASE = {
  date: '1 Nov 2026',
  mac: { file: `DEVUNRA-${VERSION}-arm64.dmg`, mb: 105, sha256: '1b0a256a6a7d001deff0c0b42e4bc595dbf29ad39bfa3c3d4a4bd7c1aaad84ff' },
  winSetup: { file: `DEVUNRA-Setup-${VERSION}.exe`, mb: 83, sha256: '320be0577ecbf23590ac3b10816998f88a56bba11f75680eb28ac1fcbd25eab9' },
  winZip: { file: `DEVUNRA-${VERSION}-win-x64.zip`, mb: 111, sha256: '32477937c6be3d45f948a999cd60fa153b43ff5df238a1245da371ef9b448f7d' },
} satisfies Record<string, ReleaseFile | string>;

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
