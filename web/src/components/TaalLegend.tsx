import type { Taal } from "../types";

export function TaalLegend({ taal }: { taal: Taal }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 rounded-lg border border-parchment-dark bg-white/60 px-4 py-2.5 text-base text-ink/80 md:text-lg">
      <span>
        <strong className="text-maroon">×</strong> Sam (matra {taal.samMatra})
      </span>
      {taal.taaliMatras.length > 0 && (
        <span>
          <strong className="text-maroon">2, 3…</strong> Taali (
          {taal.taaliMatras.join(", ")})
        </span>
      )}
      <span>
        <strong className="text-maroon">०</strong> Khali (matra {taal.khaliMatra})
      </span>
      <span className="text-ink/50">|</span>
      <span>{taal.matras} matras · {taal.vibhag.join(" + ")}</span>
    </div>
  );
}
