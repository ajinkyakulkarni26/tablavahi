import { TABLA_DESIGNS } from "../data/tablaDesigns";
import { mr } from "../locale/mr";

interface DesignsAndImagesPanelProps {
  activeDesignId: string;
  onDesignChange: (designId: string) => void;
}

export function DesignsAndImagesPanel({
  activeDesignId,
  onDesignChange,
}: DesignsAndImagesPanelProps) {
  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8 text-center">
        <h1 className="font-devanagari text-3xl font-bold text-ink md:text-4xl">
          {mr.designsTitle}
        </h1>
        <p className="font-devanagari mx-auto mt-2 max-w-lg text-sm text-ink/60">
          {mr.designsIntroNoImages}
        </p>
      </header>

      <section aria-labelledby="designs-heading">
        <h2 id="designs-heading" className="sr-only">
          Tabla designs
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {TABLA_DESIGNS.map((design) => {
            const active = design.id === activeDesignId;
            return (
              <button
                key={design.id}
                type="button"
                onClick={() => onDesignChange(design.id)}
                className={`rounded-xl border p-5 text-left transition hover:shadow-md ${
                  active
                    ? "border-saffron bg-white ring-2 ring-saffron/30"
                    : "border-parchment-dark bg-white/80"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-devanagari text-lg font-bold text-maroon">
                      {design.nameMarathi}
                    </p>
                    <p className="text-sm text-ink/60">{design.name}</p>
                  </div>
                  {active && (
                    <span className="rounded-full bg-maroon px-2 py-0.5 text-[10px] text-parchment">
                      {mr.activeDesign}
                    </span>
                  )}
                </div>
                <p className="font-devanagari mt-3 text-sm leading-relaxed text-ink/70">
                  {design.descriptionMarathi}
                </p>
                <div className="mt-4 flex h-8 gap-1 overflow-hidden rounded-lg" aria-hidden>
                  <div
                    className="flex-1"
                    style={{
                      background:
                        design.themeId === "warm-guru"
                          ? "#f5ebe0"
                          : design.themeId === "minimal"
                            ? "#fff"
                            : design.themeId === "ink-contrast"
                              ? "#f7f7f5"
                              : "#faf6ef",
                    }}
                  />
                  <div
                    className="w-8"
                    style={{
                      background: design.themeId === "minimal" ? "#555" : "#6b2d2d",
                    }}
                  />
                  <div
                    className="w-8"
                    style={{
                      background:
                        design.themeId === "ink-contrast" ? "#b8860b" : "#e8a838",
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
