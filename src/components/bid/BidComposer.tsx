'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { AlertCircle, Upload, X } from 'lucide-react'
import { config } from '@/lib/config'
import { uploadSlotImage } from '@/lib/upload/uploadSlotImage'
import { createBidCheckoutSession } from '@/app/actions/bid'
import { ImagePositioner } from '@/components/bid/ImagePositioner'
import { DEFAULT_FRAMINGS, type Framings } from '@/lib/billboard/framing'

interface SlotInfo {
  id: string
  display_name: string
  current_bid_eur: number
}

interface BidComposerProps {
  userId: string
  outbidSlot: SlotInfo | null
}

type UploadState =
  | { kind: 'idle' }
  | { kind: 'local'; file: File; previewUrl: string }
  | { kind: 'uploading'; file: File; previewUrl: string }
  | { kind: 'uploaded'; file: File; previewUrl: string; remoteUrl: string }

/**
 * Single-screen bid composer. Upload + amount + pan/zoom + pay are all
 * on one surface — no wizard. Desktop ≥ lg: two-column grid that fits
 * the viewport; mobile stacks and may scroll.
 */
export function BidComposer({ userId, outbidSlot }: BidComposerProps) {
  const tForm = useTranslations('bid.form')
  const tValidation = useTranslations('bid.validation')
  const tErrors = useTranslations('bid.errors')

  const minBid = outbidSlot
    ? Math.ceil((outbidSlot.current_bid_eur + 0.01) / 5) * 5
    : 5

  const [bidEur, setBidEur] = useState<number>(minBid)
  const [linkUrl, setLinkUrl] = useState('')
  const [upload, setUpload] = useState<UploadState>({ kind: 'idle' })
  const [framings, setFramings] = useState<Framings>(() => structuredClone(DEFAULT_FRAMINGS))
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Cleanup preview object URL on unmount / replacement.
  useEffect(() => {
    return () => {
      if (upload.kind !== 'idle') URL.revokeObjectURL(upload.previewUrl)
    }
  }, [upload])

  const handleFile = useCallback(
    async (file: File) => {
      setError(null)
      if (file.size > config.maxImageSizeMb * 1024 * 1024) {
        const msg = tValidation('imageTooBig')
        setError(msg)
        toast.error(msg)
        return
      }
      const allowed = config.allowedImageTypes as readonly string[]
      if (!allowed.includes(file.type)) {
        const msg = tValidation('imageInvalidType')
        setError(msg)
        toast.error(msg)
        return
      }

      const previewUrl = URL.createObjectURL(file)
      setUpload({ kind: 'uploading', file, previewUrl })
      setFramings(structuredClone(DEFAULT_FRAMINGS))

      try {
        const remoteUrl = await uploadSlotImage(file, userId)
        setUpload({ kind: 'uploaded', file, previewUrl, remoteUrl })
      } catch (err) {
        console.error('Upload failed:', err)
        const msg = tErrors('uploadFailed')
        setError(msg)
        toast.error(msg)
        URL.revokeObjectURL(previewUrl)
        setUpload({ kind: 'idle' })
      }
    },
    [userId, tValidation, tErrors]
  )

  const handleRemoveImage = () => {
    if (upload.kind !== 'idle') URL.revokeObjectURL(upload.previewUrl)
    setUpload({ kind: 'idle' })
    setFramings(structuredClone(DEFAULT_FRAMINGS))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const bidIsValid =
    Number.isFinite(bidEur) && bidEur >= minBid && bidEur % 5 === 0
  const linkIsValid = /^https:\/\/.+/i.test(linkUrl)
  const imageReady = upload.kind === 'uploaded'

  const canSubmit =
    imageReady && bidIsValid && linkIsValid && !submitting

  const previewUrl = upload.kind === 'idle' ? null : upload.previewUrl
  const remoteUrl = upload.kind === 'uploaded' ? upload.remoteUrl : null

  const handleSubmit = async () => {
    if (!canSubmit || !remoteUrl) return
    setSubmitting(true)
    setError(null)
    try {
      const result = await createBidCheckoutSession({
        image_url: remoteUrl,
        link_url: linkUrl,
        brand_color: '#1a1a1a',
        bid_eur: bidEur,
        framings,
        outbid_slot_id: outbidSlot?.id ?? undefined,
        is_anonymous: isAnonymous,
      })
      if (!result.success || !result.url) {
        const msg = result.error || tErrors('sessionFailed')
        setError(msg)
        toast.error(msg)
        setSubmitting(false)
        return
      }
      window.location.href = result.url
    } catch (err) {
      console.error('Submit error:', err)
      const msg =
        err instanceof Error ? err.message : tErrors('sessionFailed')
      setError(msg)
      toast.error(msg)
      setSubmitting(false)
    }
  }

  return (
    <div className="h-full w-full bg-term-bg text-white font-mono flex flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 lg:px-6 py-2 border-b border-term-border shrink-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-term-accent">$</span>
          <span>bid_composer</span>
          {outbidSlot && (
            <span className="text-term-muted ml-2 hidden sm:inline">
              — outbidding {outbidSlot.display_name} (€
              {outbidSlot.current_bid_eur.toFixed(2)})
            </span>
          )}
        </div>
        <a
          href="/"
          className="text-term-muted hover:text-white text-xs"
          aria-label="cancel and return to billboard"
        >
          [cancel]
        </a>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
        <div className="mx-auto w-full max-w-[1400px] h-full px-4 lg:px-6 py-4 lg:py-5">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(260px,360px)] gap-5 lg:gap-8 h-full lg:items-start">
            {/* LEFT — upload + amount + fields */}
            <div className="flex flex-col gap-4 lg:gap-5">
              {/* Upload */}
              <section className="flex flex-col gap-2">
                <label className="text-xs text-term-accent tracking-wide">
                  [upload]
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={config.allowedImageTypes.join(',')}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFile(f)
                  }}
                  disabled={submitting}
                />
                {previewUrl ? (
                  <div className="relative border border-term-border-light bg-term-surface">
                    <img
                      src={previewUrl}
                      alt=""
                      className="block w-full h-[140px] lg:h-[160px] object-contain bg-term-black"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      disabled={submitting}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/70 hover:bg-black text-white border border-term-border-light flex items-center justify-center transition-colors disabled:opacity-50"
                      aria-label="remove image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-1.5 left-1.5 text-[10px] text-term-muted bg-black/70 px-1.5 py-0.5">
                      {upload.kind === 'uploading'
                        ? 'uploading...'
                        : upload.kind === 'uploaded'
                          ? `[ok] ${upload.file.name}`
                          : upload.kind === 'local'
                            ? upload.file.name
                            : ''}
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={submitting}
                    className="border border-dashed border-term-border-light hover:border-term-accent hover:bg-term-surface/60 transition-colors flex flex-col items-center justify-center gap-1.5 h-[140px] lg:h-[160px] text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload className="w-5 h-5 text-term-muted" />
                    <span className="text-term-text">
                      &gt; drop image or click to browse
                    </span>
                    <span className="text-[10px] text-term-muted">
                      PNG · JPEG · WEBP · max {config.maxImageSizeMb}MB
                    </span>
                  </button>
                )}
              </section>

              {/* Amount */}
              <section className="flex flex-col gap-2">
                <label
                  htmlFor="bid-amount"
                  className="text-xs text-term-accent tracking-wide"
                >
                  [amount]
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-term-muted">
                    €
                  </span>
                  <input
                    id="bid-amount"
                    type="number"
                    inputMode="numeric"
                    step={5}
                    min={minBid}
                    value={Number.isFinite(bidEur) ? bidEur : ''}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value)
                      setBidEur(Number.isFinite(v) ? v : 0)
                    }}
                    disabled={submitting}
                    className="w-full pl-7 pr-3 py-2 bg-term-surface border border-term-border-light text-white text-base focus:outline-none focus:border-term-accent disabled:opacity-50"
                  />
                </div>
                <div className="text-[10px] text-term-muted leading-snug">
                  &gt; min €{minBid} · €5 increments
                  <span className="block">
                    &gt; your block grows with your bid, relative to all others
                  </span>
                </div>
                {!bidIsValid && bidEur > 0 && (
                  <div className="text-[10px] text-term-danger">
                    bid must be ≥ €{minBid} and a multiple of 5
                  </div>
                )}
              </section>

              {/* Identity — name comes from the user's profile, not the bid */}
              <section className="flex flex-col gap-2">
                <label className="text-xs text-term-accent tracking-wide">
                  [identity]
                </label>
                <div className="text-[12px] text-term-muted leading-snug">
                  &gt; {tForm('identityHelp')}
                </div>
                <label className="flex items-start gap-2 cursor-pointer select-none mt-1">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    disabled={submitting}
                    className="mt-0.5 accent-term-accent"
                  />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-xs text-term-text">
                      [anonymous] {tForm('anonymous')}
                    </span>
                    <span className="text-[10px] text-term-muted leading-snug">
                      &gt; {tForm('anonymousHelp')}
                    </span>
                  </span>
                </label>
              </section>

              {/* Link */}
              <section className="flex flex-col gap-2">
                <label
                  htmlFor="bid-link-url"
                  className="text-xs text-term-accent tracking-wide"
                >
                  [link_url]
                </label>
                <input
                  id="bid-link-url"
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  disabled={submitting}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 bg-term-surface border border-term-border-light text-white placeholder:text-term-dim focus:outline-none focus:border-term-accent disabled:opacity-50"
                />
                <div className="text-[10px] text-term-muted">
                  &gt; must start with https://
                </div>
              </section>
            </div>

            {/* RIGHT — positioner + previews */}
            <div className="flex flex-col gap-3 lg:gap-4 lg:h-full lg:min-h-0">
              <label className="text-xs text-term-accent tracking-wide">
                [position]
              </label>
              <p className="text-[11px] text-term-muted leading-snug -mt-1">
                {tForm('cropHint')}
              </p>
              {remoteUrl ? (
                <div className="lg:flex-1 lg:min-h-0 lg:overflow-auto">
                  <ImagePositioner
                    imageUrl={remoteUrl}
                    framings={framings}
                    onFramingsChange={setFramings}
                    disabled={submitting}
                  />
                </div>
              ) : (
                <div className="border border-term-border-light bg-term-surface/40 text-term-muted text-xs flex flex-col items-center justify-center gap-2 h-[220px] lg:h-auto lg:min-h-[300px] lg:flex-1">
                  <span>&gt; upload an image to position it</span>
                  <span className="text-[10px] text-term-dim">
                    pan + zoom previews appear here
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer — pay bar */}
      <div className="border-t border-term-border shrink-0 px-4 lg:px-6 py-3">
        <div className="mx-auto w-full max-w-[1400px] flex flex-col sm:flex-row sm:items-center gap-3">
          {error && (
            <div className="flex items-start gap-2 text-xs text-term-danger border border-term-danger/40 bg-term-danger/10 px-3 py-2 sm:flex-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          <div className="sm:ml-auto flex items-center gap-3">
            <span className="text-xs text-term-muted hidden sm:block">
              {imageReady
                ? canSubmit
                  ? '> ready'
                  : '> complete all fields'
                : upload.kind === 'uploading'
                  ? '> uploading image...'
                  : '> upload image first'}
            </span>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="px-4 py-2 bg-term-accent text-black font-bold tracking-wide hover:bg-term-accent/90 disabled:bg-term-dim disabled:text-term-muted disabled:cursor-not-allowed transition-colors text-sm"
            >
              {submitting
                ? 'redirecting to stripe...'
                : `[pay €${Number.isFinite(bidEur) ? bidEur.toFixed(2) : '0.00'} with stripe →]`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
