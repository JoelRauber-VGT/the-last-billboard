import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface SlotForOg {
  display_name: string;
  current_bid_eur: number;
  image_url: string | null;
  is_anonymous: boolean;
  status: string;
}

async function fetchSlot(id: string): Promise<SlotForOg | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(
      `${url}/rest/v1/slots?id=eq.${id}&select=display_name,current_bid_eur,image_url,is_anonymous,status&limit=1`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        cache: 'no-store',
      }
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as SlotForOg[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

function defaultCard() {
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
            }}
          />
          <span
            style={{ fontSize: 24, color: '#ffffff', fontWeight: 500 }}
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
}

function slotCard(slot: SlotForOg, variant: string) {
  const ownerLabel = slot.is_anonymous ? 'Anonymous' : slot.display_name;
  const headline =
    variant === 'outbid'
      ? 'Outbid · Slot Claimed'
      : variant === 'own'
      ? 'My Slot on The Last Billboard'
      : 'I Just Claimed a Slot';

  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* Left: image */}
        <div
          style={{
            width: 600,
            height: 630,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0a0a0a',
            borderRight: '1px solid rgba(255,107,0,0.25)',
            overflow: 'hidden',
          }}
        >
          {slot.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={slot.image_url}
              alt=""
              width={600}
              height={630}
              style={{
                width: 600,
                height: 630,
                objectFit: 'cover',
              }}
            />
          ) : (
            <div
              style={{
                color: '#FF6B00',
                fontSize: 32,
                display: 'flex',
              }}
            >
              No image
            </div>
          )}
        </div>

        {/* Right: text */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: 60,
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontSize: 18,
                color: '#FF6B00',
                letterSpacing: 4,
                marginBottom: 16,
                textTransform: 'uppercase',
              }}
            >
              The Last Billboard
            </div>
            <div
              style={{
                fontSize: 42,
                color: '#ffffff',
                fontWeight: 700,
                lineHeight: 1.15,
                marginBottom: 24,
              }}
            >
              {headline}
            </div>
            <div
              style={{
                fontSize: 24,
                color: '#a1a1aa',
                lineHeight: 1.4,
                marginBottom: 24,
              }}
            >
              {ownerLabel}
            </div>
            <div
              style={{
                fontSize: 56,
                color: '#FF6B00',
                fontWeight: 700,
              }}
            >
              €{slot.current_bid_eur.toFixed(0)}
            </div>
          </div>

          <div
            style={{
              fontSize: 18,
              color: '#71717a',
              display: 'flex',
            }}
          >
            thelastbillboard · live now
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawSlot = searchParams.get('slot');
    const variant = searchParams.get('v') ?? 'purchase';

    if (rawSlot !== null && !UUID_RE.test(rawSlot)) {
      return new Response('Invalid slot id', { status: 400 });
    }

    if (rawSlot) {
      const slot = await fetchSlot(rawSlot);
      if (slot && slot.status === 'active') {
        return slotCard(slot, variant);
      }
    }

    return defaultCard();
  } catch (error) {
    console.error('OG image generation error:', error);
    return new Response('Failed to generate image', { status: 500 });
  }
}
