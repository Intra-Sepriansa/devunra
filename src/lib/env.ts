import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
export type Os = 'mac' | 'win' | null;

export const REPO = 'https://github.com/Intra-Sepriansa/devunra';
export const VERSION = '1.2.0';
/** Pin each artifact to its release so an older platform remains downloadable. */
export const download = (file: string, version = VERSION): string => `${REPO}/releases/download/v${version}/${file}`;

export interface ReleaseFile {
  file: string;
  /** Size in mebibytes (2^20 bytes), rounded for display. */
  mb: number;
  sha256: string;
  version?: string;
  date?: string;
  chip?: string;
  needs?: string;
  /** Set only after the exact packaged artifact completed acceptance. */
  bundledEngines?: string[];
  evidence?: string;
}

interface ReleaseInfo {
  date: string;
  mac: ReleaseFile;
  macIntel?: ReleaseFile;
  macSlim?: ReleaseFile;
  macLegacy?: ReleaseFile;
  winSetup: ReleaseFile;
  winZip: ReleaseFile;
}

/** Published artifacts only. Missing architectures stay out of the download picker. */
export const RELEASE: ReleaseInfo = {
  date: '3 Nov 2026',
  mac: {
    file: `DEVUNRA-${VERSION}-arm64.dmg`, mb: 979.81,
    sha256: '0ebb4d7de441458101dd6fac1ab6f3a6f6377f325affe2f3b10c7108a66bc0af',
    chip: 'Apple Silicon', needs: 'macOS 27.0+',
    bundledEngines: ['Apache', 'Nginx', 'PHP', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Memcached'],
    evidence: 'Tes paket: 89 lulus, 0 gagal, 6 dilewati.',
  },
  macSlim: {
    file: `DEVUNRA-${VERSION}-arm64-slim.dmg`, mb: 105.1,
    sha256: 'cfcc7e5be67c4389c73b598ca28123d17875bba1b5e09cff048ec6969df83c04',
    chip: 'Apple Silicon', needs: 'macOS 11.0+', bundledEngines: [],
  },
  macIntel: {
    file: `DEVUNRA-${VERSION}-x64-slim.dmg`, mb: 112.84,
    sha256: '57711e96d6daaacf5148554d26ff1d4cab997d2b6a9a7cf8bcfac92c3c7b4f99',
    chip: 'Intel x64', needs: 'macOS 11.0+', bundledEngines: [],
    evidence: 'Diuji lewat Rosetta: 77 lulus, 0 gagal, 18 dilewati. Belum diuji pada Mac Intel fisik.',
  },
  winSetup: {
    file: 'DEVUNRA-Setup-1.2.0.exe', mb: 572.8,
    sha256: 'e30fe25eae56b7e84bd478d1500586a60d2ec70f9194c18f4b6b7a2335c08ee6',
    version: '1.2.0', date: '3 Nov 2026',
    bundledEngines: ['Apache', 'PHP', 'MySQL', 'PostgreSQL', 'Redis'],
    evidence: 'Tes installer di Windows VM: 86 lulus, 0 gagal, 9 dilewati.',
  },
  winZip: {
    file: 'DEVUNRA-1.2.0-win-x64.zip', mb: 828.57,
    sha256: '931a2fe1bbaffb344ffb180810df68d13a0821b425b005584dea89194056ed0a',
    version: '1.2.0', date: '3 Nov 2026',
    bundledEngines: ['Apache', 'PHP', 'MySQL', 'PostgreSQL', 'Redis'],
    evidence: 'Tes ZIP portable di Windows VM: 86 lulus, 0 gagal, 9 dilewati.',
  },
};

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
