# Swimphony demo script

Target length: 2 minutes 40 seconds. The narration is in English because the submission rules require English materials or an English translation.

## Recording setup

- Record at 1920×1080 or 1440×900.
- Use Chrome and begin in the deterministic Demo Mode.
- Capture system audio and narration clearly.
- Do not show `.env.local`, bridge addresses, room details, or browser bookmarks.
- Use only Swimphony's generated audio. Do not add copyrighted music.
- Upload to YouTube as Public or Unlisted, then verify the link in an incognito window.

## Shot list and narration

### 0:00–0:18 — Premise

**Picture:** Goldfish video beside the tracking marker, trail, current note, and Virtual Light.

**Narration:**

> This is Swimphony. A single ordinary camera watches a goldfish and turns its natural movement into generative music, ambient light, and a projected trail. The fish is not prompted or disturbed. It simply swims.

### 0:18–0:48 — Tracking and mapping

**Picture:** Switch to Sample Video, show the aquarium region, click the fish, and begin tracking. Let the marker follow the fish.

**Narration:**

> I mark the aquarium, click the fish once to sample its color, and start tracking. Swimphony measures position, speed, direction, acceleration, apparent size, and confidence. Horizontal movement controls stereo position and color. Vertical movement chooses notes. Speed shapes rhythm and energy.

### 0:48–1:18 — Complete performance

**Picture:** Start audio, change one music mode, show Virtual Light, then open the Golden Trail projection.

**Narration:**

> The experience is designed as a coherent performance, not a sensor dashboard. Tone.js creates the music, Virtual Light makes the experience available to everyone, and this separate projection window turns the same fish movement into a calm golden trail. Philips Hue is optional.

### 1:18–1:52 — GPT-5.6 as the conductor

**Picture:** Enter “quiet midnight aquarium with glassy high notes and slow blue-green light,” generate a preset, and show the visible change.

**Narration:**

> GPT-5.6 has a specific product role: it acts as an AI conductor. I describe a mood in natural language, and it creates a complete sound-and-light preset. The result is constrained by a schema and validated again on the server, so brightness, gain, note density, and light transitions stay inside safe limits.

### 1:52–2:22 — Codex collaboration

**Picture:** Briefly show the repository, tests, and commit history, then return to the working app.

**Narration:**

> I built Swimphony with Codex during OpenAI Build Week. Codex helped turn the idea into a working system across computer vision, audio, lighting, projection, tests, and documentation. I made the key product decisions: one camera, a permanent demo fallback, a meaningful but bounded GPT-5.6 role, and passive fish-safe behavior.

### 2:22–2:40 — Reliability and close

**Picture:** Switch to Demo Mode and show that sound, light, and projection continue without camera hardware.

**Narration:**

> The deterministic demo means judges can run the core experience without a fish, camera, or Hue bridge. Swimphony makes an everyday aquarium feel alive in a new way: the animal becomes a performer simply by being itself.

## Final checks

- Total duration is under 3:00.
- The product is visibly working, not presented only through slides.
- The narration explicitly covers what was built, Codex, and GPT-5.6.
- The YouTube link works while signed out.
