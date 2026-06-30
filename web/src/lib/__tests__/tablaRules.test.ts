import { describe, expect, it } from "vitest";
import type { Composition } from "../../types";
import { getTaal } from "../../data/taals";
import { applyTaalMarkers, emptyLine, lineCycleOptions } from "../annotations";
import { parseBulkCompositionText } from "../bulkImport";
import { normalizeComposition } from "../compositionNormalization";
import { buildCompositionTextSections } from "../exportText";
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

describe("line cycle options", () => {
  it("allows 12 cycles so Teentaal lines can reach 192 matras", () => {
    const teentaal = getTaal("teentaal")!;
    const options = lineCycleOptions(1);

    expect(options).toContain(12);
    expect(12 * teentaal.matras).toBe(192);
  });

  it("keeps the current cycle count when an existing line is longer", () => {
    expect(lineCycleOptions(15)).toContain(15);
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

  it("imports Chakradar as a section under a Tukda composition", () => {
    const teentaal = getTaal("teentaal")!;
    const tukdaBols = Array.from({ length: 17 }, () => "धा").join(" ");
    const chakradarBols = Array.from({ length: 18 }, () => "तिरकिट").join(" ");
    const text = [
      "Main Tukda",
      tukdaBols,
      "",
      "Chakradar",
      chakradarBols,
    ].join("\n");

    const result = parseBulkCompositionText(text, teentaal, "tukda");

    expect(result.lines).toHaveLength(2);
    expect(result.lines[0]).toMatchObject({
      section: "tukda",
      sectionTitle: "Main Tukda",
    });
    expect(result.lines[0].cells).toHaveLength(32);
    expect(result.lines[1]).toMatchObject({
      section: "chakradar",
      sectionTitle: "Chakradar",
    });
    expect(result.lines[1].cells).toHaveLength(32);
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

  it("creates section anchors for Tukda and Chakradar lines", () => {
    const lines = [
      {
        section: "tukda" as const,
        cells: emptyLine(16),
      },
      {
        section: "chakradar" as const,
        cells: emptyLine(16),
      },
    ];

    expect(compositionLineSectionAnchors(lines, "Main Tukda")).toEqual([
      "main-tukda",
      "chakradar",
    ]);
    expect(compositionSectionLinks(lines, "Main Tukda")).toEqual([
      { id: "main-tukda", label: "Main Tukda" },
      { id: "chakradar", label: "Chakradar" },
    ]);
  });

  it("numbers repeated default Chakradar Tihai lines", () => {
    const lines = [
      {
        section: "tihai" as const,
        sectionTitle: "Chakradar Tihai",
        cells: [{ devanagari: "धा" }],
      },
      {
        section: "tihai" as const,
        sectionTitle: "Chakradar Tihai",
        cells: [{ devanagari: "तिरकिट" }],
      },
    ];

    expect(compositionLineSectionAnchors(lines, "Chakradar Tihai")).toEqual([
      "chakradar-tihai-1",
      "chakradar-tihai-2",
    ]);
    expect(compositionSectionLinks(lines, "Chakradar Tihai")).toEqual([
      { id: "chakradar-tihai-1", label: "Chakradar Tihai 1" },
      { id: "chakradar-tihai-2", label: "Chakradar Tihai 2" },
    ]);
  });

  it("exports repeated Chakradar Tihai lines as separate sections", () => {
    const teentaal = getTaal("teentaal")!;
    const composition: Composition = {
      id: "comp-chakradar",
      taalId: "teentaal",
      kind: "chakradar",
      title: "Teentaal Chakradar",
      lines: [
        {
          section: "tihai",
          sectionTitle: "Chakradar Tihai",
          cells: [{ devanagari: "धा" }],
        },
        {
          section: "tihai",
          sectionTitle: "Chakradar Tihai",
          cells: [{ devanagari: "तिरकिट" }],
        },
      ],
      createdAt: "2026-06-30T00:00:00.000Z",
      updatedAt: "2026-06-30T00:00:00.000Z",
    };

    expect(buildCompositionTextSections(composition, teentaal)).toEqual([
      { label: "Chakradar Tihai 1", text: "Chakradar Tihai 1\nधा" },
      {
        label: "Chakradar Tihai 2",
        text: "Chakradar Tihai 2\nतिरकिट",
      },
    ]);
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
