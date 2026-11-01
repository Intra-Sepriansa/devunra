import React from 'react';
import { motion, type Variants } from 'motion/react';

const EASE = [0.2, 0.7, 0.1, 1] as const;

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
      transition={{ duration: 1, ease: EASE, delay }}
    >
      {children}
    </Tag>
  );
}

const word: Variants = {
  hidden: { y: '55%', opacity: 0, filter: 'blur(10px)' },
  show: (i: number) => ({ y: '0%', opacity: 1, filter: 'blur(0px)', transition: { duration: 0.9, ease: EASE, delay: i * 0.05 } }),
};

/**
 * A heading whose words rise out of a blur one after another. Lines are split on
 * "\n"; each word is its own span so wrapping still works on narrow screens.
 */
export function SplitTitle({ text, as = 'h2', className }: { text: string; as?: 'h1' | 'h2'; className?: string }) {
  const Tag = motion[as];
  let n = 0;
  return (
    <Tag className={className} aria-label={text.replace(/\n/g, ' ')} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.6 }}>
      {text.split('\n').map((line, li) => (
        <span className="st-line" key={li} aria-hidden="true">
          {line.split(' ').map((w) => (
            <motion.span className="st-word" key={`${li}-${w}-${n}`} variants={word} custom={n++}>
              {w}
            </motion.span>
          ))}
        </span>
      ))}
    </Tag>
  );
}

export function SectionHead({ index, label, title, sub, children }: { index: string; label: string; title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <header className="sect-head">
      <Reveal as="div" className="sect-idx-wrap">
        <span className="sect-idx mono">
          {index} / {label}
        </span>
      </Reveal>
      <SplitTitle text={title} />
      {sub && (
        <Reveal as="p" className="sect-sub" delay={0.25}>
          {sub}
        </Reveal>
      )}
      {children}
    </header>
  );
}
