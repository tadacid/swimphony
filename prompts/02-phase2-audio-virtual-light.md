# Phase 2 Prompt: Live Camera, Audio, and Virtual Light

Begin only after Phase 1 acceptance criteria pass.

## Goal

Connect real `FishState` data to the existing performance mapper, improve the Tone.js engine, add live camera input, and make Virtual Light a polished first-class output.

## Required work

1. Add a camera device selector using `navigator.mediaDevices`.
2. Reuse the exact Phase 1 calibration and tracking pipeline for live camera frames.
3. Keep sample video and telemetry modes available.
4. Connect the active tracker's `FishState` to `mapFishToPerformance`.
5. Improve audio so the result is coherent rather than frame-triggered noise.
6. Add a visible tracking trail and current note/light indicators.
7. Add confidence-gated fading when the fish is lost.

## Audio behavior

- Explicit **Start audio** gesture
- Quantized pitch
- Smooth pan and filter ramps
- Note scheduling independent from tracking frame rate
- Maximum note rate from the preset
- No stuck notes after mode changes or component unmount
- One calm primary voice and one optional accent voice; do not build a miniature DAW

## Virtual Light behavior

- Smooth full-screen or stage-level ambient gradient
- No flashing
- Preset-driven hue, saturation, brightness, and transition
- Lower reactivity when tracking confidence falls
- Neutral state when the fish is lost

## UI

Keep one main screen:

- large aquarium stage
- source and calibration controls
- audio start/mute
- current preset
- fish state summary
- optional Debug drawer

## Acceptance criteria

- Telemetry, sample video, and live camera can be switched without reloading.
- Sound and light clearly respond to movement.
- The relationship is understandable without a debug explanation.
- Audio and loops stop cleanly.
- Camera permission denial returns to a working demo mode.
- Tests, lint, and production build pass.

Update the Codex build log and document browser/device tests honestly.
