export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * clamp(amount, 0, 1);
}

export function normalize(
  value: number,
  inputMin: number,
  inputMax: number,
): number {
  if (inputMax === inputMin) return 0;
  return clamp((value - inputMin) / (inputMax - inputMin), 0, 1);
}

export function mapRange(
  value: number,
  inputMin: number,
  inputMax: number,
  outputMin: number,
  outputMax: number,
): number {
  return lerp(outputMin, outputMax, normalize(value, inputMin, inputMax));
}
