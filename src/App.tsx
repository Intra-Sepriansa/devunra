import React, { useMemo, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { Nav } from './components/Nav';
import type { Mood } from './components/Tarsier';
import { detectOs, useTheme } from './lib/env';
import { Download } from './sections/Download';
import { Engines } from './sections/Engines';
import { Footer } from './sections/Footer';
import { Gallery } from './sections/Gallery';
import { Hero } from './sections/Hero';
import { Installer } from './sections/Installer';
import { PhpRoute } from './sections/PhpRoute';
import { PortMove } from './sections/PortMove';

export function App(): React.ReactElement {
  const [theme, toggleTheme] = useTheme();
  // The live panel in the hero drives the tarsier mood, the nav mark mirrors it.
  const [mood, setMood] = useState<Mood>('sleep');
  const os = useMemo(detectOs, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="rails" aria-hidden="true" />
      <Nav mood={mood} theme={theme} onToggleTheme={toggleTheme} />
      <main>
        <Hero mood={mood} onMood={setMood} os={os} />
        <Engines />
        <PortMove />
        <PhpRoute />
        <Installer />
        <Gallery theme={theme} />
        <Download os={os} />
      </main>
      <Footer />
    </MotionConfig>
  );
}
