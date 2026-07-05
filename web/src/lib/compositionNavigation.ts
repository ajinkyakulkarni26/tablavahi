import type { Composition } from "../types";

const titleCollator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});

function navigationTitle(composition: Composition): string {
  return composition.title || composition.titleDevanagari || composition.id;
}

export function compareCompositionsForNavigation(
  a: Composition,
  b: Composition,
): number {
  const titleCompare = titleCollator.compare(navigationTitle(a), navigationTitle(b));
  if (titleCompare !== 0) return titleCompare;

  const devanagariCompare = titleCollator.compare(
    a.titleDevanagari ?? "",
    b.titleDevanagari ?? "",
  );
  if (devanagariCompare !== 0) return devanagariCompare;

  return titleCollator.compare(a.id, b.id);
}

export interface CompositionNavigationState {
  previous?: Composition;
  next?: Composition;
  index: number;
  total: number;
}

export function neighboringCompositions(
  compositions: Composition[],
  activeComposition: Composition,
): CompositionNavigationState {
  const siblings = compositions
    .filter(
      (composition) =>
        composition.taalId === activeComposition.taalId &&
        composition.kind === activeComposition.kind,
    )
    .sort(compareCompositionsForNavigation);
  const index = siblings.findIndex(
    (composition) => composition.id === activeComposition.id,
  );

  if (index < 0) {
    return { index: 0, total: siblings.length };
  }

  return {
    previous: index > 0 ? siblings[index - 1] : undefined,
    next: index < siblings.length - 1 ? siblings[index + 1] : undefined,
    index: index + 1,
    total: siblings.length,
  };
}
