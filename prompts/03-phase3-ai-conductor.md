# Phase 3 Prompt: GPT-5.6 AI Conductor

Begin only after tracking, sound, and Virtual Light are stable.

## Goal

Make GPT-5.6 a meaningful product feature by translating natural-language creative direction into a validated `PerformancePreset` that changes both sound and light.

## Existing baseline

The starter contains:

- `src/app/api/preset/route.ts`
- `PerformancePresetSchema`
- a manual JSON schema for Structured Outputs
- a fallback preset path

Inspect and improve them rather than replacing the architecture casually.

## Required behavior

Input example:

```text
静かな深夜の水族館。上に泳いだ時は透明感のある高音。
急な方向転換だけ金色のアクセント。点滅はなし。
```

Output must be a validated preset controlling:

- name and description
- root and scale
- octave range and bpm
- oscillator, envelope, reverb, and filter range
- mapping assignments
- light hue/saturation/brightness ranges
- transition duration
- maximum gain, brightness, and notes per second

## Model

Use the environment variable `OPENAI_MODEL`, with `gpt-5.6-terra` as the documented default unless event requirements or account access require another GPT-5.6 variant.

## Security and reliability

- Server route only
- No API key in client output
- Strict structured output schema
- Zod validation after API response
- Safe fallback on missing key, refusal, malformed output, timeout, or rate limit
- Clamp safety limits even after validation
- Show whether a preset came from GPT-5.6 or fallback

## Prompt design

The server instructions should make the model act as a restrained audiovisual designer, not a prose writer. Require musical coherence, slow lighting, no flashing, and values within schema ranges.

## Tests

- valid model-shaped object
- invalid brightness
- transition below minimum
- unsupported enum values
- missing API key fallback
- malformed response fallback

## Acceptance criteria

- At least three different mood prompts produce audibly and visibly distinct results.
- The app displays the active model and preset source in a compact diagnostic area.
- Unsafe or malformed values never reach the performance engine.
- The README explains exactly how GPT-5.6 is meaningful.
- Tests, lint, and production build pass.

Update the Codex build log with model ID and tested prompts.
