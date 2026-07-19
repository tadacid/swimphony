# 05. Audio and Light Mapping

## Design principle

Do not convert raw coordinates directly into arbitrary frequencies. Quantize musical decisions, smooth light decisions, and keep movement expressive without becoming frantic.

## Default mapping

| Fish signal | Sound | Virtual/Hue light |
|---|---|---|
| `x` horizontal position | stereo pan | hue position within palette |
| `y` vertical position | quantized pitch | brightness within a safe range |
| speed | note density and velocity | saturation |
| acceleration / sharp turn | bell-like accent | slow accent toward a highlight hue |
| apparent area | filter cutoff and reverb mix | very small brightness influence |
| dwell time | longer pad notes | more stable color |
| confidence | gain and reactivity | movement range reduction |
| not detected | fade and silence | neutral fallback |

## Musical constraints

- Default scale: minor pentatonic
- Keep pitches roughly within octaves 3–5
- Maximum note rate is preset-controlled and clamped
- Avoid retriggering the same note on every tracking frame
- Smooth pan and filter changes
- Sound begins only after an explicit user gesture

## Lighting constraints

- No flashing or strobing
- Minimum transition time: 1.2 seconds
- Default transition: 1.8–3 seconds
- Default brightness ceiling: 55–60%
- Beat Palette is a deliberate color-only exception: hue may step once per beat with brightness held constant. It must never modulate brightness rapidly or point directly at the aquarium.
- Party Edge may alternate between 65% and 100% brightness once per beat for stronger rhythm, but never switches to 0%, flashes repeatedly within a beat, or shines directly into the aquarium.
- Hue should illuminate a wall, ceiling, or room indirectly
- If confidence falls, reduce saturation and freeze large hue changes

## Why sound and light are parallel outputs

Both derive from the same `FishState` and `PerformancePreset`:

```text
FishState → PerformanceFrame → audio
                            → light
```

The light does not need to listen to the audio output. Parallel mapping reduces latency and makes the relationship easier to explain in the demo.
