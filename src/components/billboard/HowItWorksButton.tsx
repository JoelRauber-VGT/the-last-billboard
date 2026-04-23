'use client'

interface HowItWorksButtonProps {
  onClick: () => void
}

export function HowItWorksButton({ onClick }: HowItWorksButtonProps) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2.5 bg-neutral-900 border border-neutral-600 font-mono text-sm text-neutral-400 hover:border-blue-400 hover:text-blue-400 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-400"
    >
      [how it works]
    </button>
  )
}
