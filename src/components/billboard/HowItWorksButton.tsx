'use client'

interface HowItWorksButtonProps {
  onClick: () => void
}

export function HowItWorksButton({ onClick }: HowItWorksButtonProps) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2.5 bg-term-surface border border-term-border-light font-mono text-sm text-term-text hover:border-term-accent hover:text-term-accent transition-colors focus:outline-none focus:ring-1 focus:ring-term-accent"
    >
      [how it works]
    </button>
  )
}
