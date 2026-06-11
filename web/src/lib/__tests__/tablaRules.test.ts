import { describe, expect, it } from "vitest";
import type { Composition } from "../../types";
import { getTaal } from "../../data/taals";
import { applyTaalMarkers, emptyLine } from "../annotations";
import { parseBulkCompositionText } from "../bulkImport";
import { normalizeComposition } from "../compositionNormalization";
import {
  compositionLineSectionAnchors,
  compositionSectionLinks,
  openingBolSlug,
} from "../routes";
import { transliterateBol } from "../transliteration";

describe("taal marker templates", () => {
  it("applies the correct Ektaal markers across repeated cycles", () => {
    const ektaal = getTaal("ektaal");
    expect(ektaal).toBeDefined();

    const cells = applyTaalMarkers(emptyLine(24), ektaal!);

    expect(cells[0]).toMatchObject({ marker: "sam" });
    expect(cells[2]).toMatchObject({ marker: "khali" });
    expect(cells[4]).toMatchObject({ marker: "taali", taaliNumber: 2 });
    expect(cells[6]).toMatchObject({ marker: "khali" });
    expect(cells[8]).toMatchObject({ marker: "taali", taaliNumber: 3 });
    expect(cells[10]).toMatchObject({ marker: "taali", taaliNumber: 4 });

    expect(cells[12]).toMatchObject({ marker: "sam" });
    expect(cells[14]).toMatchObject({ marker: "khali" });
    expect(cells[16]).toMatchObject({ marker: "taali", taaliNumber: 2 });
    expect(cells[18]).toMatchObject({ marker: "khali" });
    expect(cells[20]).toMatchObject({ marker: "taali", taaliNumber: 3 });
    expect(cells[22]).toMatchObject({ marker: "taali", taaliNumber: 4 });
  });
});

describe("bulk import line sizing", () => {
  it("keeps a Tukda pasted line as a multiple of the taal length", () => {
    const ektaal = getTaal("ektaal")!;
    const text = [
      "धा",
      "ति",
      "धा",
      "ति",
      "धा",
      "ति",
      "धा",
      "ति",
      "धा",
      "ति",
      "धा",
      "ति",
      "धा",
    ].join(" ");

    const result = parseBulkCompositionText(text, ektaal, "tukda");

    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].cells).toHaveLength(24);
  });
});

describe("composition labels", () => {
  it("does not create section anchors for plain other lines", () => {
    const lines = [
      {
        section: "other" as const,
        cells: emptyLine(12),
      },
    ];

    expect(compositionLineSectionAnchors(lines)).toEqual([""]);
    expect(compositionSectionLinks(lines)).toEqual([]);
  });
});

describe("slug and transliteration safety", () => {
  it("transliterates dependent vowel marks instead of leaking them into URLs", () => {
    expect(transliterateBol("घि")).toBe("Ghi");
  });

  it("generates ASCII-only opening bol slugs", () => {
    const composition: Composition = {
      id: "comp-test",
      taalId: "ektaal",
      kind: "tukda",
      title: "Ektaal Tukda",
      lines: [
        {
          cells: [
            { devanagari: "धासघिधा नग" },
            { devanagari: "तिरकिटधा तिरा" },
          ],
        },
      ],
      createdAt: "2026-06-11T00:00:00.000Z",
      updatedAt: "2026-06-11T00:00:00.000Z",
    };

    expect(openingBolSlug(composition)).toBe("DhaSaGhiDhaNaGe-TirkitDhaTiRa");
    expect(openingBolSlug(composition)).toMatch(/^[A-Za-z0-9-]+$/);
  });
});

describe("composition normalization", () => {
  it("trims stored bol and note values", () => {
    const composition: Composition = {
      id: "comp-test",
      taalId: "teentaal",
      kind: "kayda",
      title: " Kayda ",
      titleDevanagari: " कायदा ",
      lines: [
        {
          section: "kayda",
          sectionTitle: " Main Kayda ",
          cells: [{ devanagari: " धा " }, { devanagari: " तिरकिट " }],
        },
      ],
      notes: " note ",
      guruNote: " guru ",
      createdAt: "2026-06-11T00:00:00.000Z",
      updatedAt: "2026-06-11T00:00:00.000Z",
    };

    expect(normalizeComposition(composition)).toMatchObject({
      title: "Kayda",
      titleDevanagari: "कायदा",
      notes: "note",
      guruNote: "guru",
      lines: [
        {
          sectionTitle: "Main Kayda",
          cells: [{ devanagari: "धा" }, { devanagari: "तिरकिट" }],
        },
      ],
    });
  });
});
