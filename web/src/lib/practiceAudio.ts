import type { BeatMarker } from "../types";
import {
  beatDurationMs,
  clampPracticeBpm,
  DEFAULT_CUE_BEATS,
  type PracticeSequence,
} from "./practicePlayback";

type AudioContextConstructor = typeof AudioContext;

function getAudioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as {
    AudioContext?: AudioContextConstructor;
    webkitAudioContext?: AudioContextConstructor;
  };
  return win.AudioContext ?? win.webkitAudioContext ?? null;
}

interface ScheduledVoice {
  beatStep: number;
  startTime: number;
  osc: OscillatorNode;
  gain: GainNode;
}

export interface PracticeSchedulerConfig {
  bpm: number;
  cueBeats?: number;
  startOffsetBeat?: number;
  sequence: PracticeSequence;
  loop: boolean;
  soundEnabled: boolean;
}

const LOOKAHEAD_SEC = 0.25;
const SCHEDULER_INTERVAL_MS = 20;

/**
 * Sample-accurate Web Audio lookahead scheduler synchronized with a
 * monotonic performance.now() visual clock and hardware output-latency
 * compensation so beeps never lag behind matras at high speeds (200-360 BPM).
 */
export class PracticeAudioCue {
  private ctx: AudioContext | null = null;
  private schedulerTimerId: number | null = null;
  private scheduledVoices: ScheduledVoice[] = [];

  private running = false;
  private config: PracticeSchedulerConfig | null = null;

  private anchorBeats = 0;
  private anchorWallMs = 0;
  private pausedBeats = 0;
  private nextStepToSchedule = 0;

  private ensureContext(): AudioContext | null {
    if (this.ctx) {
      if (this.ctx.state === "suspended") {
        void this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }

    const Ctor = getAudioContextConstructor();
    if (!Ctor) return null;

    try {
      this.ctx = new Ctor({ latencyHint: "interactive" });
    } catch {
      try {
        this.ctx = new Ctor();
      } catch {
        return null;
      }
    }

    if (this.ctx.state === "suspended") {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /** Pre-warm the audio pipeline on user gesture so Beat 1 has zero cold-start delay. */
  warmUp(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    } catch {
      // Ignore in restricted environments
    }
  }

  private getOutputLatencySec(ctx: AudioContext): number {
    const base =
      typeof ctx.baseLatency === "number" && Number.isFinite(ctx.baseLatency)
        ? Math.max(0, ctx.baseLatency)
        : 0;
    const out =
      typeof ctx.outputLatency === "number" && Number.isFinite(ctx.outputLatency)
        ? Math.max(0, ctx.outputLatency)
        : 0;
    return Math.min(0.18, base + out);
  }

  start(config: PracticeSchedulerConfig, initialBeats = 0): void {
    this.stopSchedulerLoop();
    this.cancelScheduledVoices(0);

    const safeConfig: PracticeSchedulerConfig = {
      ...config,
      bpm: clampPracticeBpm(config.bpm),
    };
    this.config = safeConfig;
    this.anchorBeats = initialBeats;
    this.pausedBeats = initialBeats;
    this.nextStepToSchedule = Math.max(0, Math.ceil(initialBeats - 1e-6));
    this.running = true;

    const ctx = safeConfig.soundEnabled ? this.ensureContext() : this.ctx;
    const leadInMs =
      safeConfig.soundEnabled && ctx
        ? Math.min(120, Math.round((this.getOutputLatencySec(ctx) + 0.018) * 1000))
        : 0;

    this.anchorWallMs = performance.now() + leadInMs;

    this.pumpLookahead();
    if (typeof window !== "undefined") {
      this.schedulerTimerId = window.setInterval(
        () => this.pumpLookahead(),
        SCHEDULER_INTERVAL_MS,
      );
    }
  }

  pause(): number {
    if (!this.running) return this.pausedBeats;
    const current = this.getElapsedBeats();
    this.pausedBeats = current;
    this.running = false;
    this.stopSchedulerLoop();
    this.cancelScheduledVoices(0);
    return current;
  }

  resume(): void {
    if (this.running || !this.config) return;
    this.start(this.config, this.pausedBeats);
  }

  stop(): void {
    this.running = false;
    this.stopSchedulerLoop();
    this.cancelScheduledVoices(0);
  }

  updateConfig(patch: Partial<PracticeSchedulerConfig>): void {
    if (!this.config) return;
    const prevBpm = this.config.bpm;
    const prevSound = this.config.soundEnabled;
    const nextBpm =
      patch.bpm !== undefined ? clampPracticeBpm(patch.bpm) : prevBpm;

    const currentBeats = this.running ? this.getElapsedBeats() : this.pausedBeats;
    this.config = {
      ...this.config,
      ...patch,
      bpm: nextBpm,
    };

    if (!this.running) {
      this.pausedBeats = currentBeats;
      return;
    }

    if (nextBpm !== prevBpm) {
      const ctx = this.config.soundEnabled ? this.ensureContext() : this.ctx;
      this.anchorBeats = currentBeats;
      this.anchorWallMs = performance.now();
      this.cancelScheduledVoices(ctx ? ctx.currentTime + 0.004 : 0);
      this.nextStepToSchedule = Math.max(0, Math.ceil(currentBeats));
    }

    if (!this.config.soundEnabled && prevSound) {
      this.cancelScheduledVoices(0);
    } else if (this.config.soundEnabled && !prevSound) {
      this.ensureContext();
      this.nextStepToSchedule = Math.max(0, Math.ceil(currentBeats));
    }

    this.pumpLookahead();
  }

  getElapsedBeats(): number {
    if (!this.config) return 0;
    if (!this.running) return this.pausedBeats;

    const beatMs = beatDurationMs(this.config.bpm);
    const wallDeltaMs = performance.now() - this.anchorWallMs;
    if (wallDeltaMs <= 0) {
      return this.anchorBeats;
    }
    return this.anchorBeats + wallDeltaMs / beatMs;
  }

  private stopSchedulerLoop(): void {
    if (this.schedulerTimerId !== null && typeof window !== "undefined") {
      window.clearInterval(this.schedulerTimerId);
      this.schedulerTimerId = null;
    }
  }

  private cancelScheduledVoices(afterContextTime: number): void {
    const remaining: ScheduledVoice[] = [];
    for (const voice of this.scheduledVoices) {
      if (afterContextTime > 0 && voice.startTime < afterContextTime) {
        remaining.push(voice);
        continue;
      }
      try {
        voice.gain.gain.cancelScheduledValues(0);
        voice.osc.stop(0);
        voice.osc.disconnect();
        voice.gain.disconnect();
      } catch {
        // Ignore already-stopped nodes
      }
    }
    this.scheduledVoices = remaining;
  }

  private pruneFinishedVoices(nowContextTime: number): void {
    if (this.scheduledVoices.length === 0) return;
    this.scheduledVoices = this.scheduledVoices.filter(
      (v) => v.startTime + 0.25 > nowContextTime,
    );
  }

  private pumpLookahead(): void {
    if (!this.running || !this.config || !this.config.soundEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || ctx.state !== "running") return;

    const {
      bpm,
      cueBeats = DEFAULT_CUE_BEATS,
      startOffsetBeat = 0,
      sequence,
      loop,
    } = this.config;

    if (sequence.totalBeats <= 0) return;

    const beatSec = 60 / bpm;
    const beatMs = beatSec * 1000;
    const nowCtx = ctx.currentTime;
    const nowWall = performance.now();
    const outputLatencySec = this.getOutputLatencySec(ctx);

    this.pruneFinishedVoices(nowCtx);

    let guard = 0;
    while (guard < 32) {
      guard += 1;
      const step = this.nextStepToSchedule;
      const stepVisualWallMs =
        this.anchorWallMs + (step - this.anchorBeats) * beatMs;
      const deltaVisualSec = (stepVisualWallMs - nowWall) / 1000;

      // Schedule ahead by outputLatencySec so the sound exits the speakers
      // at the exact instant the visual matra activates on screen.
      const deltaScheduleSec = deltaVisualSec - outputLatencySec;

      if (deltaScheduleSec > LOOKAHEAD_SEC) {
        break;
      }

      if (step >= cueBeats) {
        const playBeat = step - cueBeats + startOffsetBeat;
        if (!loop && playBeat >= sequence.totalBeats) {
          break;
        }
      }

      if (deltaVisualSec >= -0.025) {
        const safeWhen = Math.max(nowCtx + 0.001, nowCtx + deltaScheduleSec);
        if (step < cueBeats) {
          const cueNumber = cueBeats - step;
          this.scheduleCueTone(ctx, safeWhen, step, cueNumber, beatSec);
        } else {
          const playBeat = step - cueBeats + startOffsetBeat;
          const globalBeatIndex = playBeat % sequence.totalBeats;
          const marker = this.findMarkerAtBeat(sequence, globalBeatIndex);
          this.scheduleMatraTone(ctx, safeWhen, step, marker, beatSec);
        }
      }

      this.nextStepToSchedule = step + 1;
    }
  }

  private findMarkerAtBeat(
    sequence: PracticeSequence,
    globalBeatIndex: number,
  ): BeatMarker | undefined {
    for (const line of sequence.lines) {
      if (globalBeatIndex >= line.startBeat && globalBeatIndex < line.endBeat) {
        return line.cells[globalBeatIndex - line.startBeat]?.marker;
      }
    }
    return undefined;
  }

  private scheduleCueTone(
    ctx: AudioContext,
    when: number,
    step: number,
    cueNumber: number,
    beatSec: number,
  ): void {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const isFinalCue = cueNumber === 1;
      const duration = Math.min(0.075, beatSec * 0.55);
      const attack = 0.0015;

      osc.type = "triangle";
      osc.frequency.setValueAtTime(isFinalCue ? 1046.5 : 830.61, when);
      osc.frequency.exponentialRampToValueAtTime(
        isFinalCue ? 698.46 : 554.37,
        when + duration,
      );

      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.linearRampToValueAtTime(
        isFinalCue ? 0.25 : 0.19,
        when + attack,
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(when);
      osc.stop(when + duration + 0.005);

      this.scheduledVoices.push({ beatStep: step, startTime: when, osc, gain });
    } catch {
      // Ignore audio errors
    }
  }

  private scheduleMatraTone(
    ctx: AudioContext,
    when: number,
    step: number,
    marker: BeatMarker | undefined,
    beatSec: number,
  ): void {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const attack = 0.0015;

      if (marker === "sam") {
        const duration = Math.min(0.13, beatSec * 0.65);
        osc.type = "triangle";
        osc.frequency.setValueAtTime(659.25, when);
        osc.frequency.exponentialRampToValueAtTime(523.25, when + duration);
        gain.gain.setValueAtTime(0.0001, when);
        gain.gain.linearRampToValueAtTime(0.26, when + attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(when);
        osc.stop(when + duration + 0.005);
        this.scheduledVoices.push({ beatStep: step, startTime: when, osc, gain });
        return;
      }

      if (marker === "taali") {
        const duration = Math.min(0.055, beatSec * 0.5);
        osc.type = "triangle";
        osc.frequency.setValueAtTime(740, when);
        osc.frequency.exponentialRampToValueAtTime(587.33, when + duration);
        gain.gain.setValueAtTime(0.0001, when);
        gain.gain.linearRampToValueAtTime(0.16, when + attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(when);
        osc.stop(when + duration + 0.005);
        this.scheduledVoices.push({ beatStep: step, startTime: when, osc, gain });
        return;
      }

      if (marker === "khali") {
        const duration = Math.min(0.048, beatSec * 0.45);
        osc.type = "sine";
        osc.frequency.setValueAtTime(493.88, when);
        gain.gain.setValueAtTime(0.0001, when);
        gain.gain.linearRampToValueAtTime(0.11, when + attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(when);
        osc.stop(when + duration + 0.005);
        this.scheduledVoices.push({ beatStep: step, startTime: when, osc, gain });
        return;
      }

      const duration = Math.min(0.034, beatSec * 0.4);
      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, when);
      osc.frequency.exponentialRampToValueAtTime(392, when + duration);
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.linearRampToValueAtTime(0.075, when + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(when);
      osc.stop(when + duration + 0.005);
      this.scheduledVoices.push({ beatStep: step, startTime: when, osc, gain });
    } catch {
      // Ignore audio errors
    }
  }

  dispose(): void {
    this.stop();
    if (!this.ctx) return;
    const current = this.ctx;
    this.ctx = null;
    void current.close().catch(() => {});
  }
}
