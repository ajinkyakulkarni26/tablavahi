import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import type { Composition, CompositionKind, DisplayMode } from "./types";
import { DedicationBanner } from "./components/DedicationBanner";
import { BrowsePanel } from "./components/BrowsePanel";
import { CompositionView } from "./components/CompositionView";
import { CompositionEditor } from "./components/CompositionEditor";
import { DesignsAndImagesPanel } from "./components/DesignsAndImagesPanel";
import { CloudSyncPanel } from "./components/CloudSyncPanel";
import { MainNav, type AppSection } from "./components/MainNav";
import {
  deleteComposition,
  loadCompositions,
  resetToSamples,
  saveCompositions,
  upsertComposition,
} from "./lib/storage";
import {
  deleteCompositionFromCloud,
  finalizeGoogleRedirectSignIn,
  isCloudConfigured,
  loadCompositionsFromCloud,
  saveCompositionsToCloud,
  signInWithGoogleAccount,
  signOutCloudAccount,
  subscribeCloudUser,
} from "./lib/cloudPersistence";
import { loadActiveDesignId, saveActiveDesignId } from "./lib/mediaStorage";
import { getTablaDesign } from "./data/tablaDesigns";
import { mr } from "./locale/mr";

type Screen =
  | { name: "browse" }
  | { name: "view"; id: string }
  | { name: "edit"; id?: string };

function applyDesignTheme(designId: string) {
  const design = getTablaDesign(designId);
  document.documentElement.dataset.design = design?.themeId ?? "classic";
}

function formatCloudError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown cloud error";
  const code =
    typeof error === "object" &&
    error != null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : undefined;
  if (code === "auth/configuration-not-found") {
    return "Google sign-in is not enabled in Firebase Authentication for this project. Enable Authentication -> Sign-in method -> Google in Firebase Console.";
  }
  return code ? `${code}: ${message}` : message;
}

export default function App() {
  const cloudConfigured = isCloudConfigured();
  const [compositions, setCompositions] = useState<Composition[]>(loadCompositions);
  const [cloudUser, setCloudUser] = useState<User | null>(null);
  const [activeDesignId, setActiveDesignId] = useState(loadActiveDesignId);
  const [section, setSection] = useState<AppSection>("compositions");
  const [screen, setScreen] = useState<Screen>({ name: "browse" });
  const [selectedTaalId, setSelectedTaalId] = useState("teentaal");
  const [selectedKind, setSelectedKind] = useState<CompositionKind | "all">(
    "kayda",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("both");
  const [cloudBusy, setCloudBusy] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [cloudStatus, setCloudStatus] = useState(
    cloudConfigured
      ? "Cloud sync is enabled."
      : "Cloud not configured yet. Using browser storage only.",
  );

  useEffect(() => {
    applyDesignTheme(activeDesignId);
  }, [activeDesignId]);

  useEffect(() => {
    if (!cloudConfigured) {
      setCloudUser(null);
      return;
    }
    void finalizeGoogleRedirectSignIn().catch((error) => {
      const message =
        error instanceof Error ? error.message : "Unknown cloud error";
      setCloudStatus(`Google sign-in failed: ${message}`);
    });
    const unsub = subscribeCloudUser((user) => {
      setCloudUser(user);
      if (user && !user.isAnonymous) {
        setCloudStatus(`Signed in as ${user.email ?? user.uid}`);
      }
    });
    return () => {
      unsub();
    };
  }, [cloudConfigured]);

  useEffect(() => {
    if (!cloudConfigured) return;

    let cancelled = false;
    const hydrateFromCloud = async () => {
      try {
        setCloudBusy(true);
        setCloudStatus("Connecting to cloud...");
        const cloudCompositions = await loadCompositionsFromCloud();
        if (cancelled) return;

        if (cloudCompositions.length > 0) {
          setCompositions(cloudCompositions);
          saveCompositions(cloudCompositions);
          setCloudStatus(`Loaded ${cloudCompositions.length} compositions from cloud.`);
          setLastSyncAt(new Date().toISOString());
        } else {
          setCloudStatus(
            "Cloud is ready. No cloud compositions found yet; local data is still available.",
          );
        }
        setLastSyncAt(new Date().toISOString());
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : "Unknown cloud error";
        setCloudStatus(`Cloud unavailable: ${message}`);
      } finally {
        if (!cancelled) setCloudBusy(false);
      }
    };

    void hydrateFromCloud();
    return () => {
      cancelled = true;
    };
  }, [cloudConfigured]);

  const syncCompositionsToCloud = useCallback(
    async (next: Composition[]) => {
      if (!cloudConfigured) return;
      try {
        setCloudBusy(true);
        await saveCompositionsToCloud(next);
        setCloudStatus(`Synced ${next.length} compositions to cloud.`);
        setLastSyncAt(new Date().toISOString());
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown cloud error";
        setCloudStatus(`Cloud sync failed: ${message}`);
      } finally {
        setCloudBusy(false);
      }
    },
    [cloudConfigured],
  );

  const persist = useCallback((next: Composition[]) => {
    setCompositions(next);
    saveCompositions(next);
    void syncCompositionsToCloud(next);
  }, [syncCompositionsToCloud]);

  const handleDesignChange = (designId: string) => {
    setActiveDesignId(designId);
    saveActiveDesignId(designId);
  };

  const handleSectionChange = (next: AppSection) => {
    setSection(next);
    if (next === "designs") {
      setScreen({ name: "browse" });
    }
  };

  const activeComposition = useMemo(() => {
    if (screen.name === "browse") return undefined;
    const id = screen.name === "edit" ? screen.id : screen.id;
    if (!id) return undefined;
    return compositions.find((c) => c.id === id);
  }, [screen, compositions]);

  const canEditActiveComposition =
    activeComposition != null &&
    (!activeComposition.ownerUid || activeComposition.ownerUid === cloudUser?.uid);

  const handleSave = (composition: Composition) => {
    const normalized: Composition = {
      ...composition,
      ownerUid: composition.ownerUid ?? cloudUser?.uid,
      ownerDisplayName:
        composition.ownerDisplayName ??
        cloudUser?.displayName ??
        cloudUser?.email ??
        undefined,
    };
    persist(upsertComposition(compositions, normalized));
    setSection("compositions");
    setScreen({ name: "view", id: normalized.id });
  };

  const handleDelete = async (id: string) => {
    const target = compositions.find((c) => c.id === id);
    if (target && target.ownerUid && target.ownerUid !== cloudUser?.uid) {
      setCloudStatus("You can only delete your own compositions.");
      return;
    }
    if (!confirm("Delete this composition permanently?")) return;
    const next = deleteComposition(compositions, id);
    persist(next);
    if (cloudConfigured) {
      try {
        setCloudBusy(true);
        await deleteCompositionFromCloud(id);
        setCloudStatus("Deleted composition from cloud.");
        setLastSyncAt(new Date().toISOString());
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown cloud error";
        setCloudStatus(`Delete failed: ${message}`);
      } finally {
        setCloudBusy(false);
      }
    }
    setScreen({ name: "browse" });
  };

  const handleMigrateNow = async () => {
    if (!cloudConfigured) return;
    try {
      setCloudBusy(true);
      await saveCompositionsToCloud(compositions);
      setCloudStatus(`Migration complete. ${compositions.length} compositions copied.`);
      setLastSyncAt(new Date().toISOString());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown cloud error";
      setCloudStatus(`Migration failed: ${message}`);
    } finally {
      setCloudBusy(false);
    }
  };

  const handleCloudSignIn = async () => {
    try {
      setCloudBusy(true);
      setCloudStatus("Redirecting to Google sign-in...");
      await signInWithGoogleAccount();
    } catch (error) {
      setCloudStatus(`Google sign-in failed: ${formatCloudError(error)}`);
    } finally {
      setCloudBusy(false);
    }
  };

  const handleCloudSignOut = async () => {
    try {
      setCloudBusy(true);
      await signOutCloudAccount();
      setCloudStatus("Signed out from Google account.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown cloud error";
      setCloudStatus(`Sign-out failed: ${message}`);
    } finally {
      setCloudBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <DedicationBanner />

      <header className="border-b border-parchment-dark bg-white/50 px-4 py-3">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSection("compositions");
                setScreen({ name: "browse" });
              }}
              className="font-devanagari text-lg font-bold text-maroon hover:opacity-80"
            >
              {mr.appTitle}
            </button>
            <MainNav active={section} onChange={handleSectionChange} />
          </div>

          {section === "compositions" && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-ink/50">{mr.display}:</span>
              {(
                [
                  ["both", mr.displayBoth],
                  ["devanagari", mr.displayMarathi],
                  ["latin", mr.displayLatin],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDisplayMode(mode)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    displayMode === mode
                      ? "bg-maroon text-parchment"
                      : "bg-parchment-dark text-ink/70 hover:bg-saffron/30"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 py-8">
        {section === "designs" && (
          <DesignsAndImagesPanel
            activeDesignId={activeDesignId}
            onDesignChange={handleDesignChange}
          />
        )}

        {section === "compositions" && screen.name === "browse" && (
          <BrowsePanel
            compositions={compositions}
            selectedTaalId={selectedTaalId}
            selectedKind={selectedKind}
            searchQuery={searchQuery}
            onTaalChange={setSelectedTaalId}
            onKindChange={setSelectedKind}
            onSearchChange={setSearchQuery}
            onSelect={(c) => setScreen({ name: "view", id: c.id })}
            onAddNew={() => setScreen({ name: "edit" })}
          />
        )}

        {section === "compositions" && screen.name === "view" && activeComposition && (
          <CompositionView
            composition={activeComposition}
            displayMode={displayMode}
            canEdit={canEditActiveComposition}
            onEdit={() => {
              if (!canEditActiveComposition) return;
              setScreen({ name: "edit", id: activeComposition.id });
            }}
            onBack={() => setScreen({ name: "browse" })}
          />
        )}

        {section === "compositions" &&
          screen.name === "view" &&
          !activeComposition && (
            <p className="text-center text-ink/50">Composition not found.</p>
          )}

        {section === "compositions" && screen.name === "edit" && (
          <CompositionEditor
            initial={
              screen.id
                ? compositions.find((c) => c.id === screen.id)
                : undefined
            }
            onSave={handleSave}
            onCancel={() =>
              setScreen(
                screen.id
                  ? { name: "view", id: screen.id }
                  : { name: "browse" },
              )
            }
          />
        )}

        {section === "compositions" &&
          screen.name === "edit" &&
          screen.id &&
          activeComposition &&
          canEditActiveComposition && (
            <div className="mx-auto mt-4 max-w-5xl text-center">
              <button
                type="button"
                onClick={() => {
                  void handleDelete(screen.id!);
                }}
                className="text-xs text-red-700/60 hover:underline"
              >
                Delete this composition
              </button>
            </div>
          )}
      </main>

      <footer className="border-t border-parchment-dark bg-white/40 px-4 py-4 text-center text-xs text-ink/45">
        <CloudSyncPanel
          configured={cloudConfigured}
          busy={cloudBusy}
          status={cloudStatus}
          user={cloudUser}
          lastSyncAt={lastSyncAt}
          onSignIn={() => {
            void handleCloudSignIn();
          }}
          onSignOut={() => {
            void handleCloudSignOut();
          }}
          onSyncNow={() => {
            void handleMigrateNow();
          }}
        />
        {!cloudConfigured && (
          <p className="mt-1 text-[11px]">
            Add Firebase env values in `web/.env.local` to enable permanent cloud storage.
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            if (
              confirm(
                "Reset library to sample compositions? Your saved data will be replaced.",
              )
            ) {
              persist(resetToSamples());
            }
          }}
          className="mt-2 text-maroon-light hover:underline"
        >
          Reset to samples
        </button>
      </footer>
    </div>
  );
}
