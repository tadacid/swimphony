# 02. Scope and Priorities

## P0: required for submission

1. Recorded telemetry demo that always works
2. Sample MP4 input
3. One live-camera input
4. Aquarium ROI calibration
5. Fish color calibration by clicking the fish
6. Fish tracking with normalized `x`, `y`, speed, direction, acceleration, apparent area, confidence, and detected state
7. Smooth visual marker and trail
8. Tone.js performance engine
9. Virtual ambient light
10. GPT-5.6 AI Conductor producing validated presets
11. Single-screen polished UI
12. Clear README, setup guide, tests, and demo video

## P1: include only after P0 is stable

1. Philips Hue output through the local bridge
2. Camera device selector
3. Preset save/export as JSON
4. Tracking Safety Controller that calms lighting when confidence falls
5. A compact Debug panel with masks and calibration values

## P2: explicitly deferred

- Two-camera 3D tracking
- iPhone TrueDepth
- Multiple fish identity tracking
- Cloud accounts or storage
- Music recording and export
- Remote Hue control outside the local network
- Native iOS application
- A full DAW or modular-synth interface

## Submission cut rules

- If Hue takes more than 90 minutes after the virtual version works, disable Hue and submit Virtual Light.
- If live camera is unstable, demonstrate sample video and keep camera marked beta.
- If OpenCV integration becomes brittle, use a small Canvas pixel-processing implementation for the MVP.
- If tracking improvements exceed four hours, freeze the best preset and focus on the demo and interface.
- Do not change the architecture to support a deferred feature before submission.

## Definition of done

A person with no aquarium and no Hue hardware can open the app, run the included demo, generate a mood preset with GPT-5.6, and understand within 20 seconds that a fish's movement controls sound and light.
