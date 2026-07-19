# 06. Philips Hue Setup

Hue is optional. Complete the virtual experience first.

## Physical recommendation

- Keep the aquarium's tracking light fixed.
- Aim Hue at the wall, ceiling, or furniture behind the aquarium.
- Keep the bulb and its direct reflection out of the camera frame.
- Use one grouped-light update rather than sending separate rapid commands to multiple bulbs.

## Required values

Add these to `.env.local` only:

```text
HUE_ENABLED=true
HUE_BRIDGE_BASE_URL=https://<bridge-ip>
HUE_APPLICATION_KEY=<local application key>
HUE_GROUPED_LIGHT_ID=<grouped light resource id>
```

Do not commit them.

## Implementation notes

- Use the local Hue Bridge API over HTTPS.
- Run Hue calls from a server route or local companion process, never directly from browser JavaScript containing the key.
- Bridges commonly use a local certificate that needs proper local trust handling. Do not globally disable TLS verification in production code.
- Rate-limit grouped-light updates to about one per second and use transition durations.
- Beat Palette may update color as quickly as 250 ms with a zero-duration color transition, but brightness must remain fixed and the lights must remain indirect. This is not a brightness strobe mode.
- Party Edge uses the same beat limit and only alternates between 65% and 100% brightness. It must never use 0% brightness or sub-beat flashing.
- The Virtual Light path must remain active when Hue is unavailable.

## Safety controller

```text
confidence >= 0.65
  normal palette and transitions

0.35 <= confidence < 0.65
  smaller hue range, lower saturation

confidence < 0.35
  stop reactive Hue updates and return slowly to a neutral state
```

## Phase acceptance

- Hue can be enabled or disabled without restarting the app.
- Hue failure never blocks audio or Virtual Light.
- No secret appears in the browser network response or client bundle.
- Update rate stays within the chosen limit.
- The camera tracker remains stable while the room color changes.
