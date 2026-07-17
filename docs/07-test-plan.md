# 07. Test Plan

## Unit tests

### Tracking math

- ROI normalization returns values from 0 to 1
- Speed and acceleration handle irregular timestamps
- Angle wrapping does not create false large turns
- EMA smoothing converges and does not overshoot
- Confidence falls when candidate continuity breaks

### Performance mapping

- Top of aquarium maps to higher scale notes
- Left and right positions map to pan -1 and +1
- Speed stays inside note-rate limits
- Brightness, gain, and transitions are clamped
- Lost tracking produces silence and neutral light

### AI preset validation

- Valid preset passes
- Extra properties are rejected or removed according to policy
- Excessive brightness is rejected or clamped
- Flash-like transition values are rejected
- Unknown scales and oscillators fall back safely

## Integration tests

- Recorded telemetry drives the visual marker, sound, and light
- Sample video starts and pauses cleanly
- Camera permission denial returns to demo mode
- AI Conductor updates the current preset
- Missing API key returns a visible fallback without crashing
- Hue errors do not affect audio or Virtual Light

## Manual device tests

- Safari on the project MacBook Pro
- Chrome on the project MacBook Pro
- One iPhone browser if time permits
- Selected USB camera
- DJI Action 2 only if it appears as a standard webcam or capture input

## Endurance test

Run the tracker for five minutes and verify:

- memory does not grow continuously
- frame rate remains acceptable
- audio does not accumulate stuck notes
- tracker recovers after the fish leaves the visible area
