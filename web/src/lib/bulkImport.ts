import type {
  CompositionKind,
  CompositionLine,
  CompositionLineSection,
  Taal,
} from "../types";
import { applyTaalMarkers, emptyLine } from "./annotations";
import { COMMON_BOLS } from "./transliteration";

export interface BulkImportResult {
  lines: CompositionLine[];
  tokenCount: number;
  unknownBols: string[];
  ignoredLines: string[];
}

type SectionHeading = {
  section: CompositionLineSection;
  title?: string;
};

const QUICK_INSERT_BOLS = new Set(COMMON_BOLS.map((bol) => bol.devanagari));
const STANDALONE_ANNOTATIONS = new Set([
  "×",
  "x",
  "X",
  "०",
  "0",
  "१",
  "1",
  "२",
  "2",
  "३",
  "3",
  "४",
  "4",
]);

function defaultSectionForKind(kind: CompositionKind): CompositionLineSection {
  if (kind === "chakradar") return "tihai";
  if (kind === "tukda") return "tukda";
  return kind === "kayda" || kind === "rela" ? "kayda" : "other";
}

function defaultSectionTitleForKind(kind: CompositionKind): string | undefined {
  if (kind === "kayda") return "Main Kayda";
  if (kind === "rela") return "Main Rela";
  if (kind === "tukda") return "Main Tukda";
  if (kind === "chakradar") return "Chakradar Tihai";
  return undefined;
}

function cleanToken(token: string): string {
  return token
    .trim()
    .replace(/^[,.;:!?()[\]{}"'“”‘’]+|[,.;:!?()[\]{}"'“”‘’]+$/g, "");
}

function tokenizeBolLine(line: string): string[] {
  return line
    .replace(/[|।॥]+/g, " ")
    .split(/\s+/)
    .map(cleanToken)
    .filter(Boolean)
    .filter((token) => !STANDALONE_ANNOTATIONS.has(token));
}

function detectSectionHeading(
  line: string,
  kind: CompositionKind,
): SectionHeading | null {
  const trimmed = line.trim().replace(/[:：]+$/g, "");
  const lower = trimmed.toLowerCase().replace(/\s+/g, " ");

  if (kind === "kayda") {
    if (
      /^(main\s+)?kayda$/.test(lower) ||
      ["कायदा", "मुख्य कायदा", "मूळ कायदा"].includes(trimmed)
    ) {
      return { section: "kayda", title: "Main Kayda" };
    }
  }

  if (kind === "rela") {
    if (
      /^(main\s+)?rela$/.test(lower) ||
      ["रेला", "मुख्य रेला", "मूळ रेला"].includes(trimmed)
    ) {
      return { section: "kayda", title: "Main Rela" };
    }
  }

  if (kind === "tukda") {
    if (
      /^(main\s+)?tukda$/.test(lower) ||
      ["तुकडा", "मुख्य तुकडा", "मूळ तुकडा"].includes(trimmed)
    ) {
      return { section: "tukda", title: "Main Tukda" };
    }

    if (
      /^chakrada{1,2}r(\s+tihai)?(\s+[0-9]+)?$/.test(lower) ||
      ["चक्रदार", "चक्रदार तिहाई", "चक्रदार तिहाइ"].includes(trimmed)
    ) {
      return {
        section: "chakradar",
        title: /\d/.test(lower) ? trimmed : undefined,
      };
    }
  }

  if (/^prakaar(\s+[0-9]+)?$/.test(lower)) {
    return {
      section: "prakaar",
      title: /\d/.test(lower) ? trimmed : undefined,
    };
  }

  if (/^प्रकार\s*[०-९0-9]*$/.test(trimmed)) {
    return {
      section: "prakaar",
      title: /[०-९0-9]/.test(trimmed) ? trimmed : undefined,
    };
  }

  if (/^tihai$/.test(lower) || ["तिहाई", "तिहाइ"].includes(trimmed)) {
    return { section: "tihai", title: "Tihai" };
  }

  if (
    kind === "chakradar" &&
    (/^chakrada{1,2}r(\s+tihai)?$/.test(lower) ||
      ["चक्रदार", "चक्रदार तिहाई", "चक्रदार तिहाइ"].includes(trimmed))
  ) {
    return { section: "tihai", title: "Chakradar Tihai" };
  }

  return null;
}

function findInlineHeading(
  line: string,
  kind: CompositionKind,
): { heading: SectionHeading; rest: string } | null {
  const colonIndex = line.search(/[:：]/);
  if (colonIndex <= 0) return null;

  const heading = detectSectionHeading(line.slice(0, colonIndex), kind);
  if (!heading) return null;

  return {
    heading,
    rest: line.slice(colonIndex + 1).trim(),
  };
}

function createImportedLine(
  tokens: string[],
  taal: Taal,
  section: CompositionLineSection,
  sectionTitle: string | undefined,
): CompositionLine {
  const lineLength =
    Math.max(1, Math.ceil(tokens.length / taal.matras)) * taal.matras;
  const cells = emptyLine(lineLength).map((cell, index) => ({
    ...cell,
    devanagari: tokens[index] ?? "",
  }));
  return {
    cells: applyTaalMarkers(cells, taal),
    section,
    sectionTitle,
  };
}

export function parseBulkCompositionText(
  text: string,
  taal: Taal,
  kind: CompositionKind,
): BulkImportResult {
  const lines: CompositionLine[] = [];
  const unknownBols = new Set<string>();
  const ignoredLines: string[] = [];
  let tokenCount = 0;
  let prakaarCount = 0;
  let chakradarCount = 0;
  let currentSection = defaultSectionForKind(kind);
  let currentSectionTitle = defaultSectionTitleForKind(kind);

  const applyHeading = (heading: SectionHeading) => {
    currentSection = heading.section;
    if (heading.section === "prakaar") {
      prakaarCount += 1;
      currentSectionTitle = heading.title ?? `Prakaar ${prakaarCount}`;
      return;
    }
    if (heading.section === "chakradar") {
      chakradarCount += 1;
      currentSectionTitle =
        heading.title ??
        (chakradarCount === 1 ? "Chakradar" : `Chakradar ${chakradarCount}`);
      return;
    }
    currentSectionTitle = heading.title;
  };

  text.split(/\r?\n/).forEach((rawLine) => {
    const trimmed = rawLine.trim();
    if (!trimmed) return;

    const inlineHeading = findInlineHeading(trimmed, kind);
    let bolText = trimmed;

    if (inlineHeading) {
      applyHeading(inlineHeading.heading);
      bolText = inlineHeading.rest;
      if (!bolText) return;
    } else {
      const heading = detectSectionHeading(trimmed, kind);
      if (heading) {
        applyHeading(heading);
        return;
      }
    }

    const tokens = tokenizeBolLine(bolText);
    if (tokens.length === 0) {
      ignoredLines.push(trimmed);
      return;
    }

    tokenCount += tokens.length;
    tokens.forEach((token) => {
      if (!QUICK_INSERT_BOLS.has(token)) unknownBols.add(token);
    });

    if (
      kind === "chakradar" ||
      kind === "tukda" ||
      currentSection === "kayda" ||
      currentSection === "prakaar" ||
      currentSection === "tihai" ||
      currentSection === "tukda" ||
      currentSection === "chakradar"
    ) {
      lines.push(
        createImportedLine(
          tokens,
          taal,
          currentSection,
          currentSectionTitle,
        ),
      );
      return;
    }

    for (let index = 0; index < tokens.length; index += taal.matras) {
      lines.push(
        createImportedLine(
          tokens.slice(index, index + taal.matras),
          taal,
          currentSection,
          currentSectionTitle,
        ),
      );
    }
  });

  return {
    lines,
    tokenCount,
    unknownBols: [...unknownBols].sort((a, b) => a.localeCompare(b, "mr")),
    ignoredLines,
  };
}
