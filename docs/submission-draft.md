# OpenAI Build Week submission draft

## Project

- **Name:** Swimphony
- **Tagline:** A goldfish's movement becomes generative music, ambient light, and a projected trail.
- **Submitter type:** Individual
- **Country:** Japan
- **Category:** Apps for Your Life
- **Codex Session ID:** `019f70bf-0594-7060-992f-c464fe304283`

## Description

### Inspiration

I wanted to make an aquarium feel less like something we watch and more like something we can listen to. A goldfish already draws paths through water all day. Swimphony treats those paths as a performance without attaching anything to the fish or changing its behavior.

### What it does

Swimphony is a one-camera web app that tracks one goldfish and turns its movement into generative music, ambient light, and a separate projected visual.

After a short calibration, the tracker produces position, speed, direction, acceleration, apparent size, and confidence. Those signals control a Tone.js performance and a browser-based Virtual Light. A projector view translates the same movement into a slowly fading golden trail. Philips Hue can mirror the light locally, but it is optional.

GPT-5.6 acts as the AI conductor. The user can describe a mood such as “quiet midnight aquarium,” and GPT-5.6 creates a structured sound-and-light preset. Every result is schema-constrained and validated on the server before it can affect note rate, gain, brightness, or transition timing.

The project also includes a deterministic telemetry mode. Judges can experience the complete music, light, and projection flow without a camera, aquarium, fish, or Hue bridge.

### How I built it

The app uses Next.js, React, TypeScript, HTML Canvas, Tone.js, and Zod. Sample video and live camera inputs both produce the same `FishState` model, so tracking is separated from the performance engine. The browser processes a downscaled frame around 12 times per second, combines fish-color matching with motion and continuity, and uses confidence-aware fallback behavior when tracking is uncertain.

The AI conductor runs server-side through a short-lived local Codex App Server session using GPT-5.6. The browser never receives credentials. Invalid output, timeouts, or an unavailable Codex session return a safe built-in preset instead of interrupting the performance.

### How I used Codex

I collaborated with Codex throughout Build Week to move from a project brief to a working product. Codex implemented and tested the tracking math, camera and sample-video adapters, Tone.js scheduling, Virtual Light, Hue adapter, structured GPT-5.6 conductor, projection channel, launcher, and fallback paths. It also helped test actual browser and hardware behavior and kept a dated build log.

I made the central product and safety decisions: use one ordinary camera; keep demo mode permanent; make Hue optional; use GPT-5.6 for bounded creative direction rather than per-frame tracking; keep light indirect; and remove brightness strobing from the submission build.

### Challenges

The hard part was making several real-time systems feel like one calm experience. Camera frames, tracking updates, musical events, browser rendering, and a local Hue bridge all run at different rates. Separating them behind `FishState` and `PerformancePreset` made the behavior testable and kept camera failure from stopping the performance.

Tracking a reflective aquarium was another challenge. A fixed aquarium region prevents orange objects outside the tank from being selected, while motion, color, continuity, and confidence scoring reduce jumps caused by reflections.

### Accomplishments

- One calibration path works for sample video and live camera.
- Music continues coherently while the fish conducts and solos over it.
- GPT-5.6 produces visibly and audibly different, validated presets.
- The complete experience remains demonstrable with deterministic sample telemetry.
- Optional Hue and the projector view fail independently without breaking audio or Virtual Light.
- Automated tests, lint, and a production build pass.

### What I learned

The strongest mapping is not the most reactive one. Quantized notes, restrained transitions, confidence gating, and a stable musical foundation make the fish feel expressive without turning every pixel change into noise. I also learned that an AI feature becomes more meaningful when its responsibility is narrow and legible: GPT-5.6 composes the rules of the performance, while deterministic code performs them in real time.

### What's next

The next step is testing the installation in more aquariums and rooms, then adding more projection presets. Dual-camera depth, TrueDepth, and multi-fish identity tracking are documented future experiments, not claims in this submission.

## Built with

- Codex
- GPT-5.6
- Next.js
- React
- TypeScript
- Tone.js
- HTML Canvas
- Zod
- Philips Hue API (optional)

## Pending URLs

- **Devpost draft:** https://devpost.com/software/swimphony
- **Repository:** https://github.com/tadacid/swimphony
- **Demo video:** pending recording and YouTube upload
- **Judge instructions:** run `npm install`, `npm run dev`, open `http://localhost:3000`, choose Demo Mode, and press Start audio. Codex login is only required to generate a new AI Conductor preset; the safe built-in preset and all deterministic demo features remain available without it.
