import type { PerformanceFrame } from "@/lib/performance/mapper";
import type { PerformancePreset } from "@/lib/performance/preset-schema";

// Tone.js objects are intentionally kept behind this small adapter.
type ToneRuntime = typeof import("tone");
type TonePolySynth = import("tone").PolySynth;
type TonePanner = import("tone").Panner;
type ToneFilter = import("tone").Filter;
type ToneReverb = import("tone").Reverb;
type ToneGain = import("tone").Gain;
type ToneSynth = import("tone").Synth;

export class ToneEngine {
  private tone: ToneRuntime | null = null;
  private synth: TonePolySynth | null = null;
  private panner: TonePanner | null = null;
  private filter: ToneFilter | null = null;
  private reverb: ToneReverb | null = null;
  private gain: ToneGain | null = null;
  private accentSynth: ToneSynth | null = null;
  private latestFrame: PerformanceFrame | null = null;
  private schedulerId: ReturnType<typeof setInterval> | null = null;
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
    const gain = new Tone.Gain(0);
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: preset.synth.oscillator },
      envelope: {
        attack: preset.synth.attack,
        release: preset.synth.release,
      },
      volume: -10,
    });
    const accentSynth = new Tone.Synth({
      oscillator: { type: "triangle" },
      envelope: { attack: 0.015, decay: 0.12, sustain: 0, release: 0.3 },
      volume: -18,
    });

    synth.connect(filter);
    accentSynth.connect(filter);
    filter.connect(reverb);
    reverb.connect(panner);
    panner.connect(gain);
    gain.toDestination();

    this.tone = Tone;
    this.synth = synth;
    this.panner = panner;
    this.filter = filter;
    this.reverb = reverb;
    this.gain = gain;
    this.accentSynth = accentSynth;
    this.started = true;
    this.applyPreset(preset);
    this.schedulerId = setInterval(() => this.scheduleNote(), 50);
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

    this.latestFrame = frame;
    this.panner?.pan.rampTo(frame.pan, 0.18);
    this.filter?.frequency.rampTo(frame.filterHz, 0.24);
    this.gain?.gain.rampTo(frame.velocity > 0 ? 1 : 0, frame.velocity > 0 ? 0.2 : 0.9);
  }

  private scheduleNote(): void {
    const frame = this.latestFrame;

    if (
      !frame ||
      !frame.note ||
      frame.velocity <= 0 ||
      !this.tone ||
      !this.synth ||
      !this.currentPreset
    ) {
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
    if (frame.accent) {
      this.accentSynth?.triggerAttackRelease(
        frame.note,
        "16n",
        this.tone.now() + 0.035,
        Math.min(0.34, frame.velocity * 0.5),
      );
    }
    this.lastNoteAt = nowMs;
  }

  silence(): void {
    this.latestFrame = null;
    this.gain?.gain.rampTo(0, 0.35);
    this.synth?.releaseAll?.();
    this.accentSynth?.triggerRelease();
  }

  stop(): void {
    if (this.schedulerId) clearInterval(this.schedulerId);
    this.schedulerId = null;
    this.silence();
    this.synth?.dispose();
    this.accentSynth?.dispose();
    this.filter?.dispose();
    this.reverb?.dispose();
    this.panner?.dispose();
    this.gain?.dispose();

    this.synth = null;
    this.filter = null;
    this.reverb = null;
    this.panner = null;
    this.gain = null;
    this.accentSynth = null;
    this.tone = null;
    this.latestFrame = null;
    this.currentPreset = null;
    this.started = false;
  }
}
