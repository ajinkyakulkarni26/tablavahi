import type { CompositionLine, DisplayMode, Taal } from "../types";
import { COMPOSITION_LINE_SECTION_LABELS } from "../types";
import { markerSymbol } from "../lib/annotations";
import { transliterateBol } from "../lib/transliteration";

interface BolGridProps {
  lines: CompositionLine[];
  taal: Taal;
  displayMode: DisplayMode;
  /** Highlight vibhag boundaries */
  showVibhag?: boolean;
  compact?: boolean;
}

export function BolGrid({
  lines,
  taal,
  displayMode,
  showVibhag = true,
  compact = false,
}: BolGridProps) {
  const vibhagEnds = new Set<number>();
  if (showVibhag) {
    let acc = 0;
    for (const size of taal.vibhag) {
      acc += size;
      if (acc < taal.matras) vibhagEnds.add(acc - 1);
    }
  }

  return (
    <div className="space-y-3">
      {lines.map((line, lineIndex) => {
        const sectionLabel = line.section
          ? (line.sectionTitle?.trim() ||
            COMPOSITION_LINE_SECTION_LABELS[line.section])
          : "";
        const previousLine = lines[lineIndex - 1];
        const previousSectionLabel = previousLine?.section
          ? (previousLine.sectionTitle?.trim() ||
            COMPOSITION_LINE_SECTION_LABELS[previousLine.section])
          : "";
        const showSectionHeader =
          Boolean(sectionLabel) && sectionLabel !== previousSectionLabel;

        return (
          <div key={lineIndex} className="space-y-1.5">
            {showSectionHeader && (
              <div className="text-center">
                <span className="rounded-full bg-saffron/15 px-3 py-1 text-xs font-semibold tracking-wide text-maroon uppercase">
                  {sectionLabel}
                </span>
              </div>
            )}
            <div
              className={`flex flex-wrap justify-center gap-0 ${compact ? "gap-y-1" : "gap-y-2"}`}
            >
              {line.cells.map((cell, cellIndex) => {
                const latin = transliterateBol(cell.devanagari);
                const showDev =
                  displayMode === "both" || displayMode === "devanagari";
                const showLatin =
                  displayMode === "both" || displayMode === "latin";
                const marker = markerSymbol(cell.marker, cell.taaliNumber);
                const isVibhagEnd = vibhagEnds.has(cellIndex);

                return (
                  <div
                    key={cellIndex}
                    className={`
                      flex flex-col items-center
                      ${compact ? "min-w-[2.25rem] px-0.5" : "min-w-[2.75rem] px-1"}
                      ${isVibhagEnd ? "mr-2 border-r-2 border-saffron/40 pr-2" : ""}
                    `}
                  >
                    <span
                      className={`
                        font-devanagari leading-none font-semibold text-maroon
                        ${marker ? "opacity-100" : "opacity-0"}
                        ${compact ? "h-5 text-sm" : "h-6 text-base"}
                      `}
                      aria-hidden={!marker}
                    >
                      {marker || "·"}
                    </span>
                    {showDev && (
                      <span
                        className={`
                          font-devanagari font-bold text-ink
                          ${compact ? "text-lg" : "text-xl md:text-2xl"}
                        `}
                      >
                        {cell.devanagari || "—"}
                      </span>
                    )}
                    {showLatin && (
                      <span
                        className={`
                          text-maroon-light tracking-tight
                          ${compact ? "text-[10px]" : "text-xs"}
                          ${showDev ? "mt-0.5" : "text-base font-medium"}
                        `}
                      >
                        {latin || (cell.devanagari ? "?" : "")}
                      </span>
                    )}
                    <span className="mt-1 text-[11px] text-ink/35 tabular-nums">
                      {cellIndex + 1}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
