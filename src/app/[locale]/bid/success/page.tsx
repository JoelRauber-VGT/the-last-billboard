'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Share2 } from 'lucide-react';
import { ShareSlotDialog } from '@/components/share/ShareSlotDialog';

interface PurchasedSlot {
  id: string;
  display_name: string;
  current_bid_eur: number;
  image_url: string | null;
}

interface PurchaseInfo {
  slot: PurchasedSlot;
  outbid: { displayName: string } | null;
}

export default function BidSuccessPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale as string;
  const sessionId = searchParams.get('session_id');
  const t = useTranslations('bid.success');
  const tShare = useTranslations('share');
  const [userEmail, setUserEmail] = useState<string>('');
  const [purchase, setPurchase] = useState<PurchaseInfo | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    const fetchUserEmail = async () => {
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();
        if (data.user?.email) {
          setUserEmail(data.user.email);
        }
      } catch {
        // advisory — ignore
      }
    };
    fetchUserEmail();
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      attempts += 1;
      try {
        const res = await fetch(
          `/api/checkout/last-purchase?session_id=${encodeURIComponent(sessionId)}`,
          { cache: 'no-store' }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data.ready && data.slot) {
          setPurchase({ slot: data.slot, outbid: data.outbid });
          if (pollRef.current !== null) {
            window.clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
      } catch {
        // advisory — ignore, will retry
      }
      // Stop polling after ~30 attempts (≈ 60s) to be safe.
      if (attempts >= 30 && pollRef.current !== null) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };

    poll();
    pollRef.current = window.setInterval(poll, 2000);
    return () => {
      cancelled = true;
      if (pollRef.current !== null) window.clearInterval(pollRef.current);
    };
  }, [sessionId]);

  const variant = purchase?.outbid ? 'outbid' : 'purchase';

  return (
    <div className="h-full w-full flex items-center justify-center bg-term-bg p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-term-surface border border-term-border-light font-mono overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-term-faint">
            <span className="text-term-accent text-sm">$ payment</span>
            <span className="text-term-dim text-xs">[confirmed]</span>
          </div>

          {/* Content */}
          <div className="p-5 space-y-6 bg-term-bg">
            {/* Status steps */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-term-muted">&gt; {t('statusProcessing')}</span>
                <span className="text-term-accent">[ok]</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-term-muted">&gt; {t('statusVerifying')}</span>
                <span className="text-term-accent">[ok]</span>
              </div>
              <div className="text-term-accent">&gt; {t('statusConfirmed')}</div>
            </div>

            {/* Result messages */}
            <div className="space-y-1 text-sm text-term-muted pt-2 border-t border-term-faint">
              <div>&gt; {t('slotLive')}</div>
              {userEmail && (
                <div>&gt; {t('confirmationEmail', { email: userEmail })}</div>
              )}
            </div>

            {/* Share prompt */}
            {purchase && (
              <div className="border border-term-accent/40 bg-term-accent/5 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-12 h-12 overflow-hidden bg-term-bg border border-term-border-light">
                    {purchase.slot.image_url ? (
                      <img
                        src={purchase.slot.image_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-term-accent uppercase tracking-widest">
                      {tShare('promptLabel')}
                    </div>
                    <div className="text-sm text-white mt-0.5">
                      {tShare(`${variant}.promptHeadline`, {
                        name: purchase.slot.display_name,
                      })}
                    </div>
                    <div className="text-xs text-term-muted mt-0.5">
                      {tShare('promptSubtitle')}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShareOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 text-xs text-black bg-term-accent hover:bg-term-accent/90 font-bold tracking-wide transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  {tShare('shareNow')}
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => router.push(`/${locale}`)}
                className="px-4 py-2 text-xs text-term-accent border border-term-accent hover:bg-term-accent/10 transition-colors"
              >
                [{t('viewBillboard')}]
              </button>
              <button
                onClick={() => router.push(`/${locale}/dashboard`)}
                className="px-4 py-2 text-xs text-term-muted border border-term-border-light hover:text-white hover:border-term-accent transition-colors"
              >
                [{t('viewDashboard')}]
              </button>
            </div>
          </div>
        </div>
      </div>

      {purchase && (
        <ShareSlotDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          variant={variant}
          slot={purchase.slot}
          outbidName={purchase.outbid?.displayName}
        />
      )}
    </div>
  );
}
