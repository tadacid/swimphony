import type { ColorProfile } from "@/lib/tracking/canvas-tracker";
import {
  clampRoi,
  DEFAULT_AQUARIUM_ROI,
  type AquariumRoi,
} from "@/lib/tracking/tracking-math";

export const CAMERA_CALIBRATION_STORAGE_KEY = "swimphony.camera-calibration.v1";

const EXTERNAL_CAMERA_LABEL = /nintendo|switch|capture|usb|external|057e[: ]?206d/i;

export type CameraCalibration = {
  version: 1;
  deviceId: string;
  roi: AquariumRoi;
  profile: ColorProfile;
};

export function preferredExternalCameraId(
  devices: Array<{ deviceId: string; label: string }>,
): string {
  return devices.find((device) => EXTERNAL_CAMERA_LABEL.test(device.label))?.deviceId ?? "";
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validProfile(value: unknown): value is ColorProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Record<string, unknown>;
  return (
    finiteNumber(profile.hue) && profile.hue >= 0 && profile.hue <= 360 &&
    finiteNumber(profile.saturation) && profile.saturation >= 0 && profile.saturation <= 1 &&
    finiteNumber(profile.value) && profile.value >= 0 && profile.value <= 1 &&
    finiteNumber(profile.hueTolerance) && profile.hueTolerance > 0 && profile.hueTolerance <= 180 &&
    finiteNumber(profile.saturationTolerance) && profile.saturationTolerance > 0 && profile.saturationTolerance <= 1 &&
    finiteNumber(profile.valueTolerance) && profile.valueTolerance > 0 && profile.valueTolerance <= 1
  );
}

function validRoi(value: unknown): value is AquariumRoi {
  if (!value || typeof value !== "object") return false;
  const roi = value as Record<string, unknown>;
  return (
    finiteNumber(roi.x) &&
    finiteNumber(roi.y) &&
    finiteNumber(roi.width) &&
    finiteNumber(roi.height) &&
    roi.width >= 0.08 &&
    roi.height >= 0.08
  );
}

export function isUsableAquariumRoi(roi: AquariumRoi): boolean {
  return roi.width >= 0.4 && roi.height >= 0.35;
}

export function repairAquariumRoi(roi: AquariumRoi): AquariumRoi {
  const clamped = clampRoi(roi);
  return isUsableAquariumRoi(clamped) ? clamped : DEFAULT_AQUARIUM_ROI;
}

export function parseCameraCalibration(raw: string | null): CameraCalibration | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (
      value.version !== 1 ||
      typeof value.deviceId !== "string" ||
      !validRoi(value.roi) ||
      !validProfile(value.profile)
    ) {
      return null;
    }
    return {
      version: 1,
      deviceId: value.deviceId,
      roi: repairAquariumRoi(value.roi),
      profile: value.profile,
    };
  } catch {
    return null;
  }
}

export function serializeCameraCalibration(
  deviceId: string,
  roi: AquariumRoi,
  profile: ColorProfile,
): string {
  return JSON.stringify({ version: 1, deviceId, roi: repairAquariumRoi(roi), profile });
}
