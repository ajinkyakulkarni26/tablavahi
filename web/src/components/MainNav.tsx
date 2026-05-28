import { mr } from "../locale/mr";

export type AppSection = "compositions" | "designs";

interface MainNavProps {
  active: AppSection;
  onChange: (section: AppSection) => void;
}

export function MainNav({ active, onChange }: MainNavProps) {
  return (
    <nav
      className="flex gap-1 rounded-full border border-parchment-dark bg-parchment-dark/50 p-1"
      aria-label="Main navigation"
    >
      <button
        type="button"
        onClick={() => onChange("compositions")}
        className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
          active === "compositions"
            ? "bg-maroon text-parchment shadow-sm"
            : "text-ink/70 hover:bg-white/80"
        }`}
      >
        {mr.navCompositions}
      </button>
      <button
        type="button"
        onClick={() => onChange("designs")}
        className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
          active === "designs"
            ? "bg-maroon text-parchment shadow-sm"
            : "text-ink/70 hover:bg-white/80"
        }`}
      >
        {mr.navDesigns}
      </button>
    </nav>
  );
}
