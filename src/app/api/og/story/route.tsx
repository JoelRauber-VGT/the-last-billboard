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
        headers: { apikey: key, Authorization: `Bearer ${key}` },
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

const WIDTH = 1080;
const HEIGHT = 1920;

function fallback() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(180deg, #000000 0%, #111 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          color: '#fff',
        }}
      >
        <div
          style={{
            fontSize: 56,
            color: '#FF6B00',
            letterSpacing: 6,
            marginBottom: 32,
            textTransform: 'uppercase',
          }}
        >
          The Last Billboard
        </div>
        <div style={{ fontSize: 96, fontWeight: 700, textAlign: 'center', padding: '0 80px' }}>
          Claim Your Space
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  );
}

function storyCard(slot: SlotForOg, variant: string) {
  const ownerLabel = slot.is_anonymous ? 'Anonymous' : slot.display_name;
  const headline =
    variant === 'outbid'
      ? 'Outbid · Claimed'
      : variant === 'own'
      ? 'My Slot'
      : 'I Just Claimed a Slot';

  return new ImageResponse(
    (
      <div
        style={{
          background: '#000',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'system-ui, sans-serif',
          color: '#fff',
          position: 'relative',
        }}
      >
        {/* Top strip — brand */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 0 40px',
            fontSize: 32,
            color: '#FF6B00',
            letterSpacing: 8,
            textTransform: 'uppercase',
          }}
        >
          The Last Billboard
        </div>

        {/* Hero image — large square-ish region */}
        <div
          style={{
            width: WIDTH - 80,
            height: WIDTH - 80,
            margin: '20px 40px',
            background: '#0a0a0a',
            border: '4px solid rgba(255,107,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {slot.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={slot.image_url}
              alt=""
              width={WIDTH - 88}
              height={WIDTH - 88}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <div style={{ fontSize: 48, color: '#FF6B00' }}>No image</div>
          )}
        </div>

        {/* Headline + bid */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '40px 60px',
            gap: 16,
            flex: 1,
          }}
        >
          <div style={{ fontSize: 80, fontWeight: 800, lineHeight: 1.05 }}>
            {headline}
          </div>
          <div style={{ fontSize: 44, color: '#a1a1aa', lineHeight: 1.2 }}>
            {ownerLabel}
          </div>
          <div
            style={{
              fontSize: 140,
              fontWeight: 800,
              color: '#FF6B00',
              marginTop: 'auto',
              lineHeight: 1,
            }}
          >
            €{slot.current_bid_eur.toFixed(0)}
          </div>
        </div>

        {/* Bottom strip — call to action */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '50px 60px 80px',
            background: 'rgba(255,107,0,0.12)',
            borderTop: '2px solid rgba(255,107,0,0.4)',
            fontSize: 40,
            color: '#fff',
            textAlign: 'center',
          }}
        >
          → thelastbillboard · before someone outbids me
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
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
        return storyCard(slot, variant);
      }
    }

    return fallback();
  } catch (err) {
    console.error('story OG error', err);
    return new Response('Failed to generate image', { status: 500 });
  }
}
