import { expect, test, type Page } from "@playwright/test";
import type { Composition, CompositionLineSection, MatraCell } from "../src/types";

const STORAGE_KEY = "tablavahi-compositions";
const TEST_CLIPBOARD_KEY = "tablavahi-test-clipboard";
const now = "2026-06-30T00:00:00.000Z";

const viewports = [
  { name: "desktop", size: { width: 1280, height: 900 } },
  { name: "mobile", size: { width: 390, height: 844 } },
] as const;

function cells(count: number): MatraCell[] {
  const bols = [
    "धा",
    "तिरकिट",
    "धागेतिरकिट",
    "तिरकिटधागे",
    "नगधिगिन",
    "धातिरकिटधा",
  ];

  return Array.from({ length: count }, (_, index) => ({
    devanagari: bols[index % bols.length],
  }));
}

function line(
  count: number,
  section: CompositionLineSection,
  sectionTitle?: string,
) {
  return {
    section,
    sectionTitle,
    cells: cells(count),
  };
}

const layoutCompositions: Composition[] = [
  {
    id: "layout-teentaal-chakradar",
    taalId: "teentaal",
    kind: "chakradar",
    title: "Teen Taal Chakradar Stress",
    titleDevanagari: "तीनताल चक्रदार तपासणी",
    lines: [
      line(192, "tihai", "Chakradar Tihai"),
      line(192, "tihai", "Chakradar Tihai"),
    ],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "layout-ektaal-kayda",
    taalId: "ektaal",
    kind: "kayda",
    title: "Ek Taal Kayda Layout",
    titleDevanagari: "एक ताल कायदा मांडणी",
    lines: [
      line(48, "kayda", "Main Kayda"),
      line(48, "prakaar", "Prakar 1"),
    ],
    createdAt: now,
    updatedAt: now,
  },
];

async function seedCompositions(page: Page) {
  await page.addInitScript(({ key, clipboardKey, compositions }) => {
    localStorage.setItem(key, JSON.stringify(compositions));
    localStorage.setItem("tablavahi-user-quick-insert-bols", "[]");
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          localStorage.setItem(clipboardKey, value);
        },
      },
    });
  }, {
    key: STORAGE_KEY,
    clipboardKey: TEST_CLIPBOARD_KEY,
    compositions: layoutCompositions,
  });
}

async function expectNoPageOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const width = Math.max(
      document.body.scrollWidth,
      document.documentElement.scrollWidth,
    );
    return width - window.innerWidth;
  });

  expect(overflow).toBeLessThanOrEqual(2);
}

for (const viewport of viewports) {
  test.describe(`layout at ${viewport.name}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(viewport.size);
      await seedCompositions(page);
    });

    test("browse cards stay readable and show taal-specific markers", async ({
      page,
    }) => {
      await page.goto("/");

      await expect(
        page.getByRole("heading", { name: "तबल्याची वही" }),
      ).toBeVisible();

      const teentaalCard = page
        .locator("li")
        .filter({ hasText: "Teen Taal Chakradar Stress" });
      const ektaalCard = page
        .locator("li")
        .filter({ hasText: "Ek Taal Kayda Layout" });

      await expect(teentaalCard).toContainText("× 2 ० 3");
      await expect(ektaalCard).toContainText("× ० 2 ० 3 4");
      await expect(ektaalCard).toContainText("48 max matras");
      await expectNoPageOverflow(page);
    });

    test("composition view separates repeated chakradar lines and copy works", async ({
      page,
    }) => {
      await page.goto("/");
      const teentaalCard = page
        .locator("li")
        .filter({ hasText: "Teen Taal Chakradar Stress" });

      await teentaalCard.getByRole("button").click();

      await expect(page.getByText("Chakradar Tihai 1").first()).toBeVisible();
      await expect(page.getByText("Chakradar Tihai 2").first()).toBeVisible();
      await expect(page.getByRole("button", { name: "Copy full text" })).toBeVisible();

      await page.getByRole("button", { name: "Copy full text" }).click();
      await expect(page.getByText("Copied full composition.")).toBeVisible();
      await expect
        .poll(() => page.evaluate((key) => localStorage.getItem(key), TEST_CLIPBOARD_KEY))
        .toContain("Teen Taal Chakradar Stress");
      await expectNoPageOverflow(page);
    });

    test("editor supports 192-matra Teentaal lines without page overflow", async ({
      page,
    }) => {
      await page.goto("/new");

      const lengthSelect = page
        .locator("label")
        .filter({ hasText: "Length" })
        .locator("select")
        .first();

      await lengthSelect.selectOption("12");

      await expect(lengthSelect).toHaveValue("12");
      await expect(page.locator('input[placeholder="धा"]')).toHaveCount(192);
      await expectNoPageOverflow(page);
    });
  });
}
