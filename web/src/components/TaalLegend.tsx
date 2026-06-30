import type { Taal } from "../types";

export function TaalLegend({ taal }: { taal: Taal }) {
  const taaliNumbers = taal.taaliMatras
    .map((_, index) => index + 2)
    .join(", ");

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 rounded-lg border border-parchment-dark bg-white/70 px-3 py-2 text-sm text-ink/75 shadow-sm md:text-base">
      <span className="inline-flex items-center gap-1 rounded-full bg-parchment px-3 py-1">
        <strong className="text-maroon">×</strong> Sam (matra {taal.samMatra})
      </span>
      {taal.taaliMatras.length > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-parchment px-3 py-1">
          <strong className="text-maroon">{taaliNumbers}</strong> Taali (
          {taal.taaliMatras.join(", ")})
        </span>
      )}
      <span className="inline-flex items-center gap-1 rounded-full bg-parchment px-3 py-1">
        <strong className="text-maroon">०</strong> Khali (
        {taal.khaliMatras.length === 1 ? "matra" : "matras"}{" "}
        {taal.khaliMatras.join(", ")})
      </span>
      <span className="inline-flex items-center rounded-full border border-parchment-dark bg-white px-3 py-1 text-ink/55">
        {taal.matras} matras · {taal.vibhag.join(" + ")}
      </span>
    </div>
  );
}
