# Phase 1 Prompt: Sample-Video Goldfish Tracking

Implement Phase 1 only. Do not add live camera, Hue, or new AI features in this phase.

## Required input

- `public/demo/goldfish-demo.mp4`
- `public/references/aquarium-front.jpeg`
- `public/references/aquarium-side.jpeg`

If `goldfish-demo.mp4` is missing, stop after verifying the baseline and explain exactly where the user must place it. Do not invent video results.

## Goal

Add a sample-video mode that tracks one orange goldfish inside a calibrated aquarium ROI and emits the existing shared `FishState` model.

## Required user flow

1. Select **Sample video**.
2. Load `goldfish-demo.mp4`.
3. Pause on a clear frame.
4. Draw or adjust an aquarium ROI.
5. Click the fish to sample its color.
6. Preview the mask and confirm calibration.
7. Start tracking and display the marker, contour, trail, confidence, and metrics.

## Preferred implementation

Use browser canvas processing. Start with OpenCV.js if it integrates cleanly with Next.js; `@techstark/opencv-js` is an acceptable package. If it creates build instability, implement the MVP with Canvas `ImageData`, typed arrays, HSV conversion, frame differencing, and connected components. Record the decision in the build log.

Pipeline:

```text
frame
→ downscale to approximately 480×270
→ ROI crop or perspective warp
→ HSV or Lab color-distance mask
→ motion mask from frame difference
→ morphology
→ contours or connected components
→ candidate scoring
→ previous-position continuity
→ EMA smoothing
→ FishState
```

## Data requirements

Populate:

- `x`, `y` normalized 0–1
- `speed`
- `direction`
- `acceleration`
- `area` normalized to ROI
- `confidence`
- `detected`
- `timestamp`
- `source: "sample-video"`

## Candidate selection

Begin with weights from `docs/04-tracking-spec.md`. Keep them in a named configuration object so they can be tuned without editing algorithm logic.

## Performance and cleanup

- Process at 10–15 Hz.
- Keep display playback smooth.
- Dispose all OpenCV allocations.
- Stop loops and release resources when the component unmounts or the source changes.
- Preserve the telemetry demo.

## Tests

Add unit tests for:

- coordinate normalization
- speed and acceleration
- angle/turn calculation
- EMA smoothing
- candidate scoring
- confidence fallback

## Acceptance criteria

- The tracking marker follows the fish through most visible frames.
- Objects outside the ROI are never selected.
- Static reflections are less competitive than the moving fish.
- One or two missed frames do not cause a large jump.
- Tracking recovers automatically.
- `npm test`, `npm run lint`, and `npm run build` pass.

At completion, update `docs/10-codex-build-log-template.md` and report files changed, commands run, verified behavior, failures, and the exact tuning values used.
