import type { CompositionLine } from "../types";
import { COMPOSITION_LINE_SECTION_LABELS } from "../types";

const DEFAULT_MAIN_SECTION_TITLES = new Set([
  "Main Kayda",
  "Main Rela",
  "Main Tukda",
  "Chakradar Tihai",
]);

function isDefaultMainSectionTitle(title: string): boolean {
  return DEFAULT_MAIN_SECTION_TITLES.has(title);
}

export function compositionLineSectionBaseLabel(
  line: CompositionLine | undefined,
  mainSectionLabel = COMPOSITION_LINE_SECTION_LABELS.kayda,
): string {
  if (!line?.section) return "";

  const title = line.sectionTitle?.trim();
  if (title) {
    if (
      isDefaultMainSectionTitle(title) &&
      (line.section === "kayda" ||
        line.section === "tukda" ||
        mainSectionLabel === "Chakradar Tihai")
    ) {
      return mainSectionLabel;
    }
    return title;
  }

  if (line.section === "kayda" || line.section === "tukda") {
    return mainSectionLabel;
  }
  if (line.section === "other") return "";
  return COMPOSITION_LINE_SECTION_LABELS[line.section];
}

function shouldNumberChakradarTihaiLine(
  line: CompositionLine,
  label: string,
  mainSectionLabel: string,
): boolean {
  return (
    mainSectionLabel === "Chakradar Tihai" &&
    line.section === "tihai" &&
    label === mainSectionLabel
  );
}

export function compositionLineSectionLabels(
  lines: CompositionLine[],
  mainSectionLabel = COMPOSITION_LINE_SECTION_LABELS.kayda,
): string[] {
  const baseLabels = lines.map((line) =>
    compositionLineSectionBaseLabel(line, mainSectionLabel),
  );
  const numberableCount = lines.filter((line, index) =>
    shouldNumberChakradarTihaiLine(
      line,
      baseLabels[index],
      mainSectionLabel,
    ),
  ).length;

  if (numberableCount <= 1) return baseLabels;

  let chakradarTihaiOccurrence = 0;
  return baseLabels.map((label, index) => {
    if (
      !shouldNumberChakradarTihaiLine(lines[index], label, mainSectionLabel)
    ) {
      return label;
    }

    chakradarTihaiOccurrence += 1;
    return `${label} ${chakradarTihaiOccurrence}`;
  });
}
