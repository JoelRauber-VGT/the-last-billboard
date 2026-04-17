'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { OnboardingTreemap } from './OnboardingTreemap'
import { OnboardingStep } from './OnboardingStep'

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const t = useTranslations('landing.onboarding')
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)

  // Reset to step 0 when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0)
    }
  }, [isOpen])

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen])

  const handleClose = () => {
    // Mark as seen in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastbillboard_onboarding_seen', 'true')
    }
    setCurrentStep(0)
    onClose()
  }

  const handleNext = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleStartBidding = () => {
    handleClose()
    router.push('/bid')
  }

  const handleStepClick = (index: number) => {
    setCurrentStep(index)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="sm:max-w-[700px] max-w-[calc(100vw-32px)] p-0 gap-0 bg-[#1a1a1a] border-term-border-light shadow-2xl"
        showCloseButton={false}
        aria-label="How it works"
      >
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-term-faint">
          <span className="font-mono text-base text-term-accent">$ rules</span>
          <button
            onClick={handleClose}
            className="font-mono text-base text-term-dim hover:text-term-muted transition-colors focus:outline-none"
            aria-label="Close dialog"
          >
            [esc]
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 bg-[#0f0f0f]">
          {/* Step Indicators */}
          <div className="flex gap-1.5 mb-5">
            {[0, 1, 2].map((index) => (
              <button
                key={index}
                onClick={() => handleStepClick(index)}
                className="flex-1 h-[2px] rounded-sm transition-colors duration-300"
                style={{
                  backgroundColor: index <= currentStep ? '#60a5fa' : '#333',
                  cursor: 'pointer',
                }}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>

          {/* Animated Treemap */}
          <div className="mb-4">
            <OnboardingTreemap step={currentStep} />
          </div>

          {/* Step Content */}
          <div className="mb-5 font-mono text-lg text-term-text leading-relaxed">
            <OnboardingStep
              title={t(`step${currentStep + 1}.title`)}
              description={t(`step${currentStep + 1}.description`)}
            />
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className="flex-1 px-4 py-3 font-mono text-base border border-term-border-light text-term-text hover:border-term-accent hover:text-term-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none"
            >
              {t('back')}
            </button>

            {currentStep < 2 ? (
              <button
                onClick={handleNext}
                className="flex-1 px-4 py-3 font-mono text-base border border-term-border-light text-term-text hover:border-term-accent hover:text-term-accent transition-colors focus:outline-none"
              >
                {t('next')}
              </button>
            ) : (
              <button
                onClick={handleStartBidding}
                className="flex-1 px-4 py-3 font-mono text-base border border-term-accent text-term-accent hover:bg-term-accent hover:text-term-black transition-colors focus:outline-none"
              >
                {t('startBidding')} →
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-term-faint">
          <p className="font-mono text-base text-term-dim">
            last updated 142d ago
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Hook to manage onboarding modal state
 * Auto-opens on first visit
 */
export function useOnboarding() {
  const [isOpen, setIsOpen] = useState(false)
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || hasChecked) return

    const hasSeenOnboarding = localStorage.getItem('lastbillboard_onboarding_seen')
    if (!hasSeenOnboarding) {
      // Auto-open after a short delay
      setTimeout(() => {
        setIsOpen(true)
      }, 500)
    }
    setHasChecked(true)
  }, [hasChecked])

  const open = () => setIsOpen(true)
  const close = () => setIsOpen(false)

  return { isOpen, open, close }
}
