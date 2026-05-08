import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawSlot = searchParams.get('slot');

    // Reject malformed slot params early — the OG pipeline must not take
    // unvalidated input into a DB lookup. Slot-specific OG rendering is a
    // separate P2; for now we just guard the param and continue with the
    // default card.
    if (rawSlot !== null && !UUID_RE.test(rawSlot)) {
      return new Response('Invalid slot id', { status: 400 });
    }

    // Default OG image
    return new ImageResponse(
      (
        <div
          style={{
            background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, sans-serif',
            position: 'relative',
          }}
        >
          {/* Grid pattern overlay */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage:
                'linear-gradient(rgba(255, 107, 0, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 107, 0, 0.1) 1px, transparent 1px)',
              backgroundSize: '50px 50px',
              opacity: 0.3,
            }}
          />

          {/* Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
              padding: '80px',
            }}
          >
            {/* Title */}
            <h1
              style={{
                fontSize: 84,
                fontWeight: 'bold',
                color: '#ffffff',
                marginBottom: 20,
                textAlign: 'center',
                letterSpacing: '-0.02em',
              }}
            >
              The Last Billboard
            </h1>

            {/* Tagline */}
            <p
              style={{
                fontSize: 40,
                color: '#FF6B00',
                marginBottom: 40,
                textAlign: 'center',
                fontWeight: 600,
              }}
            >
              Claim Your Space
            </p>

            {/* Description */}
            <p
              style={{
                fontSize: 28,
                color: '#a1a1aa',
                textAlign: 'center',
                maxWidth: 900,
                lineHeight: 1.4,
              }}
            >
              The final advertising space on the internet. Compete for visibility.
              Winner takes all.
            </p>
          </div>

          {/* Footer badge */}
          <div
            style={{
              position: 'absolute',
              bottom: 40,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '16px 32px',
              background: 'rgba(255, 107, 0, 0.15)',
              borderRadius: 50,
              border: '2px solid rgba(255, 107, 0, 0.3)',
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: '#FF6B00',
                animation: 'pulse 2s ease-in-out infinite',
              }}
            />
            <span
              style={{
                fontSize: 24,
                color: '#ffffff',
                fontWeight: 500,
              }}
            >
              Live Now
            </span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('OG image generation error:', error);
    return new Response('Failed to generate image', { status: 500 });
  }
}
