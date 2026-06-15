'use client';

interface FullPageLoaderProps {
  eyebrow?: string;
  title?: string;
  message?: string;
}

export function FullPageLoader({
  eyebrow = 'Preparing workspace',
  title = 'Just a moment…',
  message = 'We’re loading your saved progress and getting the next step ready.',
}: FullPageLoaderProps) {
  return (
    <main className="section-shell">
      <div className="container-main max-w-2xl">
        <section className="glass-panel border border-white/60 p-8">
          <p className="eyebrow-copy">{eyebrow}</p>
          <h1 className="mt-4 text-4xl leading-tight text-slate-950">{title}</h1>
          <p className="mt-4 text-base leading-8 text-slate-600">{message}</p>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-200/80">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-[#0a5a60]" />
          </div>
        </section>
      </div>
    </main>
  );
}
