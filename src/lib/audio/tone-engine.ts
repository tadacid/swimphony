import type { PerformanceFrame } from "@/lib/performance/mapper";
import type { PerformancePreset } from "@/lib/performance/preset-schema";

// Tone.js objects are intentionally kept behind this small adapter.
type ToneRuntime = typeof import("tone");
type TonePolySynth = import("tone").PolySynth;
type TonePanner = import("tone").Panner;
type ToneFilter = import("tone").Filter;
type ToneReverb = import("tone").Reverb;

export class ToneEngine {
  private tone: ToneRuntime | null = null;
  private synth: TonePolySynth | null = null;
  private panner: TonePanner | null = null;
  private filter: ToneFilter | null = null;
  private reverb: ToneReverb | null = null;
  private lastNoteAt = 0;
  private started = false;
  private currentPreset: PerformancePreset | null = null;

  async start(preset: PerformancePreset): Promise<void> {
    if (this.started) {
      this.applyPreset(preset);
      return;
    }

    const Tone = await import("tone");
    await Tone.start();

    const reverb = new Tone.Reverb({ decay: 3.2, wet: preset.synth.reverb });
    const filter = new Tone.Filter({
      type: "lowpass",
      frequency: preset.synth.filterMaxHz,
      rolloff: -24,
    });
    const panner = new Tone.Panner(0);
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: preset.synth.oscillator },
      envelope: {
        attack: preset.synth.attack,
        release: preset.synth.release,
      },
      volume: -10,
    });

    synth.connect(filter);
    filter.connect(reverb);
    reverb.connect(panner);
    panner.toDestination();

    this.tone = Tone;
    this.synth = synth;
    this.panner = panner;
    this.filter = filter;
    this.reverb = reverb;
    this.started = true;
    this.applyPreset(preset);
  }

  applyPreset(preset: PerformancePreset): void {
    this.currentPreset = preset;
    this.synth?.set({
      oscillator: { type: preset.synth.oscillator },
      envelope: {
        attack: preset.synth.attack,
        release: preset.synth.release,
      },
    });
    this.reverb?.wet.rampTo(preset.synth.reverb, 0.5);
  }

  update(frame: PerformanceFrame): void {
    if (!this.started || !this.tone || !this.synth || !this.currentPreset) {
      return;
    }

    this.panner?.pan.rampTo(frame.pan, 0.12);
    this.filter?.frequency.rampTo(frame.filterHz, 0.18);

    if (!frame.note || frame.velocity <= 0) {
      return;
    }

    const nowMs = performance.now();
    if (nowMs - this.lastNoteAt < frame.noteIntervalMs) {
      return;
    }

    const durationSeconds = Math.min(
      2.5,
      Math.max(0.16, (60 / this.currentPreset.bpm) * 0.75),
    );
    this.synth.triggerAttackRelease(
      frame.note,
      durationSeconds,
      this.tone.now(),
      frame.velocity,
    );
    this.lastNoteAt = nowMs;
  }

  stop(): void {
    this.synth?.releaseAll?.();
    this.synth?.dispose();
    this.filter?.dispose();
    this.reverb?.dispose();
    this.panner?.dispose();

    this.synth = null;
    this.filter = null;
    this.reverb = null;
    this.panner = null;
    this.tone = null;
    this.currentPreset = null;
    this.started = false;
  }
}
