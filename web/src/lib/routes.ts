import type { Composition, CompositionKind, CompositionLine } from "../types";
import { COMPOSITION_LINE_SECTION_LABELS } from "../types";
import { transliterateBol } from "./transliteration";

const KIND_ALIASES: Record<string, CompositionKind> = {
  taal: "taal",
  taals: "taal",
  kayda: "kayda",
  kaydas: "kayda",
  peshkar: "peshkar",
  peshkars: "peshkar",
  prakaar: "prakaar",
  prakaars: "prakaar",
  prakar: "prakaar",
  prakars: "prakaar",
  rela: "rela",
  relas: "rela",
  tukda: "tukda",
  tukdas: "tukda",
  tukada: "tukda",
  tukadas: "tukda",
  chakradar: "chakradar",
  chakradars: "chakradar",
  other: "other",
};

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function pathSegments(pathname: string): string[] {
  return pathname
    .split("/")
    .map((segment) => safeDecode(segment.trim()))
    .filter(Boolean);
}

export function parseKindSegment(
  segment: string | null | undefined,
): CompositionKind | undefined {
  if (!segment) return undefined;
  return KIND_ALIASES[segment.toLowerCase()];
}

export function slugifySegment(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Mark}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "composition";
}

function bolSlugPart(devanagari: string): string {
  const english = transliterateBol(devanagari).replace(/\s+/g, "");
  return english.replace(/[^\p{Letter}\p{Mark}\p{Number}]+/gu, "");
}

export function openingBolSlug(composition: Composition): string {
  const bolParts = composition.lines
    .flatMap((line) => line.cells)
    .map((cell) => cell.devanagari.trim())
    .filter(Boolean)
    .map(bolSlugPart)
    .filter(Boolean)
    .slice(0, 8);

  if (bolParts.length > 0) return bolParts.join("-");

  return slugifySegment(
    composition.title || composition.titleDevanagari || "composition",
  );
}

export function buildBrowsePath(
  taalId: string,
  kind: CompositionKind | "all",
): string {
  if (taalId === "all" && kind === "all") return "/";
  if (taalId === "all") return `/?kind=${kind}`;
  if (kind === "all") return `/${encodeURIComponent(taalId)}`;
  return `/${encodeURIComponent(taalId)}/${kind}`;
}

export function buildCompositionPath(composition: Composition): string {
  return `/${encodeURIComponent(composition.taalId)}/${composition.kind}/${encodeURIComponent(openingBolSlug(composition))}/${encodeURIComponent(composition.id)}`;
}

export function compositionIdFromSlug(segment: string): string | undefined {
  const decoded = safeDecode(segment);
  const separatorIndex = decoded.lastIndexOf("--");
  if (separatorIndex >= 0) return decoded.slice(separatorIndex + 2);
  if (decoded.startsWith("comp-")) return decoded;
  return undefined;
}

function lineSectionLabel(line: CompositionLine): string {
  return line.section
    ? (line.sectionTitle?.trim() || COMPOSITION_LINE_SECTION_LABELS[line.section])
    : "";
}

export function sectionAnchorId(label: string, occurrence = 1): string {
  const slug = slugifySegment(label);
  return occurrence > 1 ? `${slug}-${occurrence}` : slug;
}

export function compositionLineSectionAnchors(lines: CompositionLine[]): string[] {
  const seen = new Map<string, number>();

  return lines.map((line, index) => {
    const label = lineSectionLabel(line);
    const previousLabel = index > 0 ? lineSectionLabel(lines[index - 1]) : "";
    if (!label || label === previousLabel) return "";

    const occurrence = (seen.get(label) ?? 0) + 1;
    seen.set(label, occurrence);
    return sectionAnchorId(label, occurrence);
  });
}

export function compositionSectionLinks(
  lines: CompositionLine[],
): { id: string; label: string }[] {
  const anchors = compositionLineSectionAnchors(lines);
  return anchors.flatMap((id, index) => {
    if (!id) return [];
    return [{ id, label: lineSectionLabel(lines[index]) }];
  });
}
