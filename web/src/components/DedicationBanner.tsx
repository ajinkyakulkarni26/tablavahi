import { mr } from "../locale/mr";

export function DedicationBanner() {
  return (
    <div className="border-b border-saffron/30 bg-gradient-to-r from-maroon/95 via-maroon to-maroon-light/90 px-4 py-4 text-center text-parchment shadow-sm">
      <h1 className="font-devanagari text-xl font-semibold tracking-wide md:text-2xl">
        {mr.appTitle}
      </h1>
      <p className="font-devanagari mt-1 text-sm tracking-wide opacity-90">
        {mr.appSubtitle}
      </p>
      <p className="font-devanagari mt-2 text-xs opacity-80">
        {mr.guruName} — {mr.dedicationMarathi}
      </p>
    </div>
  );
}
