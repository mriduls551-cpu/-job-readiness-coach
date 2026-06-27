export function DashboardSkeleton() {
  return (
    <main className="section-shell">
      <div className="container-main space-y-5 animate-pulse">
        <section className="workspace-hero">
          <div className="grid gap-5 xl:grid-cols-[1.25fr,0.75fr]">
            <div className="space-y-5">
              <div>
                <div className="h-3 w-32 rounded-full bg-slate-200" />
                <div className="mt-4 h-10 w-3/4 rounded-2xl bg-slate-200" />
                <div className="mt-2 h-10 w-1/2 rounded-2xl bg-slate-200" />
                <div className="mt-4 h-4 w-full max-w-lg rounded-full bg-slate-100" />
                <div className="mt-2 h-4 w-2/3 max-w-sm rounded-full bg-slate-100" />
                <div className="mt-5 flex gap-2">
                  <div className="h-6 w-20 rounded-full bg-slate-200" />
                  <div className="h-6 w-24 rounded-full bg-slate-200" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <div className="metric-tile p-4" key={i}>
                    <div className="flex items-center justify-between">
                      <div className="h-3 w-20 rounded-full bg-slate-200" />
                      <div className="h-7 w-7 rounded-full bg-slate-200" />
                    </div>
                    <div className="mt-3 h-8 w-16 rounded-xl bg-slate-200" />
                    <div className="mt-2 h-3 w-28 rounded-full bg-slate-100" />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="route-shell h-52 bg-white/90" />
              <div className="route-shell h-36 bg-white/90" />
            </div>
          </div>
        </section>
        <section className="grid gap-5 xl:grid-cols-[1.05fr,0.95fr]">
          <div className="route-shell h-64 bg-white/90" />
          <div className="route-shell h-64 bg-white/90" />
        </section>
      </div>
    </main>
  );
}
