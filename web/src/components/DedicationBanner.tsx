import { mr } from "../locale/mr";

export function DedicationBanner() {
  return (
    <section className="music-hero relative overflow-hidden border-b border-saffron/35 px-4 py-5 text-parchment shadow-md">
      <div className="rhythm-rule pointer-events-none absolute inset-x-0 bottom-0 h-1 opacity-70" />
      <div className="mx-auto flex max-w-5xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-devanagari text-3xl font-bold tracking-wide md:text-5xl">
            {mr.appTitle}
          </h1>
          <p className="font-devanagari mt-2 text-base text-parchment/85 md:text-lg">
            {mr.appSubtitle}
          </p>
        </div>

        <div className="rounded-lg border border-saffron/25 bg-parchment/10 px-4 py-3 text-left shadow-sm backdrop-blur">
          <p className="font-devanagari text-sm font-semibold text-saffron">
            {mr.guruName}
          </p>
          <p className="font-devanagari mt-1 text-xs text-parchment/75">
            {mr.dedicationMarathi} — {mr.dedicationSubline}
          </p>
        </div>
      </div>
    </section>
  );
}
