import type { LightFrame } from "@/lib/performance/mapper";
import { clamp } from "@/lib/utils/math";

export function safeHueFrame(light: LightFrame, confidence: number): LightFrame {
  const safeConfidence = clamp(confidence, 0, 1);
  if (safeConfidence < 0.35) {
    return {
      hue: 40,
      saturation: 12,
      brightness: 12,
      transitionMs: Math.max(5000, light.transitionMs),
    };
  }
  if (safeConfidence < 0.65) {
    return {
      hue: light.hue,
      saturation: Math.min(65, Math.max(42, light.saturation * 0.8)),
      brightness: Math.min(75, Math.max(50, light.brightness * 0.85)),
      transitionMs: Math.max(2400, light.transitionMs),
    };
  }
  return {
    hue: light.hue,
    saturation: Math.min(90, light.saturation),
    brightness: Math.min(100, light.brightness),
    transitionMs: Math.max(1500, light.transitionMs),
  };
}

function hueToRgb(p: number, q: number, t: number): number {
  let value = t;
  if (value < 0) value += 1;
  if (value > 1) value -= 1;
  if (value < 1 / 6) return p + (q - p) * 6 * value;
  if (value < 1 / 2) return q;
  if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
  return p;
}

export function hslToHueXy(
  hue: number,
  saturation: number,
  lightness: number,
): { x: number; y: number } {
  const h = ((hue % 360) + 360) % 360 / 360;
  const s = clamp(saturation / 100, 0, 1);
  const l = clamp(lightness / 100, 0, 1);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const red = s === 0 ? l : hueToRgb(p, q, h + 1 / 3);
  const green = s === 0 ? l : hueToRgb(p, q, h);
  const blue = s === 0 ? l : hueToRgb(p, q, h - 1 / 3);
  const linear = (channel: number) =>
    channel > 0.04045
      ? Math.pow((channel + 0.055) / 1.055, 2.4)
      : channel / 12.92;
  const r = linear(red);
  const g = linear(green);
  const b = linear(blue);
  const x = r * 0.664511 + g * 0.154324 + b * 0.162028;
  const y = r * 0.283881 + g * 0.668433 + b * 0.047685;
  const z = r * 0.000088 + g * 0.07231 + b * 0.986039;
  const total = x + y + z;
  if (total <= 0) return { x: 0.3127, y: 0.329 };
  return {
    x: Number((x / total).toFixed(4)),
    y: Number((y / total).toFixed(4)),
  };
}
