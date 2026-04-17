interface OnboardingStepProps {
  title: string
  description: string
}

export function OnboardingStep({ title, description }: OnboardingStepProps) {
  return (
    <div className="text-center">
      <h3 className="text-2xl font-bold mb-3 text-foreground">
        {title}
      </h3>
      <p className="text-lg text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  )
}
