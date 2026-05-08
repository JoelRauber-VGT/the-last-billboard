'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, Trash2 } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'

interface AccountDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void> | void
  isDeleting: boolean
}

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6

function generateCode(): string {
  const buf = new Uint32Array(CODE_LENGTH)
  crypto.getRandomValues(buf)
  let out = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[buf[i] % CODE_ALPHABET.length]
  }
  return out
}

export function AccountDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
}: AccountDeleteDialogProps) {
  const t = useTranslations('settings.privacy.deleteDialog')
  const [code, setCode] = useState('')
  const [typed, setTyped] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setCode(generateCode())
      setTyped('')
      const handle = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(handle)
    }
  }, [open])

  const handleOpenChange = (next: boolean) => {
    if (isDeleting) return
    onOpenChange(next)
  }

  const matches = typed.toUpperCase() === code && code.length > 0
  const canSubmit = matches && !isDeleting

  const consequences = [
    t('consequence.profile'),
    t('consequence.signout'),
    t('consequence.images'),
    t('consequence.slots'),
    t('consequence.history'),
    t('consequence.norefund'),
  ]

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[480px] max-w-[calc(100vw-32px)] p-0 gap-0 bg-term-surface border-term-border-light"
        showCloseButton={false}
        aria-label={t('title')}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-term-faint">
          <span className="font-mono text-sm text-term-danger">
            $ delete-account
          </span>
          <button
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
            className="font-mono text-sm text-term-dim hover:text-term-muted transition-colors disabled:opacity-30"
            aria-label="Close dialog"
          >
            [esc]
          </button>
        </div>

        <div className="px-5 py-5 bg-term-bg font-mono space-y-5">
          <p className="text-term-danger text-sm">
            &gt; {t('warning')}
          </p>

          <div className="space-y-1">
            <p className="text-xs text-term-accent tracking-wide">
              [{t('consequencesLabel')}]
            </p>
            <ul className="space-y-1 text-xs text-term-muted">
              {consequences.map((line, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-term-dim shrink-0">-</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2 pt-1 border-t border-term-faint">
            <p className="text-xs text-term-accent tracking-wide pt-3">
              [{t('confirmLabel')}]
            </p>
            <p className="text-xs text-term-muted">
              &gt; {t('confirmHelp')}
            </p>

            <div
              className="my-2 px-3 py-2 bg-term-surface border border-term-border-light text-center select-all"
              aria-label={t('codeAria')}
            >
              <span className="font-mono text-base text-term-danger tracking-[0.4em]">
                {code}
              </span>
            </div>

            <input
              ref={inputRef}
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value.replace(/\s+/g, ''))}
              disabled={isDeleting}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={CODE_LENGTH + 4}
              placeholder={t('inputPlaceholder')}
              className="w-full bg-term-bg border border-term-border-light text-white px-3 py-2 font-mono text-sm tracking-[0.3em] uppercase focus:outline-none focus:border-term-danger transition-colors disabled:opacity-50"
            />
            {typed.length > 0 && !matches && (
              <p className="text-xs text-term-danger">
                &gt; {t('mismatch')}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              disabled={isDeleting}
              className="px-3 py-1.5 text-xs text-term-muted border border-term-border-light hover:text-white hover:border-term-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              [{t('cancel')}]
            </button>
            <button
              type="button"
              onClick={() => onConfirm()}
              disabled={!canSubmit}
              className="px-3 py-1.5 text-xs text-term-danger border border-term-danger hover:bg-term-danger/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  [{t('deleting')}]
                </>
              ) : (
                <>
                  <Trash2 className="h-3 w-3" />
                  [{t('confirmButton')}]
                </>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
