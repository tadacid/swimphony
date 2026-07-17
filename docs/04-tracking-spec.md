# 04. Tracking Specification

## Aquarium conditions observed

The supplied photographs show a favorable MVP environment:

- One orange goldfish
- Mostly green water/background
- Very little decoration
- A large unobstructed swimming area
- Strong reflections from the camera, room, and a green light source
- Orange objects outside the aquarium that must be excluded

This makes a fixed aquarium ROI mandatory and color-plus-motion tracking a sensible starting point.

## Calibration flow

1. User chooses sample video or camera.
2. User drags four corners or a rectangle around the aquarium interior.
3. The frame is perspective-corrected if needed.
4. User clicks the fish.
5. The tracker samples a small patch and derives initial HSV or Lab statistics.
6. The app previews the candidate mask and lets the user adjust tolerance only if necessary.
7. Live-camera ROI, color profile, and camera choice are validated and stored in browser-local storage for automatic restart.

## Processing pipeline

```text
Video frame
→ resize to approximately 480×270
→ crop or warp aquarium ROI
→ convert RGB to HSV or Lab
→ fish-color distance mask
→ frame-difference motion mask
→ morphological open/close
→ connected components or contours
→ candidate scoring
→ choose candidate nearest predicted position
→ normalized coordinates
→ smoothing and confidence
```

## Candidate score

Start with a weighted score:

```text
color similarity                0.45
motion overlap                  0.25
distance from predicted point   0.20
shape and area plausibility     0.10
```

These are tunable defaults, not holy scripture carved into a silicon tablet.

## Smoothing

Use exponential moving averages for the first submission version:

```text
position alpha: 0.25–0.40
speed alpha:    0.15–0.30
area alpha:     0.10–0.25
```

A Kalman filter is optional only if EMA is visibly inadequate.

## Confidence

Confidence should combine:

- candidate score
- mask area plausibility
- distance from predicted position
- continuity over recent frames
- whether multiple candidates are similarly strong

Suggested behavior:

```text
confidence >= 0.65  normal performance
0.35–0.65           reduce reactivity
< 0.35              hold briefly, then fade
```

## Memory and performance

When using OpenCV.js:

- Reuse Mats where practical.
- Delete every temporary Mat, contour vector, and hierarchy object.
- Process at a capped tracking rate instead of every display frame.
- Add a development counter or memory test to detect growth during a five-minute run.

## Acceptance criteria

- The fish is followed for most visible frames in the supplied front-view video.
- Orange objects outside the ROI are never selected.
- A static reflection is less likely to win than the moving fish.
- A short occlusion or missed frame does not cause a jump across the tank.
- The marker movement is visually smooth.
- The app automatically recovers when the fish reappears.
