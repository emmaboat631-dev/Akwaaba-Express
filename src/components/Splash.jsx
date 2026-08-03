import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bus } from 'lucide-react';

// Splash sequence:
//   0.0 – 1.2s   letters of the wordmark cascade in
//   0.9 – 1.4s   gold accent bar sweeps underneath
//   1.4 – 1.9s   wordmark fades + blurs out, bus badge scales into its place
//   1.9 – 3.3s   bus drives off screen right (translateX 0 → 120vw)
//   3.3 – 3.8s   backdrop fades to reveal the landing page underneath
//
// The parent (App.jsx) flips this component off at ~3.3s; AnimatePresence
// plays the outer fade over the last 0.5s. Total ≈ 3.8s, no other loader.
// Timing constants sit at the top so the whole rhythm is tunable here.
const BRAND = 'Akwaaba Express';
const LETTER_STAGGER = 0.054; // seconds between each letter's start
const MORPH_AT = 1510;        // ms — wordmark → bus
const DRIVE_AT = 2050;        // ms — bus starts driving off

const Splash = () => {
  const [phase, setPhase] = useState('text'); // 'text' | 'morph' | 'drive'

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('morph'), MORPH_AT);
    const t2 = setTimeout(() => setPhase('drive'), DRIVE_AT);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.54, ease: 'easeOut' }}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 200,
        background: 'linear-gradient(165deg, #0B4A3C 0%, #06392F 45%, #032019 100%)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Stage — wordmark and bus overlap here so the morph is a cross-fade
          in the same visual spot rather than a swap between two locations. */}
      <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
        {/* Wordmark: per-letter cascade in, then fade + scale + blur out. */}
        <motion.div
          animate={{
            opacity: phase === 'text' ? 1 : 0,
            scale: phase === 'text' ? 1 : 0.72,
            filter: phase === 'text' ? 'blur(0px)' : 'blur(6px)',
          }}
          transition={{ duration: 0.43, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            className="wordmark"
            style={{ fontSize: 32, letterSpacing: 0.5, display: 'flex', lineHeight: 1 }}
          >
            {BRAND.split('').map((ch, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: i * LETTER_STAGGER,
                  duration: 0.54,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{ display: 'inline-block', whiteSpace: 'pre' }}
              >
                {ch === ' ' ? ' ' : ch}
              </motion.span>
            ))}
          </div>
          {/* Gold accent bar — sweeps in just after the last letter lands. */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{
              delay: BRAND.length * LETTER_STAGGER + 0.16,
              duration: 0.54,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              height: 3,
              width: 220,
              background: 'var(--gold)',
              borderRadius: 2,
              transformOrigin: 'left',
            }}
          />
        </motion.div>

        {/* Bus badge: pops in during morph, drives off during drive phase.
            Rounded translucent tile matches the earlier splash aesthetic so
            it reads as the same brand element the wordmark morphs into. */}
        <motion.div
          initial={{ opacity: 0, scale: 0.55 }}
          animate={{
            opacity: phase === 'text' ? 0 : 1,
            scale: phase === 'text' ? 0.55 : 1,
            x: phase === 'drive' ? '120vw' : 0,
          }}
          transition={{
            opacity: { duration: 0.43, ease: 'easeInOut' },
            scale: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
            x: { duration: 1.5, ease: [0.4, 0, 0.9, 1] },
          }}
          style={{
            position: 'absolute',
            width: 96,
            height: 96,
            borderRadius: 26,
            background: 'rgba(255,255,255,0.14)',
            border: '1px solid rgba(255,255,255,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Bus size={44} strokeWidth={2.2} />
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Splash;
