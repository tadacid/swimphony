# Phase 4 Prompt: Optional Philips Hue Output

Only run this phase after the complete Virtual Light experience is stable. If Hue hardware or bridge credentials are unavailable, do not fabricate success. Leave the adapter disabled and document the limitation.

## Goal

Send the same validated light state used by Virtual Light to a local Philips Hue grouped light, slowly and safely, without affecting tracking or audio.

## Requirements

1. Keep Hue disabled by default.
2. Read bridge configuration only from server environment variables.
3. Use current local Hue Bridge HTTPS APIs.
4. Do not expose bridge address or application key to the browser.
5. Rate-limit grouped-light updates to approximately one per second.
6. Use transitions of at least the preset safety minimum.
7. Implement confidence-gated behavior from `docs/06-hue-setup.md`.
8. Hue failures must never interrupt Virtual Light or sound.
9. Provide a connection-test endpoint or setup screen that returns sanitized status only.

## TLS

Do not solve local bridge certificate issues by globally setting `NODE_TLS_REJECT_UNAUTHORIZED=0`. Use a narrowly scoped local-network client strategy and document it.

## Physical test

- Aim Hue at a wall or room surface, not directly into the aquarium.
- Verify the camera tracker under several slow color changes.
- Verify there is no visible flashing.
- Confirm the fish is not being stimulated to perform.

## Stop condition

If a reliable implementation is not achieved within 90 minutes, keep Hue disabled and prepare the Virtual Light version for submission.

## Acceptance criteria

- Enable/disable works without app restart.
- Real light broadly matches Virtual Light.
- Updates are rate-limited.
- Secrets are server-only.
- Hue outage is harmless.
- Tracking remains usable.

Update the Codex build log with exact hardware and limitations.
