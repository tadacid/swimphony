# START HERE

Japanese guide: [`START_HERE_JA.md`](./START_HERE_JA.md)

This folder is the complete Swimphony handoff pack. It is meant to be unzipped, opened as a Codex project, and developed in one primary Codex thread.

## Do these first

1. Duplicate `.env.example` as `.env.local`.
2. Run `npm install`.
3. Run `npm run dev` and confirm that the telemetry demo, sound, and virtual light work.
4. Add a fixed, front-facing aquarium video at `public/demo/goldfish-demo.mp4`.
5. Open the whole folder in Codex.
6. Paste `CODEX_MASTER_PROMPT.txt` into the primary thread.
7. Continue with `prompts/01-phase1-tracking.md`.

## Files you should provide to Codex

Provide the **entire project folder**, not just a pasted prompt. Codex needs the source code, architecture notes, reference photos, and the phase prompts together.

The most important context files are:

- `AGENTS.md`
- `docs/01-project-brief.md`
- `docs/02-scope-and-priorities.md`
- `docs/03-architecture.md`
- `docs/04-tracking-spec.md`
- `prompts/01-phase1-tracking.md`
- `public/references/aquarium-front.jpeg`
- `public/references/aquarium-side.jpeg`

## User-provided asset still required

The package cannot include a proper tracking video because only still photographs were supplied. Record and add:

```text
public/demo/goldfish-demo.mp4
```

Recommended footage:

- 40 to 60 seconds
- 1080p, 30 fps
- fixed camera
- front view
- no zoom or flash
- aquarium fills most of the frame
- normal fish behavior only

## Build order

```text
Phase 1: sample-video tracking
Phase 2: live camera, sound, and virtual light
Phase 3: GPT-5.6 AI Conductor
Phase 4: optional Philips Hue
Phase 5: polish, README, demo video, submission
```

Do not begin two-camera or TrueDepth work before the submission version is stable. Hardware ambition is an excellent way to turn a working project into an archaeological site.
