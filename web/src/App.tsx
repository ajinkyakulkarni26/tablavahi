import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import type { Composition, CompositionKind, DisplayMode } from "./types";
import { DedicationBanner } from "./components/DedicationBanner";
import { BrowsePanel } from "./components/BrowsePanel";
import { CompositionView } from "./components/CompositionView";
import { CompositionEditor } from "./components/CompositionEditor";
import { CloudSyncPanel } from "./components/CloudSyncPanel";
import { DeveloperContact } from "./components/DeveloperContact";
import { getTaal } from "./data/taals";
import {
  deleteComposition,
  loadCompositions,
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
import {
  buildBrowsePath,
  buildCompositionPath,
  compositionIdFromSlug,
  openingBolSlug,
  parseKindSegment,
  pathSegments,
  slugifySegment,
} from "./lib/routes";
import { normalizeCompositions } from "./lib/compositionNormalization";
import { mr } from "./locale/mr";

type Screen =
  | { name: "browse" }
  | { name: "view"; id: string }
  | { name: "edit"; id?: string }
  | { name: "contact" };

type AppHistoryState = {
  tablaVahiScreen: Screen;
};

const LIBRARY_SCREEN: Screen = { name: "browse" };

type ParsedAppRoute = {
  screen: Screen;
  selectedTaalId: string;
  selectedKind: CompositionKind | "all";
  searchQuery: string;
};

function parseAppRoute(location: Location): ParsedAppRoute {
  const segments = pathSegments(location.pathname);
  const params = new URLSearchParams(location.search);
  const queryKind = parseKindSegment(params.get("kind")) ?? "all";
  const searchQuery = params.get("q") ?? "";

  if (segments[0] === "contact") {
    return {
      screen: { name: "contact" },
      selectedTaalId: "all",
      selectedKind: "all",
      searchQuery,
    };
  }

  if (segments[0] === "new") {
    return {
      screen: { name: "edit" },
      selectedTaalId: "all",
      selectedKind: "all",
      searchQuery,
    };
  }

  const taal = segments[0] ? getTaal(segments[0]) : undefined;
  if (!taal) {
    return {
      screen: LIBRARY_SCREEN,
      selectedTaalId: "all",
      selectedKind: queryKind,
      searchQuery,
    };
  }

  const kind = parseKindSegment(segments[1]) ?? "all";
  const newFormatId =
    segments[3] && segments[3].startsWith("comp-") ? segments[3] : undefined;
  const legacyFormatId = segments[2]
    ? (compositionIdFromSlug(segments[2]) ?? segments[2])
    : undefined;
  const compositionId = newFormatId ?? legacyFormatId;
  const editSegment = newFormatId ? segments[4] : segments[3];

  if (compositionId) {
    return {
      screen:
        editSegment === "edit"
          ? { name: "edit", id: compositionId }
          : { name: "view", id: compositionId },
      selectedTaalId: taal.id,
      selectedKind: kind,
      searchQuery,
    };
  }

  return {
    screen: LIBRARY_SCREEN,
    selectedTaalId: taal.id,
    selectedKind: kind,
    searchQuery,
  };
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
  const initialRoute = useMemo(() => parseAppRoute(window.location), []);
  const cloudConfigured = isCloudConfigured();
  const [compositions, setCompositions] = useState<Composition[]>(loadCompositions);
  const [cloudUser, setCloudUser] = useState<User | null>(null);
  const [screen, setScreen] = useState<Screen>(initialRoute.screen);
  const [selectedTaalId, setSelectedTaalId] = useState(
    initialRoute.selectedTaalId,
  );
  const [selectedKind, setSelectedKind] = useState<CompositionKind | "all">(
    initialRoute.selectedKind,
  );
  const [searchQuery, setSearchQuery] = useState(initialRoute.searchQuery);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("both");
  const [cloudBusy, setCloudBusy] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [cloudStatus, setCloudStatus] = useState(
    cloudConfigured
      ? "Cloud sync is enabled."
      : "Cloud not configured yet. Using browser storage only.",
  );

  const navigateToScreen = useCallback(
    (
      next: Screen,
      mode: "push" | "replace" = "push",
      url = window.location.pathname + window.location.search + window.location.hash,
    ) => {
      setScreen(next);
      const state: AppHistoryState = { tablaVahiScreen: next };
      if (mode === "replace") {
        window.history.replaceState(state, "", url);
      } else {
        window.history.pushState(state, "", url);
      }
    },
    [],
  );

  useEffect(() => {
    const applyCurrentRoute = () => {
      const route = parseAppRoute(window.location);
      setScreen(route.screen);
      setSelectedTaalId(route.selectedTaalId);
      setSelectedKind(route.selectedKind);
      setSearchQuery(route.searchQuery);
    };

    window.history.replaceState(
      { tablaVahiScreen: initialRoute.screen } satisfies AppHistoryState,
      "",
      window.location.href,
    );

    window.addEventListener("popstate", applyCurrentRoute);
    return () => {
      window.removeEventListener("popstate", applyCurrentRoute);
    };
  }, [initialRoute.screen]);

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
    const normalized = normalizeCompositions(next);
    setCompositions(normalized);
    saveCompositions(normalized);
    void syncCompositionsToCloud(normalized);
  }, [syncCompositionsToCloud]);

  const navigateToBrowse = useCallback(
    (
      taalId = "all",
      kind: CompositionKind | "all" = "all",
      mode: "push" | "replace" = "push",
    ) => {
      setSelectedTaalId(taalId);
      setSelectedKind(kind);
      navigateToScreen(LIBRARY_SCREEN, mode, buildBrowsePath(taalId, kind));
    },
    [navigateToScreen],
  );

  const handleBrowseTaalChange = useCallback(
    (taalId: string) => {
      navigateToBrowse(taalId, selectedKind);
    },
    [navigateToBrowse, selectedKind],
  );

  const handleBrowseKindChange = useCallback(
    (kind: CompositionKind | "all") => {
      navigateToBrowse(selectedTaalId, kind);
    },
    [navigateToBrowse, selectedTaalId],
  );

  const activeComposition = useMemo(() => {
    if (screen.name !== "view" && screen.name !== "edit") return undefined;
    const id = screen.name === "edit" ? screen.id : screen.id;
    if (!id) return undefined;
    return compositions.find((c) => {
      if (c.id === id) return true;
      return (
        openingBolSlug(c) === id ||
        slugifySegment(c.title || c.titleDevanagari || "composition") === id
      );
    });
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
    navigateToScreen(
      { name: "view", id: normalized.id },
      "replace",
      buildCompositionPath(normalized),
    );
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
    navigateToBrowse(target?.taalId ?? "all", target?.kind ?? "all", "replace");
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
    <div className="music-page flex min-h-screen flex-col">
      <DedicationBanner />

      <header className="no-print sticky top-0 z-20 border-b border-parchment-dark/80 bg-parchment/90 px-4 py-3 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                navigateToBrowse("all", "all", "replace");
              }}
              className="font-devanagari text-lg font-bold text-maroon hover:text-raga"
            >
              {mr.appTitle}
            </button>
          </div>

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
                    ? "bg-raga text-parchment shadow-sm"
                    : "bg-white text-ink/70 ring-1 ring-parchment-dark hover:bg-saffron/20"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-8">
        {screen.name === "browse" && (
          <>
            <BrowsePanel
              compositions={compositions}
              selectedTaalId={selectedTaalId}
              selectedKind={selectedKind}
              searchQuery={searchQuery}
              onTaalChange={handleBrowseTaalChange}
              onKindChange={handleBrowseKindChange}
              onSearchChange={setSearchQuery}
              onSelect={(c) =>
                navigateToScreen(
                  { name: "view", id: c.id },
                  "push",
                  buildCompositionPath(c),
                )
              }
              onAddNew={() => navigateToScreen({ name: "edit" }, "push", "/new")}
            />
            <div className="mx-auto mt-6 max-w-5xl text-center">
              <button
                type="button"
                onClick={() =>
                  navigateToScreen({ name: "contact" }, "push", "/contact")
                }
                className="text-xs font-medium text-maroon-light hover:text-maroon hover:underline"
              >
                Developer Contact
              </button>
            </div>
          </>
        )}

        {screen.name === "view" && activeComposition && (
          <CompositionView
            composition={activeComposition}
            displayMode={displayMode}
            canEdit={canEditActiveComposition}
            onEdit={() => {
              if (!canEditActiveComposition) return;
              navigateToScreen(
                { name: "edit", id: activeComposition.id },
                "push",
                `${buildCompositionPath(activeComposition)}/edit`,
              );
            }}
            onBack={() =>
              navigateToBrowse(
                activeComposition.taalId,
                activeComposition.kind,
                "replace",
              )
            }
          />
        )}

        {screen.name === "view" && !activeComposition && (
          <p className="text-center text-ink/50">
            {cloudBusy ? "Loading composition..." : "Composition not found."}
          </p>
        )}

        {screen.name === "edit" && (!screen.id || activeComposition) && (
          <CompositionEditor
            initial={screen.id ? activeComposition : undefined}
            onSave={handleSave}
            onCancel={() => {
              if (screen.id && activeComposition) {
                navigateToScreen(
                  { name: "view", id: activeComposition.id },
                  "replace",
                  buildCompositionPath(activeComposition),
                );
                return;
              }
              navigateToBrowse("all", "all", "replace");
            }}
          />
        )}

        {screen.name === "edit" && screen.id && !activeComposition && (
          <p className="text-center text-ink/50">
            {cloudBusy ? "Loading composition..." : "Composition not found."}
          </p>
        )}

        {screen.name === "edit" &&
          screen.id &&
          activeComposition &&
          canEditActiveComposition && (
            <div className="mx-auto mt-4 max-w-5xl text-center">
              <button
                type="button"
                onClick={() => {
                  void handleDelete(activeComposition.id);
                }}
                className="text-xs text-red-700/60 hover:underline"
              >
                Delete this composition
              </button>
            </div>
          )}

        {screen.name === "contact" && (
          <div className="mx-auto max-w-5xl">
            <DeveloperContact />
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => navigateToBrowse("all", "all", "replace")}
                className="rounded-full bg-maroon px-4 py-2 text-sm font-medium text-parchment hover:bg-maroon-light"
              >
                Back to Library
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="no-print border-t border-parchment-dark bg-parchment/80 px-4 py-4 text-center text-xs text-ink/45 backdrop-blur">
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
      </footer>
    </div>
  );
}
