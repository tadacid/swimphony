# 08. Demo and Submission Checklist

## Three-minute demo structure

### 0:00–0:20

Show the aquarium and state the premise: one camera turns a goldfish into a living instrument for sound and ambient light.

### 0:20–0:55

Show the tracking point and trail following the real fish. Let the audience hear changes tied to movement.

### 0:55–1:25

Explain the mapping briefly: horizontal position, vertical position, speed, turns, and confidence.

### 1:25–1:55

Type a mood into AI Conductor and generate a new GPT-5.6 preset. Make the resulting sound and light clearly different.

### 1:55–2:20

Show Virtual Light, then optional real Hue output if stable.

### 2:20–2:40

Show confidence-based fallback or the sample-video/demo mode.

### 2:40–3:00

Explain how Codex accelerated the vision, audio, and integration work and state the future two-camera/TrueDepth direction without pretending it was built.

## Repository checklist

- [ ] Public or judge-accessible repository
- [ ] Clear setup instructions
- [ ] `.env.example` without secrets
- [ ] Sample telemetry included
- [ ] Sample video included or downloadable with clear rights
- [ ] GPT-5.6 model referenced in code and README
- [ ] Codex usage and key human decisions documented
- [ ] Tests and known limitations documented
- [ ] Primary Codex `/feedback` Session ID recorded

## Video checklist

- [ ] Under three minutes
- [ ] Publicly viewable YouTube link
- [ ] Spoken explanation included
- [ ] Real product shown, not only slides
- [ ] GPT-5.6 feature shown
- [ ] Codex use explained
- [ ] Hue shown only if reliable

## Final reliability checklist

- [ ] Demo starts from a clean browser session
- [ ] Audio-start gesture is obvious
- [ ] API failure has a fallback
- [ ] Camera failure has a fallback
- [ ] Fish inactivity has a fallback
- [ ] No secret or private room detail is exposed unintentionally
