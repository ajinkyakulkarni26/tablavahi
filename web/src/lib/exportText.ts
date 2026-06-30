import type { Composition, CompositionKind, CompositionLine, Taal } from "../types";
import { COMPOSITION_KIND_LABELS } from "../types";
import { groupCellsByVibhag } from "./annotations";
import { compositionLineSectionLabels } from "./lineSections";

export interface CompositionTextSection {
  label: string;
  text: string;
}

export function mainSectionLabelForKind(kind: CompositionKind): string {
  if (kind === "chakradar") return "Chakradar Tihai";
  if (kind === "tukda") return "Main Tukda";
  if (kind === "rela") return "Main Rela";
  return "Main Kayda";
}

function formatLineBols(line: CompositionLine, taal: Taal): string {
  return groupCellsByVibhag(line.cells, taal)
    .map((group) =>
      group.cells
        .map((cell) => cell.devanagari.trim())
        .filter(Boolean)
        .join(" "),
    )
    .filter(Boolean)
    .join(" | ");
}

export function buildCompositionTextSections(
  composition: Composition,
  taal: Taal,
): CompositionTextSection[] {
  const mainSectionLabel = mainSectionLabelForKind(composition.kind);
  const sectionLabels = compositionLineSectionLabels(
    composition.lines,
    mainSectionLabel,
  );
  const sections: { label: string; lines: string[] }[] = [];

  composition.lines.forEach((line, index) => {
    const lineText = formatLineBols(line, taal);
    if (!lineText) return;

    const label =
      sectionLabels[index] ||
      (composition.lines.length > 1 ? `Line ${index + 1}` : "Composition");
    const previousSection = sections[sections.length - 1];

    if (previousSection?.label === label) {
      previousSection.lines.push(lineText);
      return;
    }

    sections.push({ label, lines: [lineText] });
  });

  return sections.map((section) => ({
    label: section.label,
    text: `${section.label}\n${section.lines.join("\n")}`,
  }));
}

export function formatCompositionAsText(
  composition: Composition,
  taal: Taal,
): string {
  const heading = [
    composition.titleDevanagari,
    composition.title,
    `${COMPOSITION_KIND_LABELS[composition.kind]} · ${taal.nameDevanagari} (${taal.name})`,
  ].filter(Boolean);
  const sections = buildCompositionTextSections(composition, taal).map(
    (section) => section.text,
  );

  return [...heading, "", ...sections].join("\n").trim();
}
