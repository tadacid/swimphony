# AGENTS.md

## Project mission

Build Swimphony: a one-camera web application that tracks one goldfish and transforms its movement into generative sound and ambient light.

## Mandatory build rules

1. Read `START_HERE.md` and all files in `docs/` before changing code.
2. Work one phase at a time. Do not implement deferred features unless the current phase is accepted.
3. Preserve the deterministic telemetry demo at all times. The app must remain demonstrable without a camera or fish.
4. Use the shared `FishState` type. Camera and video inputs are adapters that produce the same model.
5. Never expose OpenAI or Hue secrets to browser code, logs, screenshots, or Git.
6. GPT-5.6 must perform a meaningful product function: natural-language generation of validated sound-and-light presets.
7. Validate model output on the server. Clamp all brightness, transition, note-rate, and gain values.
8. No flashing, strobes, rapid brightness jumps, or attempts to provoke the fish.
9. Hue is optional. Virtual Light is the universal fallback and must stay first-class.
10. Two-camera tracking and TrueDepth are explicitly deferred until after submission.

## Engineering standards

- TypeScript strict mode
- Small, testable pure functions for tracking math and performance mapping
- Browser audio begins only after a user gesture
- Release OpenCV `Mat` objects every frame to avoid memory leaks
- Process a downscaled frame, initially around 480×270
- Keep tracking around 10–15 Hz; do not waste CPU processing every display frame
- Use confidence-gated behavior when the fish is lost
- Run `npm test`, `npm run lint`, and `npm run build` before declaring a phase complete
- Update `docs/10-codex-build-log-template.md` after every phase

## Product standards

- The main screen must explain itself without developer narration
- Show the fish, the tracking point or trail, and the resulting sound/light state together
- Keep setup to a short calibration flow: choose source, set aquarium ROI, click the fish, start performance
- Hide debug masks and raw HSV/Lab values behind a Debug toggle
- Prefer a coherent, calm performance over maximum reactivity

## Completion discipline

At the end of each phase, report:

1. Files changed
2. Commands run and their results
3. Acceptance criteria passed or failed
4. Remaining risks
5. Exact next prompt to use

Never silently claim success if a command, device, API, or browser behavior was not verified.
