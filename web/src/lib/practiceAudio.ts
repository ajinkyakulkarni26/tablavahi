import type { BeatMarker } from "../types";

type AudioContextConstructor = typeof AudioContext;

function getAudioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as {
    AudioContext?: AudioContextConstructor;
    webkitAudioContext?: AudioContextConstructor;
  };
  return win.AudioContext ?? win.webkitAudioContext ?? null;
}

export class PracticeAudioCue {
  private ctx: AudioContext | null = null;

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
      this.ctx = new Ctor();
      if (this.ctx.state === "suspended") {
        void this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  playCueCount(cueNumber: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Slightly brighter pitch on "1" right before Sam
      const isFinalCue = cueNumber === 1;
      osc.type = "triangle";
      osc.frequency.setValueAtTime(isFinalCue ? 987.77 : 783.99, now);
      osc.frequency.exponentialRampToValueAtTime(
        isFinalCue ? 659.25 : 523.25,
        now + 0.075,
      );

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(isFinalCue ? 0.22 : 0.16, now + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.095);
    } catch {
      // Ignore audio errors in restricted environments
    }
  }

  playMatraBeat(marker?: BeatMarker): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (marker === "sam") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.14);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.24, now + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.165);
        return;
      }

      if (marker === "taali") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(659.25, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.13, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.07);
        return;
      }

      if (marker === "khali") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
        return;
      }

      osc.type = "sine";
      osc.frequency.setValueAtTime(349.23, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.045, now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.038);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.042);
    } catch {
      // Ignore audio errors
    }
  }

  dispose(): void {
    if (!this.ctx) return;
    const current = this.ctx;
    this.ctx = null;
    void current.close().catch(() => {});
  }
}
