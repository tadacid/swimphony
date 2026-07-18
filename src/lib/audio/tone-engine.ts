import type { PerformanceFrame } from "@/lib/performance/mapper";
import {
  MODE_PRESETS,
  type SoundMode,
} from "@/lib/performance/mode-presets";
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
  private currentMode: SoundMode = "original";
  private stepIndex = 0;

  async start(preset: PerformancePreset, mode: SoundMode = "original"): Promise<void> {
    if (this.started) {
      this.applyPreset(preset, mode);
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
    this.applyPreset(preset, mode);
    this.schedulerId = setInterval(() => this.scheduleNote(), 50);
  }

  applyPreset(preset: PerformancePreset, mode: SoundMode = "original"): void {
    if (this.currentMode !== mode) {
      this.stepIndex = 0;
      this.lastNoteAt = 0;
    }
    this.currentPreset = preset;
    this.currentMode = mode;
    this.synth?.set({
      oscillator: { type: preset.synth.oscillator },
      envelope: {
        attack: preset.synth.attack,
        release: preset.synth.release,
      },
    });
    this.accentSynth?.set({
      oscillator: {
        type: mode === "acid" || mode === "psytrance" ? "sawtooth" : "triangle",
      },
    });
    this.filter?.Q.rampTo(mode === "acid" ? 12 : mode === "psytrance" ? 6 : 1, 0.35);
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

    const profile = MODE_PRESETS[this.currentMode].rhythm;
    const beatSeconds = 60 / this.currentPreset.bpm;
    const intervalMs = Math.max(
      beatSeconds * 1000 * profile.minimumBeatFraction,
      frame.noteIntervalMs * profile.intervalScale,
    );
    const nowMs = performance.now();
    if (nowMs - this.lastNoteAt < intervalMs) {
      return;
    }

    const step = this.stepIndex;
    const offset = profile.sequence[step % profile.sequence.length] ?? 0;
    const note = this.transpose(frame.note, offset);
    const durationSeconds = Math.min(4.5, Math.max(0.05, beatSeconds * profile.gateBeats));
    const chordEvery = profile.chordEvery;
    const notes = chordEvery > 0 && step % chordEvery === 0
      ? this.chordFor(note)
      : note;
    this.synth.triggerAttackRelease(
      notes,
      durationSeconds,
      this.tone.now(),
      Array.isArray(notes) ? Math.min(0.34, frame.velocity * 0.72) : frame.velocity,
    );

    if (this.currentMode === "acid") {
      const sweep = 0.3 + ((step % 4) / 3) * 0.7;
      this.filter?.frequency.rampTo(
        Math.max(180, Math.min(frame.filterHz * sweep, this.currentPreset.synth.filterMaxHz)),
        0.035,
      );
    }

    if (profile.bassEvery > 0 && step % profile.bassEvery === 0) {
      this.accentSynth?.triggerAttackRelease(
        this.transpose(note, -12),
        Math.max(0.06, Math.min(0.42, beatSeconds * 0.38)),
        this.tone.now(),
        Math.min(0.3, frame.velocity * 0.58),
      );
    }

    const rhythmicAccent = profile.accentEvery > 0 && step % profile.accentEvery === 0;
    if (frame.accent || rhythmicAccent) {
      this.accentSynth?.triggerAttackRelease(
        note,
        "16n",
        this.tone.now() + 0.035,
        Math.min(0.34, frame.velocity * 0.5),
      );
    }

    if (this.currentMode === "dub") {
      this.accentSynth?.triggerAttackRelease(
        note,
        Math.min(0.5, beatSeconds * 0.55),
        this.tone.now() + beatSeconds * 0.72,
        Math.min(0.18, frame.velocity * 0.32),
      );
    }

    this.stepIndex += 1;
    this.lastNoteAt = nowMs;
  }

  private transpose(note: string, semitones: number): string {
    if (!this.tone || semitones === 0) return note;
    return this.tone.Frequency(note).transpose(semitones).toNote();
  }

  private chordFor(note: string): string[] {
    const intervals = this.currentMode === "gagaku" ? [0, 7, 12] : [0, 4, 7];
    return intervals.map((interval) => this.transpose(note, interval));
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
    this.currentMode = "original";
    this.stepIndex = 0;
    this.started = false;
  }
}
