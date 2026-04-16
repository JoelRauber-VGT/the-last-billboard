import { useTranslations } from 'next-intl';

export default function AboutPage() {
  const t = useTranslations('about');

  return (
    <div className="min-h-[calc(100vh-8rem)] px-4 py-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-8">{t('title')}</h1>
        <div className="prose prose-lg max-w-none">
          <p className="text-lg text-muted-foreground mb-6">{t('content')}</p>

          <div className="mt-12 space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">The Concept</h2>
              <p className="text-muted-foreground">
                The Last Billboard is a digital experiment exploring scarcity, competition,
                and permanence in advertising. Unlike traditional billboards that rotate content
                or exist in multiple locations, there is only one Last Billboard, and it will
                only display once.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">How It Works</h2>
              <p className="text-muted-foreground">
                Advertisers bid for space on a shared canvas. The size of your advertisement
                grows logarithmically with your bid amount, ensuring fairness while rewarding
                higher investments. Other participants can displace your ad by bidding higher,
                creating a dynamic competition until the final countdown ends.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">The Freeze</h2>
              <p className="text-muted-foreground">
                When the countdown reaches zero, the billboard freezes forever. No more changes
                can be made. The final state becomes a permanent digital artifact, preserved as
                a snapshot of this unique moment in advertising history.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">Why This Matters</h2>
              <p className="text-muted-foreground">
                In an age of infinite digital space and ephemeral content, The Last Billboard
                brings back the concept of scarcity and permanence. It asks: what would you say
                if you knew it would be preserved forever? What would you be willing to pay for
                truly lasting visibility?
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
