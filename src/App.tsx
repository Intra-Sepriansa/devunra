import React, { useEffect, useMemo, useState } from 'react';
import { MotionConfig } from 'motion/react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { Nav } from './components/Nav';
import type { Mood } from './components/Tarsier';
import { detectOs, useTheme } from './lib/env';
import { Download } from './sections/Download';
import { EngineScene } from './sections/EngineScene';
import { Footer } from './sections/Footer';
import { Gallery } from './sections/Gallery';
import { Hero } from './sections/Hero';
import { Installer } from './sections/Installer';
import { PhpScene } from './sections/PhpScene';
import { PortMove } from './sections/PortMove';
import { RequestTrace } from './sections/RequestTrace';

export function App(): React.ReactElement {
  const [theme, toggleTheme] = useTheme();
  // The live panel in the hero drives the tarsier mood, the nav mark mirrors it.
  const [mood, setMood] = useState<Mood>('sleep');
  const os = useMemo(detectOs, []);

  // Smooth wheel scrolling; touch keeps the native feel, anchors glide to their section.
  useEffect(() => {
    const lenis = new Lenis({ autoRaf: true, lerp: 0.11, anchors: { offset: -64 }, respectReducedMotion: true });
    return () => lenis.destroy();
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="rails" aria-hidden="true" />
      <Nav mood={mood} theme={theme} onToggleTheme={toggleTheme} />
      <main>
        <Hero mood={mood} onMood={setMood} os={os} />
        <EngineScene />
        <PortMove />
        <PhpScene />
        <RequestTrace />
        <Installer />
        <Gallery theme={theme} />
        <Download os={os} />
      </main>
      <Footer />
    </MotionConfig>
  );
}
