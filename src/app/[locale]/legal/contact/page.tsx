export default function ContactPage() {
  return (
    <div className="w-full bg-term-bg py-12 px-6">
      <div className="max-w-[640px] mx-auto font-mono text-base leading-relaxed space-y-8">

        <section className="space-y-4">
          <h2 className="text-lg text-term-accent">$ contact</h2>

          <div className="space-y-3 text-term-text">
            <p>&gt; for press, partnerships or general inquiries:</p>
            <p className="text-white pl-4">hello@thelastbillboard.com</p>
          </div>

          <div className="space-y-3 text-term-text">
            <p>&gt; for bugs or abuse reports:</p>
            <p className="text-white pl-4">support@thelastbillboard.com</p>
          </div>
        </section>

      </div>
    </div>
  );
}
