import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Composition, DisplayMode } from "../types";
import { COMPOSITION_KIND_LABELS } from "../types";
import { getTaal } from "../data/taals";
import { groupCellsByVibhag, markerSymbol } from "../lib/annotations";
import { PracticeAudioCue } from "../lib/practiceAudio";
import {
  beatDurationMs,
  buildPracticeSequence,
  clampPracticeBpm,
  DEFAULT_CUE_BEATS,
  formatCyclesPerMinute,
  formatDurationSeconds,
  MAX_PRACTICE_BPM,
  MIN_PRACTICE_BPM,
  PRACTICE_BPM_PRESETS,
  resolvePracticeTimeline,
  type PracticeTimelineSnapshot,
} from "../lib/practicePlayback";
import {
  loadPracticeBpm,
  loadPracticeSoundEnabled,
  savePracticeBpm,
  savePracticeSoundEnabled,
} from "../lib/storage";
import { transliterateBol } from "../lib/transliteration";
import { PauseIcon, PlayIcon, RestartIcon, VolumeIcon } from "./icons";

interface CompositionPlayViewProps {
  composition: Composition;
  displayMode: DisplayMode;
  onExit: () => void;
}

type SessionState = "setup" | "running" | "paused" | "completed";

function markerBadgeLabel(
  marker: "sam" | "khali" | "taali" | undefined,
  taaliNumber?: number,
): string {
  if (marker === "sam") return "× Sam";
  if (marker === "khali") return "० Khali";
  if (marker === "taali") return `${taaliNumber ?? 2} Taali`;
  return "";
}

export function CompositionPlayView({
  composition,
  displayMode,
  onExit,
}: CompositionPlayViewProps) {
  const taal = getTaal(composition.taalId);
  const sequence = useMemo(
    () => buildPracticeSequence(composition, taal),
    [composition, taal],
  );

  const [bpm, setBpm] = useState<number>(loadPracticeBpm);
  const [bpmInput, setBpmInput] = useState<string>(() =>
    String(loadPracticeBpm()),
  );
  const [soundEnabled, setSoundEnabled] = useState<boolean>(
    loadPracticeSoundEnabled,
  );
  const [loopEnabled, setLoopEnabled] = useState<boolean>(false);
  const [sessionState, setSessionState] = useState<SessionState>("setup");
  const [elapsedBeatsWithCue, setElapsedBeatsWithCue] = useState<number>(0);

  const anchorBeatsRef = useRef<number>(0);
  const anchorTimeMsRef = useRef<number>(0);
  const lastTriggeredKeyRef = useRef<string>("");
  const audioRef = useRef<PracticeAudioCue | null>(null);
  const lineRefs = useRef<Record<number, HTMLElement | null>>({});
  const activeCellRef = useRef<HTMLDivElement | null>(null);

  const applyBpm = useCallback(
    (nextBpm: number) => {
      const clamped = clampPracticeBpm(nextBpm);
      if (sessionState === "running") {
        const now = performance.now();
        const currentBeatMs = beatDurationMs(bpm);
        const currentBeats =
          anchorBeatsRef.current + (now - anchorTimeMsRef.current) / currentBeatMs;
        anchorBeatsRef.current = currentBeats;
        anchorTimeMsRef.current = now;
      }
      setBpm(clamped);
      setBpmInput(String(clamped));
      savePracticeBpm(clamped);
    },
    [bpm, sessionState],
  );

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      savePracticeSoundEnabled(next);
      return next;
    });
  }, []);

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new PracticeAudioCue();
    }
    return audioRef.current;
  }, []);

  useEffect(() => {
    return () => {
      audioRef.current?.dispose();
      audioRef.current = null;
    };
  }, []);

  const [startOffsetBeat, setStartOffsetBeat] = useState<number>(0);

  const beginSession = useCallback(
    (offsetBeat = 0, withCue = true, overrideBpm?: number) => {
      const committedBpm = clampPracticeBpm(
        overrideBpm ?? (Number(bpmInput) || bpm),
      );
      setBpm(committedBpm);
      setBpmInput(String(committedBpm));
      savePracticeBpm(committedBpm);

      setStartOffsetBeat(withCue ? offsetBeat : 0);
      const startBeats = withCue ? 0 : DEFAULT_CUE_BEATS + offsetBeat;
      anchorBeatsRef.current = startBeats;
      anchorTimeMsRef.current = performance.now();
      lastTriggeredKeyRef.current = "";
      setElapsedBeatsWithCue(startBeats);
      setSessionState("running");

      if (soundEnabled) {
        const audio = ensureAudio();
        if (withCue) {
          audio.playCueCount(DEFAULT_CUE_BEATS);
          lastTriggeredKeyRef.current = `cue-${DEFAULT_CUE_BEATS}`;
        } else if (taal && sequence.totalBeats > 0) {
          const snap = resolvePracticeTimeline({
            elapsedMs: startBeats * beatDurationMs(committedBpm),
            bpm: committedBpm,
            cueBeats: DEFAULT_CUE_BEATS,
            sequence,
            taal,
            loop: loopEnabled,
          });
          if (snap.phase === "playing") {
            audio.playMatraBeat(snap.position.cell.marker);
            lastTriggeredKeyRef.current = `play-${snap.loopIteration}-${snap.globalBeatIndex}`;
          }
        }
      }
    },
    [bpm, bpmInput, ensureAudio, loopEnabled, sequence, soundEnabled, taal],
  );

  const pauseSession = useCallback(() => {
    if (sessionState !== "running") return;
    const now = performance.now();
    const currentBeats =
      anchorBeatsRef.current +
      (now - anchorTimeMsRef.current) / beatDurationMs(bpm);
    anchorBeatsRef.current = currentBeats;
    setElapsedBeatsWithCue(currentBeats);
    setSessionState("paused");
  }, [bpm, sessionState]);

  const resumeSession = useCallback(() => {
    if (sessionState !== "paused") return;
    anchorTimeMsRef.current = performance.now();
    setSessionState("running");
  }, [sessionState]);

  // Effective sequence timeline accounting for optional section start offset after cue
  const timeline: PracticeTimelineSnapshot | null = useMemo(() => {
    if (!taal) return null;
    if (sessionState === "setup") return null;

    const beatMs = beatDurationMs(bpm);
    const adjustedBeats =
      elapsedBeatsWithCue < DEFAULT_CUE_BEATS
        ? elapsedBeatsWithCue
        : elapsedBeatsWithCue + startOffsetBeat;

    return resolvePracticeTimeline({
      elapsedMs: adjustedBeats * beatMs,
      bpm,
      cueBeats: DEFAULT_CUE_BEATS,
      sequence,
      taal,
      loop: loopEnabled,
    });
  }, [
    bpm,
    elapsedBeatsWithCue,
    loopEnabled,
    sequence,
    sessionState,
    startOffsetBeat,
    taal,
  ]);

  // High-precision animation / timer loop while running
  useEffect(() => {
    if (sessionState !== "running" || !taal) return;

    let frameId = 0;
    let intervalId = 0;

    const tick = () => {
      const now = performance.now();
      const beatMs = beatDurationMs(bpm);
      const nextBeats =
        anchorBeatsRef.current + (now - anchorTimeMsRef.current) / beatMs;

      const adjustedBeats =
        nextBeats < DEFAULT_CUE_BEATS
          ? nextBeats
          : nextBeats + startOffsetBeat;

      const snap = resolvePracticeTimeline({
        elapsedMs: adjustedBeats * beatMs,
        bpm,
        cueBeats: DEFAULT_CUE_BEATS,
        sequence,
        taal,
        loop: loopEnabled,
      });

      if (soundEnabled) {
        if (snap.phase === "cue") {
          const key = `cue-${snap.cueNumber}`;
          if (lastTriggeredKeyRef.current !== key) {
            lastTriggeredKeyRef.current = key;
            ensureAudio().playCueCount(snap.cueNumber);
          }
        } else if (snap.phase === "playing") {
          const key = `play-${snap.loopIteration}-${snap.globalBeatIndex}`;
          if (lastTriggeredKeyRef.current !== key) {
            lastTriggeredKeyRef.current = key;
            ensureAudio().playMatraBeat(snap.position.cell.marker);
          }
        }
      }

      setElapsedBeatsWithCue(nextBeats);

      if (snap.phase === "completed") {
        setSessionState("completed");
        return;
      }
    };

    const onAnimationFrame = () => {
      tick();
      frameId = window.requestAnimationFrame(onAnimationFrame);
    };

    frameId = window.requestAnimationFrame(onAnimationFrame);
    // Backup interval in case tab RAF throttles slightly
    intervalId = window.setInterval(tick, 40);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearInterval(intervalId);
    };
  }, [
    bpm,
    ensureAudio,
    loopEnabled,
    sequence,
    sessionState,
    soundEnabled,
    startOffsetBeat,
    taal,
  ]);

  const activeLineIndex =
    timeline?.phase === "playing"
      ? timeline.position.lineSequenceIndex
      : timeline?.phase === "cue"
        ? (sequence.lines.find(
            (l) => startOffsetBeat >= l.startBeat && startOffsetBeat < l.endBeat,
          )?.sequenceIndex ?? 0)
        : -1;

  const activeGlobalBeat =
    timeline?.phase === "playing" ? timeline.globalBeatIndex : -1;

  // Smoothly keep the active lyric section centered as the composition progresses
  useEffect(() => {
    if (sessionState !== "running" || activeLineIndex < 0) return;
    const lineEl = lineRefs.current[activeLineIndex];
    if (!lineEl) return;
    lineEl.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [activeLineIndex, sessionState]);

  // For long multi-cycle lines, keep the active matra cell visible if it scrolls vertically
  useEffect(() => {
    if (sessionState !== "running" || activeGlobalBeat < 0) return;
    const activeLine = sequence.lines[activeLineIndex];
    if (!activeLine || activeLine.cells.length <= (taal?.matras ?? 16) * 2) {
      return;
    }
    activeCellRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [activeGlobalBeat, activeLineIndex, sequence.lines, sessionState, taal]);

  // Keyboard shortcuts: Space to start / pause / resume, Escape to exit
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      const isInteractive =
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT" ||
        tagName === "BUTTON" ||
        tagName === "A";

      if (event.key === "Escape") {
        event.preventDefault();
        onExit();
        return;
      }

      if (event.code === "Space" && !isInteractive) {
        event.preventDefault();
        if (sessionState === "setup" || sessionState === "completed") {
          beginSession(0, true);
        } else if (sessionState === "running") {
          pauseSession();
        } else if (sessionState === "paused") {
          resumeSession();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [beginSession, onExit, pauseSession, resumeSession, sessionState]);

  if (!taal) {
    return (
      <p className="text-center text-maroon">
        Unknown taal: {composition.taalId}
      </p>
    );
  }

  const cyclesPerMinText = formatCyclesPerMinute(bpm, taal.matras);
  const singleCycleDurationText = formatDurationSeconds(taal.matras, bpm);
  const totalDurationText = formatDurationSeconds(sequence.totalBeats, bpm);

  const progressPercent =
    timeline?.phase === "playing" && sequence.totalBeats > 0
      ? Math.min(
          100,
          ((timeline.globalBeatIndex + timeline.beatProgress) /
            sequence.totalBeats) *
            100,
        )
      : sessionState === "completed"
        ? 100
        : 0;

  return (
    <article className="mx-auto w-full max-w-4xl min-w-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onExit}
          className="text-sm font-medium text-maroon-light hover:text-maroon hover:underline"
        >
          ← Back to composition
        </button>

        <span className="rounded-full border border-saffron/40 bg-saffron/15 px-3 py-0.5 text-xs font-semibold tracking-wide text-maroon uppercase">
          Play / Practise Mode
        </span>
      </div>

      <header className="mb-5 text-center">
        <p className="text-xs font-medium tracking-widest text-saffron-dark uppercase">
          {COMPOSITION_KIND_LABELS[composition.kind]} · {taal.nameDevanagari} (
          {taal.name} · {taal.matras} matras)
        </p>
        {composition.titleDevanagari && (
          <h1 className="font-devanagari mt-1.5 text-2xl font-bold text-ink sm:text-3xl">
            {composition.titleDevanagari}
          </h1>
        )}
        <h2
          className={`text-lg text-ink/80 ${composition.titleDevanagari ? "mt-0.5" : "mt-1.5 text-2xl font-bold"}`}
        >
          {composition.title}
        </h2>
      </header>

      {/* Seamless BPM Setup Card (shown first before session starts) */}
      {sessionState === "setup" && (
        <section
          aria-label="Set practice tempo"
          className="mb-6 rounded-xl border border-parchment-dark border-t-4 border-t-raga bg-white/95 p-4 shadow-md sm:p-6"
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              beginSession(0, true);
            }}
            className="space-y-4"
          >
            <div className="text-center">
              <h3 className="text-base font-bold text-ink sm:text-lg">
                Set Your Practice Speed (BPM)
              </h3>
              <p className="mt-1 text-xs text-ink/65 sm:text-sm">
                <strong>{bpm} beats/min</strong> ={" "}
                <strong>{cyclesPerMinText}</strong> {taal.name} cycle
                {cyclesPerMinText === "1" ? "" : "s"}/min ({singleCycleDurationText}{" "}
                per {taal.matras}-matra cycle)
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => applyBpm(bpm - 8)}
                className="rounded-lg border border-parchment-dark bg-parchment px-3 py-2 text-sm font-semibold text-maroon transition hover:border-saffron hover:bg-saffron/15"
                aria-label="Decrease BPM by 8"
              >
                −8
              </button>
              <button
                type="button"
                onClick={() => applyBpm(bpm - 1)}
                className="rounded-lg border border-parchment-dark bg-parchment px-3 py-2 text-sm font-semibold text-maroon transition hover:border-saffron hover:bg-saffron/15"
                aria-label="Decrease BPM by 1"
              >
                −1
              </button>

              <div className="flex items-baseline gap-1.5 rounded-xl border-2 border-raga/30 bg-parchment/70 px-4 py-2">
                <input
                  type="number"
                  min={MIN_PRACTICE_BPM}
                  max={MAX_PRACTICE_BPM}
                  value={bpmInput}
                  aria-label="Practice BPM"
                  onChange={(e) => {
                    const raw = e.target.value;
                    setBpmInput(raw);
                    const parsed = Number(raw);
                    if (
                      raw.trim() !== "" &&
                      Number.isFinite(parsed) &&
                      parsed >= MIN_PRACTICE_BPM &&
                      parsed <= MAX_PRACTICE_BPM
                    ) {
                      const rounded = Math.round(parsed);
                      setBpm(rounded);
                      savePracticeBpm(rounded);
                    }
                  }}
                  onBlur={() => {
                    const parsed = Number(bpmInput);
                    applyBpm(Number.isFinite(parsed) && bpmInput !== "" ? parsed : bpm);
                  }}
                  className="w-20 bg-transparent text-center text-3xl font-bold text-ink tabular-nums focus:outline-none"
                />
                <span className="text-xs font-semibold tracking-wider text-ink/55 uppercase">
                  BPM
                </span>
              </div>

              <button
                type="button"
                onClick={() => applyBpm(bpm + 1)}
                className="rounded-lg border border-parchment-dark bg-parchment px-3 py-2 text-sm font-semibold text-maroon transition hover:border-saffron hover:bg-saffron/15"
                aria-label="Increase BPM by 1"
              >
                +1
              </button>
              <button
                type="button"
                onClick={() => applyBpm(bpm + 8)}
                className="rounded-lg border border-parchment-dark bg-parchment px-3 py-2 text-sm font-semibold text-maroon transition hover:border-saffron hover:bg-saffron/15"
                aria-label="Increase BPM by 8"
              >
                +8
              </button>
            </div>

            <div className="mx-auto max-w-md px-2">
              <input
                type="range"
                min={40}
                max={240}
                step={1}
                value={Math.min(240, Math.max(40, bpm))}
                aria-label="BPM slider"
                onChange={(e) => applyBpm(Number(e.target.value))}
                className="w-full accent-raga"
              />
            </div>

            <div className="flex flex-wrap justify-center gap-1.5">
              {PRACTICE_BPM_PRESETS.map((preset) => {
                const isSelected = bpm === preset.bpm;
                return (
                  <button
                    key={preset.bpm}
                    type="button"
                    onClick={() => applyBpm(preset.bpm)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      isSelected
                        ? "bg-raga text-parchment shadow-sm"
                        : "border border-parchment-dark bg-parchment text-ink/75 hover:border-saffron hover:text-maroon"
                    }`}
                  >
                    {preset.bpm} BPM · {preset.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-1 text-xs">
              <button
                type="button"
                onClick={toggleSound}
                aria-pressed={soundEnabled}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-medium transition ${
                  soundEnabled
                    ? "border-raga/30 bg-raga/10 text-raga"
                    : "border-parchment-dark bg-white text-ink/55"
                }`}
              >
                <VolumeIcon muted={!soundEnabled} className="h-3.5 w-3.5" />
                {soundEnabled ? "Beat audio cue: On" : "Beat audio cue: Off"}
              </button>

              <button
                type="button"
                onClick={() => setLoopEnabled((v) => !v)}
                aria-pressed={loopEnabled}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-medium transition ${
                  loopEnabled
                    ? "border-maroon/35 bg-saffron/20 text-maroon"
                    : "border-parchment-dark bg-white text-ink/60"
                }`}
              >
                {loopEnabled ? "Loop composition: On" : "Play start to end (1×)"}
              </button>
            </div>

            <div className="pt-2 text-center">
              <button
                type="submit"
                disabled={sequence.totalBeats === 0}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-raga px-7 py-3 text-base font-semibold text-parchment shadow-md transition hover:bg-maroon disabled:cursor-not-allowed disabled:opacity-40"
              >
                <PlayIcon className="h-5 w-5" />
                Start Practise
              </button>
              <p className="mt-2 text-xs text-ink/50">
                Starts with a {DEFAULT_CUE_BEATS}-beat countdown cue at {bpm} BPM ·{" "}
                {sequence.lines.length} section
                {sequence.lines.length === 1 ? "" : "s"} · {sequence.totalBeats}{" "}
                matras ({totalDurationText})
              </p>
            </div>
          </form>
        </section>
      )}

      {/* Sticky Live Transport & Tempo HUD during Cue / Playing / Paused / Completed */}
      {sessionState !== "setup" && (
        <section
          aria-label="Practice playback controls"
          className="sticky top-16 z-10 mb-5 rounded-xl border border-parchment-dark bg-white/95 p-3 shadow-md backdrop-blur sm:p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {sessionState === "running" ? (
                <button
                  type="button"
                  onClick={pauseSession}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-maroon px-3.5 py-2 text-sm font-semibold text-parchment shadow-sm transition hover:bg-maroon-light"
                >
                  <PauseIcon className="h-4 w-4" />
                  Pause
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (sessionState === "paused") {
                      resumeSession();
                    } else {
                      beginSession(0, true);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-raga px-3.5 py-2 text-sm font-semibold text-parchment shadow-sm transition hover:bg-maroon"
                >
                  <PlayIcon className="h-4 w-4" />
                  {sessionState === "paused" ? "Resume" : "Play Again"}
                </button>
              )}

              <button
                type="button"
                onClick={() => beginSession(0, true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-parchment-dark bg-parchment px-3 py-2 text-xs font-semibold text-maroon transition hover:border-saffron"
                title="Restart from beginning with countdown cue"
              >
                <RestartIcon className="h-3.5 w-3.5" />
                Restart
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <div className="inline-flex items-center rounded-lg border border-parchment-dark bg-parchment px-1.5 py-1 text-xs font-semibold text-ink">
                <button
                  type="button"
                  onClick={() => applyBpm(bpm - 4)}
                  className="px-1.5 py-0.5 text-maroon hover:text-raga"
                  aria-label="Slower BPM"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => {
                    pauseSession();
                    setSessionState("setup");
                  }}
                  className="px-2 py-0.5 tabular-nums hover:underline"
                  title="Change BPM"
                >
                  {bpm} BPM
                </button>
                <button
                  type="button"
                  onClick={() => applyBpm(bpm + 4)}
                  className="px-1.5 py-0.5 text-maroon hover:text-raga"
                  aria-label="Faster BPM"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={() => setLoopEnabled((v) => !v)}
                aria-pressed={loopEnabled}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                  loopEnabled
                    ? "border-maroon/35 bg-saffron/25 text-maroon"
                    : "border-parchment-dark bg-white text-ink/65 hover:border-saffron"
                }`}
              >
                {loopEnabled ? "Loop: On" : "Loop: Off"}
              </button>

              <button
                type="button"
                onClick={toggleSound}
                aria-pressed={soundEnabled}
                aria-label={soundEnabled ? "Mute beat audio" : "Unmute beat audio"}
                className={`inline-flex items-center justify-center rounded-lg border p-2 transition ${
                  soundEnabled
                    ? "border-raga/30 bg-raga/10 text-raga"
                    : "border-parchment-dark bg-white text-ink/45"
                }`}
              >
                <VolumeIcon muted={!soundEnabled} className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-parchment-dark">
            <div
              className="h-full rounded-full bg-raga transition-[width] duration-75"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Countdown Cue Stage */}
          {timeline?.phase === "cue" && (
            <div
              data-testid="practice-cue"
              role="status"
              aria-live="polite"
              className="mt-3 rounded-xl border-2 border-saffron bg-parchment/90 px-4 py-4 text-center"
            >
              <p className="text-xs font-semibold tracking-widest text-maroon uppercase">
                Get Ready · Starting on Sam (×) at {bpm} BPM
              </p>
              <div className="mt-2 flex items-center justify-center gap-3">
                {Array.from({ length: timeline.cueTotalBeats }, (_, idx) => {
                  const num = timeline.cueTotalBeats - idx;
                  const isCurrent = num === timeline.cueNumber;
                  const isPassed = num > timeline.cueNumber;
                  return (
                    <span
                      key={num}
                      data-testid={
                        isCurrent ? "practice-cue-active-number" : undefined
                      }
                      className={`inline-flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold tabular-nums transition-all sm:h-14 sm:w-14 sm:text-2xl ${
                        isCurrent
                          ? "scale-110 bg-maroon text-parchment shadow-md ring-4 ring-saffron/50"
                          : isPassed
                            ? "bg-parchment-dark text-ink/35"
                            : "border border-parchment-dark bg-white text-ink/60"
                      }`}
                    >
                      {num}
                    </span>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-ink/65">
                Up first:{" "}
                <strong className="text-maroon">
                  {sequence.lines[activeLineIndex]?.label ?? "Line 1"}
                </strong>
              </p>
            </div>
          )}

          {/* Live Beat / Bol Spotlight during active play or pause */}
          {timeline?.phase === "playing" && (
            <div
              data-testid="practice-live-status"
              className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-saffron/40 bg-parchment/75 px-3 py-2.5 sm:px-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-saffron/25 px-2.5 py-0.5 font-semibold text-maroon uppercase">
                    {timeline.position.line.label}
                  </span>
                  <span className="text-ink/60 tabular-nums">
                    Section {timeline.position.lineSequenceIndex + 1} of{" "}
                    {sequence.lines.length}
                  </span>
                  {timeline.loopIteration > 0 && (
                    <span className="rounded-full bg-raga/10 px-2 py-0.5 font-medium text-raga">
                      Round {timeline.loopIteration + 1}
                    </span>
                  )}
                  {sessionState === "paused" && (
                    <span className="rounded-full bg-maroon/15 px-2 py-0.5 font-semibold text-maroon">
                      Paused
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-ink/65 tabular-nums">
                  Matra{" "}
                  <strong className="text-ink">
                    {timeline.position.matraInLine}
                  </strong>{" "}
                  of {timeline.position.line.cells.length}
                  {timeline.position.totalCyclesInLine > 1 && (
                    <>
                      {" "}
                      · Cycle {timeline.position.cycleInLine}/
                      {timeline.position.totalCyclesInLine} (Beat{" "}
                      {timeline.position.matraInCycle}/{taal.matras})
                    </>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {timeline.position.cell.marker && (
                  <span className="font-devanagari rounded-md border border-maroon/25 bg-white px-2.5 py-1 text-xs font-bold text-maroon">
                    {markerBadgeLabel(
                      timeline.position.cell.marker,
                      timeline.position.cell.taaliNumber,
                    )}
                  </span>
                )}
                <div className="rounded-lg bg-maroon px-3.5 py-1.5 text-center text-parchment shadow-sm">
                  {(displayMode === "both" || displayMode === "devanagari") && (
                    <span className="font-devanagari block text-xl leading-tight font-bold">
                      {timeline.position.cell.devanagari || "—"}
                    </span>
                  )}
                  {(displayMode === "both" || displayMode === "latin") && (
                    <span className="block text-xs leading-tight text-parchment/85">
                      {transliterateBol(timeline.position.cell.devanagari) ||
                        (timeline.position.cell.devanagari ? "?" : "—")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Completed Banner */}
          {sessionState === "completed" && (
            <div
              data-testid="practice-completed"
              role="status"
              className="mt-3 rounded-xl border border-raga/30 bg-parchment/90 p-4 text-center"
            >
              <p className="text-sm font-bold text-raga sm:text-base">
                Practise Session Complete
              </p>
              <p className="mt-1 text-xs text-ink/65">
                Played {sequence.lines.length} section
                {sequence.lines.length === 1 ? "" : "s"} ({sequence.totalBeats}{" "}
                matras) at {bpm} BPM ({cyclesPerMinText} cycles/min).
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => beginSession(0, true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-raga px-4 py-2 text-xs font-semibold text-parchment shadow-sm hover:bg-maroon"
                >
                  <PlayIcon className="h-3.5 w-3.5" />
                  Practise Again ({bpm} BPM)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const faster = clampPracticeBpm(bpm + 8);
                    beginSession(0, true, faster);
                  }}
                  className="rounded-lg border border-maroon/30 bg-white px-3.5 py-2 text-xs font-semibold text-maroon hover:bg-maroon hover:text-parchment"
                >
                  Step Up Speed ({clampPracticeBpm(bpm + 8)} BPM)
                </button>
                <button
                  type="button"
                  onClick={() => setSessionState("setup")}
                  className="rounded-lg border border-parchment-dark bg-white px-3.5 py-2 text-xs font-medium text-ink/75 hover:border-saffron"
                >
                  Change BPM
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Lyrics-Style Continuous Composition Flow (Main Kayda -> Prakaars -> Tihai) */}
      <div
        data-testid="practice-lyrics-flow"
        className="space-y-4 pb-16"
      >
        {sequence.lines.map((lineItem) => {
          const isActiveLine = lineItem.sequenceIndex === activeLineIndex;
          const isPastLine =
            sessionState === "completed" ||
            (activeLineIndex >= 0 &&
              timeline?.phase === "playing" &&
              lineItem.sequenceIndex < activeLineIndex);
          const isUpNextLine =
            activeLineIndex >= 0 &&
            timeline?.phase === "playing" &&
            lineItem.sequenceIndex === activeLineIndex + 1;

          const activeCellInThisLine =
            timeline?.phase === "playing" && isActiveLine
              ? timeline.position.cellIndex
              : -1;

          return (
            <section
              key={`${lineItem.sourceLineIndex}-${lineItem.sequenceIndex}`}
              ref={(el) => {
                lineRefs.current[lineItem.sequenceIndex] = el;
              }}
              data-testid={`practice-line-${lineItem.sequenceIndex}`}
              data-active={isActiveLine ? "true" : "false"}
              className={`scroll-mt-44 max-w-full overflow-x-auto rounded-xl border p-3 transition-all duration-200 sm:p-5 ${
                isActiveLine
                  ? "border-saffron border-l-4 border-l-maroon bg-white shadow-lg ring-2 ring-saffron/45"
                  : isUpNextLine
                    ? "border-saffron/40 bg-white/90 shadow-sm"
                    : isPastLine
                      ? "border-parchment-dark/70 bg-white/55 opacity-60 hover:opacity-90"
                      : "border-parchment-dark bg-white/85 shadow-sm"
              }`}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold tracking-wide uppercase ${
                      isActiveLine
                        ? "bg-maroon text-parchment"
                        : "bg-saffron/15 text-maroon"
                    }`}
                  >
                    {lineItem.label}
                  </span>

                  {isActiveLine && timeline?.phase === "cue" && (
                    <span className="rounded-full bg-saffron/25 px-2.5 py-0.5 text-[11px] font-semibold text-maroon">
                      Starting next
                    </span>
                  )}
                  {isActiveLine && timeline?.phase === "playing" && (
                    <span className="rounded-full bg-raga/12 px-2.5 py-0.5 text-[11px] font-semibold text-raga">
                      Playing now
                    </span>
                  )}
                  {isUpNextLine && (
                    <span className="rounded-full bg-saffron/20 px-2.5 py-0.5 text-[11px] font-medium text-maroon-light">
                      Up next
                    </span>
                  )}
                  {isPastLine && (
                    <span className="text-[11px] font-medium text-ink/45">
                      Played
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-ink/45 tabular-nums">
                    {lineItem.cells.length} matras
                  </span>
                  <button
                    type="button"
                    onClick={() => beginSession(lineItem.startBeat, true)}
                    className="rounded-md border border-parchment-dark bg-parchment/80 px-2.5 py-1 text-[11px] font-semibold text-maroon transition hover:border-saffron hover:bg-saffron/15"
                  >
                    Play from here
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-y-2.5">
                {groupCellsByVibhag(lineItem.cells, taal).map((group) => (
                  <div
                    key={group.startIndex}
                    className={`flex w-max shrink-0 flex-nowrap justify-center ${
                      !group.isLast
                        ? "mr-1 border-r-2 border-saffron/35 pr-1 sm:mr-2 sm:pr-2"
                        : ""
                    }`}
                  >
                    {group.cells.map((cell, offset) => {
                      const cellIndex = group.startIndex + offset;
                      const isCurrentBeat = cellIndex === activeCellInThisLine;
                      const isPlayedBeatInLine =
                        isActiveLine &&
                        activeCellInThisLine >= 0 &&
                        cellIndex < activeCellInThisLine;
                      const latin = transliterateBol(cell.devanagari);
                      const showDev =
                        displayMode === "both" || displayMode === "devanagari";
                      const showLatin =
                        displayMode === "both" || displayMode === "latin";
                      const marker = markerSymbol(
                        cell.marker,
                        cell.taaliNumber,
                      );
                      const bolLength = cell.devanagari.trim().length;
                      const devanagariSize =
                        bolLength > 10
                          ? "text-base leading-tight sm:text-lg"
                          : bolLength > 7
                            ? "text-lg leading-tight sm:text-xl"
                            : "text-xl leading-tight sm:text-2xl";

                      return (
                        <div
                          key={cellIndex}
                          ref={isCurrentBeat ? activeCellRef : undefined}
                          data-testid={
                            isCurrentBeat ? "practice-active-matra" : undefined
                          }
                          className={`flex shrink-0 flex-col items-center rounded-lg px-1 py-1 text-center transition-colors duration-100 w-max min-w-[3.9rem] sm:min-w-[4.75rem] md:min-w-[5.4rem] ${
                            isCurrentBeat
                              ? "bg-maroon text-parchment shadow-md ring-2 ring-saffron"
                              : isPlayedBeatInLine
                                ? "bg-saffron/12 text-ink/65"
                                : ""
                          }`}
                        >
                          <span
                            className={`mb-0.5 text-[11px] tabular-nums ${
                              isCurrentBeat
                                ? "font-bold text-saffron"
                                : "text-ink/35"
                            }`}
                          >
                            {cellIndex + 1}
                          </span>
                          {showDev && (
                            <span
                              className={`font-devanagari whitespace-nowrap font-bold ${devanagariSize} ${
                                isCurrentBeat ? "text-parchment" : "text-ink"
                              }`}
                            >
                              {cell.devanagari || "—"}
                            </span>
                          )}
                          {showLatin && (
                            <span
                              className={`whitespace-nowrap text-center tracking-tight text-[11px] leading-tight sm:text-xs ${
                                showDev ? "mt-0.5" : "text-base font-medium"
                              } ${
                                isCurrentBeat
                                  ? "text-parchment/90"
                                  : "text-maroon-light"
                              }`}
                            >
                              {latin || (cell.devanagari ? "?" : "")}
                            </span>
                          )}
                          <span
                            className={`font-devanagari mt-1 h-5 text-sm leading-none font-semibold whitespace-nowrap ${
                              marker ? "opacity-100" : "opacity-0"
                            } ${
                              isCurrentBeat ? "text-saffron" : "text-maroon"
                            }`}
                            aria-hidden={!marker}
                          >
                            {marker || "·"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </article>
  );
}
