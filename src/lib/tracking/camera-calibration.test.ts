import { describe, expect, it } from "vitest";

import {
  parseCameraCalibration,
  preferredExternalCameraId,
  serializeCameraCalibration,
} from "@/lib/tracking/camera-calibration";

const profile = {
  hue: 31,
  saturation: 0.72,
  value: 0.81,
  hueTolerance: 24,
  saturationTolerance: 0.42,
  valueTolerance: 0.48,
};

describe("camera calibration persistence", () => {
  it("round-trips a valid camera calibration", () => {
    const raw = serializeCameraCalibration(
      "switch-camera",
      { x: 0.04, y: 0.08, width: 0.92, height: 0.84 },
      profile,
    );
    expect(parseCameraCalibration(raw)).toEqual({
      version: 1,
      deviceId: "switch-camera",
      roi: { x: 0.04, y: 0.08, width: 0.92, height: 0.84 },
      profile,
    });
  });

  it("ignores malformed or unsafe saved values", () => {
    expect(parseCameraCalibration("not-json")).toBeNull();
    expect(
      parseCameraCalibration(
        JSON.stringify({
          version: 1,
          deviceId: "camera",
          roi: { x: 0, y: 0, width: 0.01, height: 1 },
          profile,
        }),
      ),
    ).toBeNull();
    expect(
      parseCameraCalibration(
        JSON.stringify({
          version: 1,
          deviceId: "camera",
          roi: { x: 0, y: 0, width: 1, height: 1 },
          profile: { ...profile, hue: 999 },
        }),
      ),
    ).toBeNull();
  });

  it("repairs an accidentally tiny saved aquarium selection", () => {
    expect(
      parseCameraCalibration(
        JSON.stringify({
          version: 1,
          deviceId: "switch-camera",
          roi: { x: 0.68, y: 0.55, width: 0.08, height: 0.08 },
          profile,
        }),
      )?.roi,
    ).toEqual({ x: 0.035, y: 0.09, width: 0.93, height: 0.82 });
  });

  it("recovers a re-numbered Nintendo Switch camera", () => {
    expect(
      preferredExternalCameraId([
        { deviceId: "facetime", label: "FaceTime HD Camera" },
        { deviceId: "switch-new", label: "Nintendo Switch Camera (057e:206d)" },
      ]),
    ).toBe("switch-new");
  });
});
