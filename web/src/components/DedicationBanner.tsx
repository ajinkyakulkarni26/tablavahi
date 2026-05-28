import { mr } from "../locale/mr";

export function DedicationBanner() {
  return (
    <div className="border-b border-saffron/30 bg-gradient-to-r from-maroon/95 via-maroon to-maroon-light/90 px-4 py-4 text-center text-parchment shadow-sm">
      <p className="font-devanagari text-lg font-semibold tracking-wide md:text-xl">
        {mr.guruName}
      </p>
      <p className="font-devanagari mt-1.5 text-sm tracking-wide opacity-90">
        {mr.dedicationMarathi}
      </p>
      <p className="font-devanagari mt-0.5 text-xs opacity-80">
        {mr.dedicationSubline}
      </p>
    </div>
  );
}
