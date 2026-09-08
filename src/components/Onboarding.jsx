import React, { useState } from 'react';
import { MapPin, Zap, QrCode, ArrowRight, ChevronRight } from 'lucide-react';

const slides = [
  {
    icon: MapPin,
    color: '#1FA971',
    title: 'Book intercity trips',
    desc: 'Search routes across Ghana — Accra, Kumasi, Tamale, Cape Coast and more. Pick your seats, choose your operator, and pay securely.',
  },
  {
    icon: Zap,
    color: '#F4C430',
    title: 'Track buses live',
    desc: 'See nearby buses on a real-time map. Tap one to check its ETA, available seats, and hop on — Uber-style.',
  },
  {
    icon: QrCode,
    color: '#3B82F6',
    title: 'QR tickets & easy payments',
    desc: 'Pay with card via Paystack. Your QR boarding pass is saved automatically — just scan and board.',
  },
];

const Onboarding = ({ onFinish }) => {
  const [current, setCurrent] = useState(0);
  const slide = slides[current];
  const Icon = slide.icon;
  const isLast = current === slides.length - 1;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '40px 28px', textAlign: 'center',
    }}>
      <div style={{
        width: 100, height: 100, borderRadius: '50%',
        background: `${slide.color}18`, color: slide.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 32, transition: 'all .3s',
      }}>
        <Icon size={44} />
      </div>

      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, transition: 'all .3s' }}>{slide.title}</h2>
      <p className="muted" style={{ maxWidth: 300, lineHeight: 1.6, marginBottom: 40, minHeight: 72 }}>{slide.desc}</p>

      {/* Dots */}
      <div className="flex gap-2" style={{ marginBottom: 32 }}>
        {slides.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === current ? 24 : 8, height: 8, borderRadius: 4,
              background: i === current ? 'var(--primary)' : 'var(--line)',
              transition: 'all .3s',
            }}
          />
        ))}
      </div>

      <div style={{ width: '100%', maxWidth: 320 }}>
        <button className="btn btn-primary" onClick={() => isLast ? onFinish() : setCurrent(current + 1)}>
          {isLast ? (<>Get started <ArrowRight size={16} /></>) : (<>Next <ChevronRight size={16} /></>)}
        </button>
        {!isLast && (
          <button
            className="btn btn-ghost mt-2"
            style={{ color: 'var(--ink-3)', fontSize: 14 }}
            onClick={onFinish}
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
