# Phase 5 Prompt: Polish and Submission

Freeze feature scope. Do not begin any new hardware or tracking experiment.

## Goal

Turn the working prototype into a clear, reliable three-minute hackathon submission.

## Work items

1. Audit the UI at 1440×900 and 1920×1080.
2. Make the main concept understandable in under 20 seconds.
3. Hide technical details behind Debug.
4. Verify telemetry, sample video, and camera fallbacks.
5. Verify missing API key and API failure behavior.
6. Verify audio start, stop, mode switching, and cleanup.
7. Run a five-minute endurance test.
8. Complete README setup and architecture sections.
9. Complete the Codex build log and record the primary `/feedback` Session ID.
10. Prepare `docs/demo-script.md` from the submission checklist.
11. Add screenshots only after removing secrets and accidental private details.
12. Run tests, lint, and production build from a clean install.

## README must explain

- problem and experience
- one-camera accessibility
- architecture
- meaningful GPT-5.6 role
- meaningful Codex role
- setup and demo modes
- Hue as optional
- safety and fish welfare
- known limitations
- future dual-camera and TrueDepth work, clearly marked unbuilt

## Acceptance criteria

- Clean install works.
- The demo does not depend on the fish choosing to swim at the correct moment.
- The AI Conductor is demonstrated with a real GPT-5.6 call.
- No unverified capability is claimed.
- The video plan fits under three minutes.
- The repository contains no secrets.

At completion, return a final submission checklist with pass/fail evidence and no marketing fog where test results should be.
