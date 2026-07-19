import type { PerformanceFrame } from "@/lib/performance/mapper";
import {
  MODE_PRESETS,
  type SoundMode,
} from "@/lib/performance/mode-presets";
import { grooveAtStep } from "@/lib/performance/groove-pattern";
import type { PerformancePreset } from "@/lib/performance/preset-schema";
import {
  arrangementAtBeat,
  SONG_LENGTH_BEATS,
} from "@/lib/performance/song-arrangement";

// Tone.js objects are intentionally kept behind this small adapter.
type ToneRuntime = typeof import("tone");
type TonePolySynth = import("tone").PolySynth;
type TonePanner = import("tone").Panner;
type ToneFilter = import("tone").Filter;
type ToneReverb = import("tone").Reverb;
type ToneGain = import("tone").Gain;
type ToneSynth = import("tone").Synth;
type ToneMonoSynth = import("tone").MonoSynth;
type ToneMembraneSynth = import("tone").MembraneSynth;
type ToneNoiseSynth = import("tone").NoiseSynth;

export type PerformanceLayer = "fish-solo" | "groove-fish";

export class ToneEngine {
  private tone: ToneRuntime | null = null;
  private synth: TonePolySynth | null = null;
  private panner: TonePanner | null = null;
  private filter: ToneFilter | null = null;
  private reverb: ToneReverb | null = null;
  private gain: ToneGain | null = null;
  private accentSynth: ToneSynth | null = null;
  private bassSynth: ToneMonoSynth | null = null;
  private kickSynth: ToneMembraneSynth | null = null;
  private hatSynth: ToneNoiseSynth | null = null;
  private grooveGain: ToneGain | null = null;
  private latestFrame: PerformanceFrame | null = null;
  private schedulerId: ReturnType<typeof setInterval> | null = null;
  private lastNoteAt = 0;
  private started = false;
  private currentPreset: PerformancePreset | null = null;
  private currentMode: SoundMode = "original";
  private currentLayer: PerformanceLayer = "groove-fish";
  private stepIndex = 0;
  private songBeat = 0;
  private grooveStep = 0;
  private lastGrooveAt = 0;

  async start(
    preset: PerformancePreset,
    mode: SoundMode = "original",
    layer: PerformanceLayer = "groove-fish",
  ): Promise<void> {
    if (this.started) {
      this.applyPreset(preset, mode, layer);
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
    const bassSynth = new Tone.MonoSynth({
      oscillator: { type: "sine" },
      filter: { type: "lowpass", frequency: 1200, rolloff: -24, Q: 3 },
      envelope: { attack: 0.01, decay: 0.18, sustain: 0.36, release: 0.24 },
      filterEnvelope: {
        attack: 0.01,
        decay: 0.2,
        sustain: 0.18,
        release: 0.28,
        baseFrequency: 90,
        octaves: 4,
      },
      volume: -19,
    });
    const kickSynth = new Tone.MembraneSynth({
      pitchDecay: 0.035,
      octaves: 5,
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.22, sustain: 0, release: 0.1 },
      volume: -13,
    });
    const hatSynth = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.035, sustain: 0, release: 0.02 },
      volume: -29,
    });
    const grooveGain = new Tone.Gain(0.64);

    synth.connect(filter);
    accentSynth.connect(filter);
    filter.connect(reverb);
    reverb.connect(panner);
    panner.connect(gain);
    gain.toDestination();
    bassSynth.connect(grooveGain);
    kickSynth.connect(grooveGain);
    hatSynth.connect(grooveGain);
    grooveGain.toDestination();

    this.tone = Tone;
    this.synth = synth;
    this.panner = panner;
    this.filter = filter;
    this.reverb = reverb;
    this.gain = gain;
    this.accentSynth = accentSynth;
    this.bassSynth = bassSynth;
    this.kickSynth = kickSynth;
    this.hatSynth = hatSynth;
    this.grooveGain = grooveGain;
    this.started = true;
    this.applyPreset(preset, mode, layer);
    this.schedulerId = setInterval(() => {
      this.scheduleGroove();
      this.scheduleNote();
    }, 25);
  }

  applyPreset(
    preset: PerformancePreset,
    mode: SoundMode = "original",
    layer: PerformanceLayer = "groove-fish",
  ): void {
    if (this.currentMode !== mode || this.currentLayer !== layer) {
      this.stepIndex = 0;
      this.songBeat = 0;
      this.lastNoteAt = 0;
      this.grooveStep = 0;
      this.lastGrooveAt = 0;
    }
    this.currentPreset = preset;
    this.currentMode = mode;
    this.currentLayer = layer;
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
    this.bassSynth?.set({
      oscillator: {
        type: mode === "acid" || mode === "psytrance"
          ? "sawtooth"
          : mode === "techno" || mode === "drum-and-bass"
            ? "square"
            : "sine",
      },
    });
    this.filter?.Q.rampTo(mode === "acid" ? 12 : mode === "psytrance" ? 6 : 1, 0.35);
    this.reverb?.wet.rampTo(preset.synth.reverb, 0.5);
    this.grooveGain?.gain.rampTo(layer === "groove-fish" ? 0.64 : 0, 0.25);
  }

  update(frame: PerformanceFrame): void {
    if (!this.started || !this.tone || !this.synth || !this.currentPreset) {
      return;
    }

    this.latestFrame = frame;
    this.panner?.pan.rampTo(frame.pan, 0.18);
    this.filter?.frequency.rampTo(frame.filterHz, 0.24);
    this.gain?.gain.rampTo(frame.velocity > 0 ? 1 : 0, frame.velocity > 0 ? 0.2 : 0.9);
    const grooveEnergy = Math.min(
      1,
      frame.velocity / Math.max(0.05, this.currentPreset.safety.maxGain),
    );
    this.grooveGain?.gain.rampTo(
      this.currentLayer === "groove-fish" ? 0.52 + grooveEnergy * 0.16 : 0,
      0.3,
    );
  }

  private scheduleGroove(): void {
    if (
      this.currentMode === "original" ||
      this.currentLayer !== "groove-fish" ||
      !this.tone ||
      !this.currentPreset ||
      !this.bassSynth ||
      !this.kickSynth ||
      !this.hatSynth
    ) {
      return;
    }

    const beatSeconds = 60 / this.currentPreset.bpm;
    const stepMs = beatSeconds * 250;
    const nowMs = performance.now();
    if (this.lastGrooveAt === 0) this.lastGrooveAt = nowMs - stepMs;
    if (nowMs - this.lastGrooveAt < stepMs) return;
    this.lastGrooveAt = nowMs - this.lastGrooveAt > stepMs * 4
      ? nowMs
      : this.lastGrooveAt + stepMs;

    const arrangement = arrangementAtBeat(this.songBeat);
    const groove = grooveAtStep(this.currentMode, this.grooveStep);
    const energy = this.latestFrame
      ? Math.min(
          1,
          this.latestFrame.velocity / Math.max(0.05, this.currentPreset.safety.maxGain),
        )
      : 0;
    const velocity = groove.velocityScale * arrangement.velocityScale;
    const time = this.tone.now();

    if (arrangement.play && groove.kick) {
      this.kickSynth.triggerAttackRelease(
        "C1",
        Math.min(0.22, beatSeconds * 0.45),
        time,
        Math.min(0.72, 0.48 + velocity * 0.24),
      );
    }

    if (arrangement.play && arrangement.bassEnabled && groove.bass) {
      const note = this.grooveBassNote(
        groove.bassOffset + arrangement.harmonicOffset,
      );
      this.bassSynth.triggerAttackRelease(
        note,
        Math.max(0.06, beatSeconds * groove.bassGateBeats),
        time,
        Math.min(0.34, 0.12 + velocity * 0.16 + energy * 0.05),
      );
    }

    if (arrangement.play && groove.hat) {
      this.hatSynth.triggerAttackRelease(
        Math.min(0.08, beatSeconds * 0.18),
        time,
        Math.min(0.16, 0.055 + velocity * 0.055 + energy * 0.035),
      );
    }

    this.grooveStep += 1;
    this.songBeat = (this.songBeat + 0.25) % SONG_LENGTH_BEATS;
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
    const gridMs = beatSeconds * 1000 * profile.minimumBeatFraction;
    const gridSteps = Math.max(
      1,
      Math.round((frame.noteIntervalMs * profile.intervalScale) / gridMs),
    );
    const intervalMs = gridMs * gridSteps;
    const intervalBeats = profile.minimumBeatFraction * gridSteps;
    const nowMs = performance.now();
    if (nowMs - this.lastNoteAt < intervalMs) {
      return;
    }

    const step = this.stepIndex;
    const arrangement = arrangementAtBeat(this.songBeat);
    if (!arrangement.play) {
      this.advanceSongStep(nowMs, intervalBeats);
      return;
    }

    const phraseOffset = this.currentMode === "gagaku"
      ? 0
      : arrangement.harmonicOffset;
    const offset = (profile.sequence[step % profile.sequence.length] ?? 0) + phraseOffset;
    const fishLead = this.currentMode === "original" || this.currentLayer === "fish-solo"
      ? frame.note
      : this.elevateFishLead(frame.note);
    const note = this.transpose(fishLead, offset);
    const durationSeconds = Math.min(4.5, Math.max(0.05, beatSeconds * profile.gateBeats));
    const chordEvery = profile.chordEvery;
    const notes = chordEvery > 0 && step % chordEvery === 0
      ? this.chordFor(note)
      : note;
    const arrangedVelocity = frame.velocity * arrangement.velocityScale;
    this.synth.triggerAttackRelease(
      notes,
      durationSeconds,
      this.tone.now(),
      Array.isArray(notes) ? Math.min(0.34, arrangedVelocity * 0.72) : arrangedVelocity,
    );

    if (this.currentMode === "acid") {
      const sweep = 0.3 + ((step % 4) / 3) * 0.7;
      this.filter?.frequency.rampTo(
        Math.max(180, Math.min(frame.filterHz * sweep, this.currentPreset.synth.filterMaxHz)),
        0.035,
      );
    }

    if (
      this.currentLayer === "fish-solo" &&
      arrangement.bassEnabled &&
      profile.bassEvery > 0 &&
      step % profile.bassEvery === 0
    ) {
      this.accentSynth?.triggerAttackRelease(
        this.transpose(note, -12),
        Math.max(0.06, Math.min(0.42, beatSeconds * 0.38)),
        this.tone.now(),
        Math.min(0.3, arrangedVelocity * 0.58),
      );
    }

    const rhythmicAccent = profile.accentEvery > 0 && step % profile.accentEvery === 0;
    if (frame.accent || rhythmicAccent || arrangement.forceAccent) {
      this.accentSynth?.triggerAttackRelease(
        note,
        "16n",
        this.tone.now() + 0.035,
        Math.min(0.34, arrangedVelocity * 0.5),
      );
    }

    if (this.currentMode === "dub") {
      this.accentSynth?.triggerAttackRelease(
        note,
        Math.min(0.5, beatSeconds * 0.55),
        this.tone.now() + beatSeconds * 0.72,
        Math.min(0.18, arrangedVelocity * 0.32),
      );
    }

    this.advanceSongStep(nowMs, intervalBeats);
  }

  private advanceSongStep(nowMs: number, intervalBeats: number): void {
    this.stepIndex += 1;
    if (this.currentMode === "original" || this.currentLayer === "fish-solo") {
      this.songBeat = (this.songBeat + intervalBeats) % SONG_LENGTH_BEATS;
    }
    this.lastNoteAt = nowMs;
  }

  private grooveBassNote(offset: number): string {
    const fishPitch = this.latestFrame?.note?.match(/^([A-G](?:#|b)?)/)?.[1];
    const anchor = `${fishPitch ?? this.currentPreset?.root ?? "C"}2`;
    const positionOffset = this.latestFrame
      ? this.latestFrame.pan < -0.34
        ? -5
        : this.latestFrame.pan > 0.34
          ? 7
          : 0
      : 0;
    return this.transpose(anchor, offset + positionOffset);
  }

  private elevateFishLead(note: string): string {
    if (!this.tone) return note;
    const frequency = this.tone.Frequency(note);
    const midi = frequency.toMidi();
    if (midi >= 60) return note;
    return frequency.transpose(Math.ceil((60 - midi) / 12) * 12).toNote();
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
    this.bassSynth?.dispose();
    this.kickSynth?.dispose();
    this.hatSynth?.dispose();
    this.grooveGain?.dispose();
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
    this.bassSynth = null;
    this.kickSynth = null;
    this.hatSynth = null;
    this.grooveGain = null;
    this.tone = null;
    this.latestFrame = null;
    this.currentPreset = null;
    this.currentMode = "original";
    this.currentLayer = "groove-fish";
    this.stepIndex = 0;
    this.songBeat = 0;
    this.grooveStep = 0;
    this.lastGrooveAt = 0;
    this.started = false;
  }
}
