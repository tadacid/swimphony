# 09. Decision Log

## D-001: One camera is the submission baseline

**Decision:** The app must work with one ordinary camera.

**Reason:** It is accessible, easy to explain, and achievable within the event. Two-camera geometry would increase setup and calibration risk.

**Trade-off:** No reliable physical depth value in the baseline.

## D-002: Apparent area is only a weak depth-like signal

**Decision:** Use fish area for subtle filter/reverb modulation, not pitch or core structure.

**Reason:** Area changes with distance and body orientation.

## D-003: Philips Hue is optional

**Decision:** Virtual Light is required; real Hue is P1.

**Reason:** Anyone can try the virtual version, while the home demo can still become an environmental installation.

## D-004: Hue changes are slow and indirect

**Decision:** Aim Hue at the room, not the aquarium, and update slowly.

**Reason:** Protect tracking stability, visual quality, and fish welfare.

## D-005: GPT-5.6 is the AI Conductor

**Decision:** GPT-5.6 translates natural-language mood instructions into validated performance presets.

**Reason:** This is meaningful, understandable, and does not put an LLM in a real-time frame loop where it would be expensive and absurd.

## D-006: Browser-first architecture

**Decision:** Use Next.js, TypeScript, Tone.js, and browser video/canvas processing.

**Reason:** Reduces process orchestration and makes a public demo easier.

## D-007: Recorded telemetry is permanent

**Decision:** Preserve a deterministic demo mode even after live tracking works.

**Reason:** Fish, cameras, permissions, and network hardware all possess a profound talent for failing during presentations.

## D-008: TrueDepth and dual-camera work are deferred

**Decision:** Document them as future input adapters only.

**Reason:** Glass, water, infrared reflection, and camera synchronization need separate experiments and cannot block submission.
