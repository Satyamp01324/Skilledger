import { useState, useEffect } from 'react';
import QRCode from 'qrcode';

export default function RealQRCode({
  value,
  size = 180,
  caption = 'Scan with mobile camera to view certificate',
  showUrl = false,
  downloadName = 'credential-qr.png',
}) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!value) return;

    let isMounted = true;
    QRCode.toDataURL(value, {
      width: Math.max(size * 2, 320),
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#070b14',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (isMounted) {
          setQrDataUrl(url);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('QR generation error:', err);
          setError('Failed to generate QR');
          // High-reliability fallback
          setQrDataUrl(
            `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, [value, size]);

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '14px',
        background: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.15)',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ffffff',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="Cryptographic Credential QR Code"
            style={{
              width: size,
              height: size,
              display: 'block',
              imageRendering: 'pixelated',
            }}
          />
        ) : (
          <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
            {error ? error : 'Generating QR…'}
          </div>
        )}
      </div>

      {caption && (
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 600,
            color: '#1e293b',
            marginTop: 8,
            maxWidth: size + 20,
            lineHeight: 1.3,
          }}
        >
          {caption}
        </span>
      )}

      {showUrl && value && (
        <div
          style={{
            marginTop: 6,
            maxWidth: size + 30,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: '0.66rem',
            color: '#64748b',
          }}
          title={value}
        >
          {value}
        </div>
      )}

      <button
        type="button"
        onClick={handleDownload}
        style={{
          marginTop: 8,
          fontSize: '0.68rem',
          padding: '3px 8px',
          background: '#f1f5f9',
          color: '#334155',
          border: '1px solid #cbd5e1',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        ↓ Save QR Image
      </button>
    </div>
  );
}
