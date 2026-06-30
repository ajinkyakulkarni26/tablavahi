import type { CompositionLine, DisplayMode, Taal } from "../types";
import { COMPOSITION_LINE_SECTION_LABELS } from "../types";
import { groupCellsByVibhag, markerSymbol } from "../lib/annotations";
import { compositionLineSectionLabels } from "../lib/lineSections";
import { compositionLineSectionAnchors } from "../lib/routes";
import { transliterateBol } from "../lib/transliteration";

interface BolGridProps {
  lines: CompositionLine[];
  taal: Taal;
  displayMode: DisplayMode;
  /** Highlight vibhag boundaries */
  showVibhag?: boolean;
  compact?: boolean;
  mainSectionLabel?: string;
}

export function BolGrid({
  lines,
  taal,
  displayMode,
  showVibhag = true,
  compact = false,
  mainSectionLabel = COMPOSITION_LINE_SECTION_LABELS.kayda,
}: BolGridProps) {
  const sectionAnchorIds = compositionLineSectionAnchors(
    lines,
    mainSectionLabel,
  );
  const sectionLabels = compositionLineSectionLabels(lines, mainSectionLabel);

  return (
    <div className="space-y-3">
      {lines.map((line, lineIndex) => {
        const sectionLabel = sectionLabels[lineIndex];
        const previousSectionLabel =
          lineIndex > 0 ? sectionLabels[lineIndex - 1] : "";
        const showSectionHeader =
          Boolean(sectionLabel) && sectionLabel !== previousSectionLabel;

        return (
          <div key={lineIndex} className="space-y-1.5">
            {showSectionHeader && (
              <div
                id={sectionAnchorIds[lineIndex]}
                className="scroll-mt-24 text-center"
              >
                <span className="rounded-full bg-saffron/15 px-3 py-1 text-xs font-semibold tracking-wide text-maroon uppercase">
                  {sectionLabel}
                </span>
              </div>
            )}
            <div
              className={`flex flex-wrap justify-center gap-0 ${compact ? "gap-y-1" : "gap-y-2"}`}
            >
              {groupCellsByVibhag(line.cells, taal).map((group) => (
                <div
                  key={group.startIndex}
                  className={`
                    flex w-max shrink-0 flex-nowrap justify-center
                    ${showVibhag && !group.isLast ? "mr-1 border-r-2 border-saffron/40 pr-1 sm:mr-2 sm:pr-2" : ""}
                  `}
                >
                  {group.cells.map((cell, offset) => {
                    const cellIndex = group.startIndex + offset;
                    const latin = transliterateBol(cell.devanagari);
                    const showDev =
                      displayMode === "both" || displayMode === "devanagari";
                    const showLatin =
                      displayMode === "both" || displayMode === "latin";
                    const marker = markerSymbol(cell.marker, cell.taaliNumber);
                    const bolLength = cell.devanagari.trim().length;
                    const devanagariSize = compact
                      ? bolLength > 8
                        ? "text-sm leading-tight sm:text-base"
                        : "text-base leading-tight sm:text-lg"
                      : bolLength > 10
                        ? "text-lg leading-tight md:text-xl"
                        : bolLength > 7
                          ? "text-xl leading-tight md:text-[1.35rem]"
                          : "text-xl leading-tight md:text-2xl";

                    return (
                      <div
                        key={cellIndex}
                        className={`
                          flex shrink-0 flex-col items-center text-center
                          ${
                            compact
                              ? "w-max min-w-[2.6rem] px-0.5 sm:min-w-[3rem]"
                              : "w-max min-w-[4.4rem] px-0.5 sm:min-w-[5rem] md:min-w-[5.75rem] md:px-1"
                          }
                        `}
                      >
                        <span className="mb-1 text-[11px] text-ink/35 tabular-nums">
                          {cellIndex + 1}
                        </span>
                        {showDev && (
                          <span
                            className={`
                              font-devanagari whitespace-nowrap font-bold text-ink
                              ${devanagariSize}
                            `}
                          >
                            {cell.devanagari || "—"}
                          </span>
                        )}
                        {showLatin && (
                          <span
                            className={`
                              whitespace-nowrap text-center text-maroon-light tracking-tight
                              ${compact ? "text-[10px] leading-tight" : "text-[11px] leading-tight sm:text-xs"}
                              ${showDev ? "mt-0.5" : "text-base font-medium"}
                            `}
                          >
                            {latin || (cell.devanagari ? "?" : "")}
                          </span>
                        )}
                        <span
                          className={`
                            font-devanagari mt-1 leading-none font-semibold whitespace-nowrap text-maroon
                            ${marker ? "opacity-100" : "opacity-0"}
                            ${compact ? "h-5 text-sm" : "h-6 text-base"}
                          `}
                          aria-hidden={!marker}
                        >
                          {marker || "·"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
