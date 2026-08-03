import React, { useEffect, useRef } from 'react';
import QrScanner from 'qr-scanner';

// Thin wrapper around the qr-scanner engine (headless — binds to a <video>
// element, no bundled UI). We render our own viewfinder so it matches the
// rest of the design system instead of the library's default overlay.
// Props: onScan(text), onError('no-camera' | 'permission-denied').
const QrScannerView = ({ onScan, onError }) => {
  const videoRef = useRef(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    QrScanner.hasCamera()
      .then((hasCamera) => {
        if (cancelled) return;
        if (!hasCamera || !videoRef.current) {
          onError?.('no-camera');
          return;
        }
        const scanner = new QrScanner(
          videoRef.current,
          (result) => onScan?.(result.data),
          {
            preferredCamera: 'environment',
            highlightScanRegion: false,
            highlightCodeOutline: false,
            onDecodeError: () => {}, // fires continuously while no code is in frame — expected, not an error
          },
        );
        scannerRef.current = scanner;
        scanner.start().then(
          () => {
            // If the user hit back while start() was resolving, tear the
            // now-started camera down immediately so no stream lingers.
            if (cancelled) { scanner.stop(); scanner.destroy(); scannerRef.current = null; }
          },
          () => onError?.('permission-denied'),
        );
      })
      .catch(() => { if (!cancelled) onError?.('no-camera'); });

    return () => {
      cancelled = true;
      scannerRef.current?.stop();
      scannerRef.current?.destroy();
      scannerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const corner = (pos) => ({
    position: 'absolute', width: 28, height: 28, borderColor: 'var(--primary)', borderStyle: 'solid', borderWidth: 0,
    ...pos,
  });

  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '3 / 4', borderRadius: 'var(--r-lg)', overflow: 'hidden', background: '#000' }}>
      <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} muted playsInline />
      <div
        style={{
          position: 'absolute', inset: '19% 15%', borderRadius: 22,
          boxShadow: '0 0 0 999px rgba(0,0,0,0.4)', pointerEvents: 'none',
        }}
      >
        <div style={{ ...corner({ top: -3, left: -3 }), borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 16 }} />
        <div style={{ ...corner({ top: -3, right: -3 }), borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 16 }} />
        <div style={{ ...corner({ bottom: -3, left: -3 }), borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 16 }} />
        <div style={{ ...corner({ bottom: -3, right: -3 }), borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 16 }} />
      </div>
    </div>
  );
};

export default QrScannerView;
