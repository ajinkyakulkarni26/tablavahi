import { describe, expect, it } from "vitest";
import type { Composition } from "../../types";
import { getTaal } from "../../data/taals";
import {
  applyTaalMarkers,
  emptyLine,
  lineCycleOptions,
  taalMarkerSequence,
} from "../annotations";
import { parseBulkCompositionText } from "../bulkImport";
import { neighboringCompositions } from "../compositionNavigation";
import { normalizeComposition } from "../compositionNormalization";
import { buildCompositionTextSections } from "../exportText";
import {
  buildCompositionPath,
  buildCompositionPlayPath,
  compositionRouteKey,
  compositionIdFromSlug,
  findCompositionByRouteId,
  compositionLineSectionAnchors,
  compositionSectionLinks,
  openingBolSlug,
  parseKindSegment,
} from "../routes";
import {
  beatDurationMs,
  buildPracticeSequence,
  cyclesPerMinute,
  formatCyclesPerMinute,
  resolvePracticeTimeline,
} from "../practicePlayback";
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

describe("taal marker sequences", () => {
  it("returns first-cycle marker notation for Teentaal", () => {
    expect(taalMarkerSequence(getTaal("teentaal")!)).toEqual([
      "×",
      "2",
      "०",
      "3",
    ]);
  });

  it("returns first-cycle marker notation for Ektaal", () => {
    expect(taalMarkerSequence(getTaal("ektaal")!)).toEqual([
      "×",
      "०",
      "2",
      "०",
      "3",
      "4",
    ]);
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

  it("uses Prakaar spelling for imported variation sections", () => {
    const teentaal = getTaal("teentaal")!;
    const text = ["Prakaar", "धा धा"].join("\n");

    const result = parseBulkCompositionText(text, teentaal, "kayda");

    expect(result.lines[0]).toMatchObject({
      section: "prakaar",
      sectionTitle: "Prakaar 1",
    });
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

describe("composition navigation", () => {
  function composition(
    id: string,
    title: string,
    taalId = "teentaal",
    kind: Composition["kind"] = "kayda",
  ): Composition {
    return {
      id,
      taalId,
      kind,
      title,
      lines: [{ cells: [{ devanagari: "धा" }] }],
      createdAt: "2026-07-05T00:00:00.000Z",
      updatedAt: "2026-07-05T00:00:00.000Z",
    };
  }

  it("finds previous and next compositions within the same taal and type", () => {
    const active = composition("kayda-2", "Teen Taal Kayda - 2");
    const state = neighboringCompositions(
      [
        composition("kayda-10", "Teen Taal Kayda - 10"),
        composition("rela-1", "Teen Taal Rela - 1", "teentaal", "rela"),
        composition("ektaal-kayda-1", "Ek Taal Kayda - 1", "ektaal"),
        active,
        composition("kayda-1", "Teen Taal Kayda - 1"),
      ],
      active,
    );

    expect(state).toMatchObject({
      previous: { id: "kayda-1" },
      next: { id: "kayda-10" },
      index: 2,
      total: 3,
    });
  });
});

describe("slug and transliteration safety", () => {
  it("parses the corrected Prakaar route spelling", () => {
    expect(parseKindSegment("prakaar")).toBe("prakaar");
    expect(parseKindSegment("prakaars")).toBe("prakaar");
  });

  it("transliterates dependent vowel marks instead of leaking them into URLs", () => {
    expect(transliterateBol("घि")).toBe("Ghi");
  });

  it("keeps GeNa and KeNa joined for single Marathi bols", () => {
    expect(transliterateBol("गेना")).toBe("GeNa");
    expect(transliterateBol("केना")).toBe("KeNa");
    expect(transliterateBol("गेनाधागे")).toBe("GeNaDha Ge");
    expect(transliterateBol("केनाताके")).toBe("KeNaTaKe");
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

  it("adds a readable composition key to bol-based paths so duplicate openings stay unique", () => {
    const base: Composition = {
      id: "comp-1784390900000-aaaaaaa",
      taalId: "teentaal",
      kind: "tukda",
      title: "Teen Taal Tukda 6",
      lines: [
        {
          cells: [
            { devanagari: "धिरधिर" },
            { devanagari: "किटतक" },
          ],
        },
      ],
      createdAt: "2026-07-18T00:00:00.000Z",
      updatedAt: "2026-07-18T00:00:00.000Z",
    };
    const duplicateOpening = {
      ...base,
      id: "comp-1784390978907-lueowtl",
      title: "Teen Taal Tukda 7",
    };

    expect(openingBolSlug(base)).toBe(openingBolSlug(duplicateOpening));
    expect(compositionRouteKey(base)).toBe("comp-tukda-6");
    expect(compositionRouteKey(duplicateOpening)).toBe("comp-tukda-7");
    expect(buildCompositionPath(base)).toBe(
      "/teentaal/tukda/DhiRaDhiRa-KiTaTKa--comp-tukda-6",
    );
    expect(buildCompositionPath(duplicateOpening)).toBe(
      "/teentaal/tukda/DhiRaDhiRa-KiTaTKa--comp-tukda-7",
    );
    expect(compositionIdFromSlug("DhiRaDhiRa-KiTaTKa--comp-tukda-7")).toBe(
      "comp-tukda-7",
    );
    expect(
      findCompositionByRouteId(
        [base, duplicateOpening],
        "comp-tukda-7",
        "teentaal",
        "tukda",
      ),
    ).toMatchObject({ id: "comp-1784390978907-lueowtl" });
  });

  it("uses Marathi title digits when creating readable composition keys", () => {
    const composition: Composition = {
      id: "comp-test",
      taalId: "teentaal",
      kind: "tukda",
      title: "",
      titleDevanagari: "तीनताल तुकडा - ७",
      lines: [{ cells: [{ devanagari: "धा" }] }],
      createdAt: "2026-07-18T00:00:00.000Z",
      updatedAt: "2026-07-18T00:00:00.000Z",
    };

    expect(compositionRouteKey(composition)).toBe("comp-tukda-7");
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

describe("play / practise mode timing and sequence", () => {
  it("computes 6 Teentaal cycles per minute at 96 BPM", () => {
    const teentaal = getTaal("teentaal")!;
    expect(beatDurationMs(96)).toBe(625);
    expect(cyclesPerMinute(96, teentaal.matras)).toBe(6);
    expect(formatCyclesPerMinute(96, teentaal.matras)).toBe("6");
  });

  it("orders a Kayda start-to-end from Main Kayda through Prakaars to Tihai", () => {
    const teentaal = getTaal("teentaal")!;
    const composition: Composition = {
      id: "comp-kayda-play",
      taalId: "teentaal",
      kind: "kayda",
      title: "Teentaal Kayda",
      lines: [
        {
          section: "tihai",
          sectionTitle: "Tihai",
          cells: [{ devanagari: "धा" }, { devanagari: "धा" }],
        },
        {
          section: "kayda",
          sectionTitle: "Main Kayda",
          cells: [{ devanagari: "धा" }, { devanagari: "तिट" }],
        },
        {
          section: "prakaar",
          sectionTitle: "Prakaar 1",
          cells: [{ devanagari: "धा" }, { devanagari: "धिन" }],
        },
        {
          section: "prakaar",
          sectionTitle: "Prakaar 2",
          cells: [{ devanagari: "" }, { devanagari: "" }],
        },
      ],
      createdAt: "2026-11-25T00:00:00.000Z",
      updatedAt: "2026-11-25T00:00:00.000Z",
    };

    const sequence = buildPracticeSequence(composition, teentaal);
    expect(sequence.lines.map((line) => line.label)).toEqual([
      "Main Kayda",
      "Prakaar 1",
      "Tihai",
    ]);
    expect(sequence.totalBeats).toBe(6);
    expect(buildCompositionPlayPath(composition)).toMatch(/\/play$/);
  });

  it("decrements countdown cue numbers at BPM speed and plays through to completion", () => {
    const teentaal = getTaal("teentaal")!;
    const composition: Composition = {
      id: "comp-kayda-cue",
      taalId: "teentaal",
      kind: "kayda",
      title: "Cue Test Kayda",
      lines: [
        {
          section: "kayda",
          sectionTitle: "Main Kayda",
          cells: [{ devanagari: "धा" }, { devanagari: "तिट" }],
        },
        {
          section: "prakaar",
          sectionTitle: "Prakaar 1",
          cells: [{ devanagari: "धिन" }],
        },
        {
          section: "tihai",
          sectionTitle: "Tihai",
          cells: [{ devanagari: "ता" }],
        },
      ],
      createdAt: "2026-11-25T00:00:00.000Z",
      updatedAt: "2026-11-25T00:00:00.000Z",
    };

    const sequence = buildPracticeSequence(composition, teentaal);
    // 96 BPM -> 625ms per beat, 4-beat cue = 2500ms total cue
    expect(
      resolvePracticeTimeline({
        elapsedMs: 10,
        bpm: 96,
        cueBeats: 4,
        sequence,
        taal: teentaal,
      }),
    ).toMatchObject({ phase: "cue", cueNumber: 4 });

    expect(
      resolvePracticeTimeline({
        elapsedMs: 630,
        bpm: 96,
        cueBeats: 4,
        sequence,
        taal: teentaal,
      }),
    ).toMatchObject({ phase: "cue", cueNumber: 3 });

    expect(
      resolvePracticeTimeline({
        elapsedMs: 1260,
        bpm: 96,
        cueBeats: 4,
        sequence,
        taal: teentaal,
      }),
    ).toMatchObject({ phase: "cue", cueNumber: 2 });

    expect(
      resolvePracticeTimeline({
        elapsedMs: 1880,
        bpm: 96,
        cueBeats: 4,
        sequence,
        taal: teentaal,
      }),
    ).toMatchObject({ phase: "cue", cueNumber: 1 });

    // Beat 0 of Main Kayda starts right at 2500ms
    expect(
      resolvePracticeTimeline({
        elapsedMs: 2510,
        bpm: 96,
        cueBeats: 4,
        sequence,
        taal: teentaal,
      }),
    ).toMatchObject({
      phase: "playing",
      globalBeatIndex: 0,
      position: {
        line: { label: "Main Kayda" },
        matraInLine: 1,
        cell: { devanagari: "धा" },
      },
    });

    // Beat 2 -> Prakaar 1 at 2500 + 2 * 625 = 3750ms
    expect(
      resolvePracticeTimeline({
        elapsedMs: 3760,
        bpm: 96,
        cueBeats: 4,
        sequence,
        taal: teentaal,
      }),
    ).toMatchObject({
      phase: "playing",
      globalBeatIndex: 2,
      position: {
        line: { label: "Prakaar 1" },
        matraInLine: 1,
        cell: { devanagari: "धिन" },
      },
    });

    // Beat 3 -> Tihai at 2500 + 3 * 625 = 4375ms
    expect(
      resolvePracticeTimeline({
        elapsedMs: 4380,
        bpm: 96,
        cueBeats: 4,
        sequence,
        taal: teentaal,
      }),
    ).toMatchObject({
      phase: "playing",
      globalBeatIndex: 3,
      position: {
        line: { label: "Tihai" },
        matraInLine: 1,
        cell: { devanagari: "ता" },
      },
    });

    // Completed after 4cue + 4play = 8 * 625 = 5000ms
    expect(
      resolvePracticeTimeline({
        elapsedMs: 5010,
        bpm: 96,
        cueBeats: 4,
        sequence,
        taal: teentaal,
      }),
    ).toEqual({ phase: "completed", totalBeats: 4 });
  });
});
