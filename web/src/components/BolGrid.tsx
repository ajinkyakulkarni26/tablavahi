import type { CompositionLine, DisplayMode, Taal } from "../types";
import { COMPOSITION_LINE_SECTION_LABELS } from "../types";
import { groupCellsByVibhag, markerSymbol } from "../lib/annotations";
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

function displayLineSectionLabel(
  line: CompositionLine | undefined,
  mainSectionLabel: string,
): string {
  if (!line?.section) return "";
  const title = line.sectionTitle?.trim();
  if (title) {
    const isDefaultMainTitle =
      title === "Main Kayda" ||
      title === "Main Rela" ||
      title === "Chakradar Tihai";
    if (
      isDefaultMainTitle &&
      (line.section === "kayda" || mainSectionLabel === "Chakradar Tihai")
    ) {
      return mainSectionLabel;
    }
    return title;
  }
  if (line.section === "kayda") return mainSectionLabel;
  return COMPOSITION_LINE_SECTION_LABELS[line.section];
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

  return (
    <div className="space-y-3">
      {lines.map((line, lineIndex) => {
        const sectionLabel = displayLineSectionLabel(line, mainSectionLabel);
        const previousLine = lines[lineIndex - 1];
        const previousSectionLabel = displayLineSectionLabel(
          previousLine,
          mainSectionLabel,
        );
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
                    flex shrink-0 flex-nowrap justify-center
                    ${showVibhag && !group.isLast ? "mr-2 border-r-2 border-saffron/40 pr-2" : ""}
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

                    return (
                      <div
                        key={cellIndex}
                        className={`
                          flex shrink-0 flex-col items-center
                          ${compact ? "min-w-[2.25rem] px-0.5" : "min-w-[2.75rem] px-1"}
                        `}
                      >
                        <span className="mb-1 text-[11px] text-ink/35 tabular-nums">
                          {cellIndex + 1}
                        </span>
                        {showDev && (
                          <span
                            className={`
                              font-devanagari font-bold whitespace-nowrap text-ink
                              ${compact ? "text-lg" : "text-xl md:text-2xl"}
                            `}
                          >
                            {cell.devanagari || "—"}
                          </span>
                        )}
                        {showLatin && (
                          <span
                            className={`
                              whitespace-nowrap text-maroon-light tracking-tight
                              ${compact ? "text-[10px]" : "text-xs"}
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
