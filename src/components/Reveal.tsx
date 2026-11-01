import React from 'react';
import { motion } from 'motion/react';

/** Fades and lifts its content in the first time it scrolls into view. */
export function Reveal({
  children,
  className,
  delay = 0,
  as = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'header' | 'p' | 'figure';
}): React.ReactElement {
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 1, ease: [0.2, 0.7, 0.1, 1], delay }}
    >
      {children}
    </Tag>
  );
}

export function SectionHead({ index, label, title, sub }: { index: string; label: string; title: React.ReactNode; sub?: string }) {
  return (
    <Reveal as="header" className="sect-head">
      <span className="sect-idx mono">
        {index} / {label}
      </span>
      <h2>{title}</h2>
      {sub && <p className="sect-sub">{sub}</p>}
    </Reveal>
  );
}
