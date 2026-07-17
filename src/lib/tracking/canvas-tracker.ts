import type { FishState, TrackingSource } from "@/lib/tracking/types";
import {
  confidenceFromScores,
  holdLostFish,
  normalizePointToRoi,
  scoreCandidate,
  TRACKING_TUNING,
  updateFishMotion,
  type AquariumRoi,
  type Point,
} from "@/lib/tracking/tracking-math";
import { clamp } from "@/lib/utils/math";

export type ColorProfile = {
  hue: number;
  saturation: number;
  value: number;
  hueTolerance: number;
  saturationTolerance: number;
  valueTolerance: number;
};

export type TrackerContour = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TrackingFrame = {
  fish: FishState;
  contour: TrackerContour | null;
  mask: Uint8ClampedArray;
  analysisWidth: number;
  analysisHeight: number;
  candidateCount: number;
};

type Candidate = {
  position: Point;
  contour: TrackerContour;
  area: number;
  score: number;
  continuity: number;
};

type Hsv = { h: number; s: number; v: number };

function rgbToHsv(red: number, green: number, blue: number): Hsv {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;

  if (delta > 0) {
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
  }

  if (hue < 0) hue += 360;
  return { h: hue, s: max === 0 ? 0 : delta / max, v: max };
}

function hueDistance(first: number, second: number): number {
  const difference = Math.abs(first - second) % 360;
  return Math.min(difference, 360 - difference);
}

export function colorSimilarity(hsv: Hsv, profile: ColorProfile): number {
  if (hsv.s < Math.max(0.08, profile.saturation - 0.34)) return 0;
  if (hsv.v < Math.max(0.16, profile.value - 0.42)) return 0;

  const hueScore = 1 - clamp(hueDistance(hsv.h, profile.hue) / profile.hueTolerance, 0, 1);
  const saturationScore = 1 - clamp(
    Math.abs(hsv.s - profile.saturation) / profile.saturationTolerance,
    0,
    1,
  );
  const valueScore = 1 - clamp(
    Math.abs(hsv.v - profile.value) / profile.valueTolerance,
    0,
    1,
  );

  return hueScore * 0.72 + saturationScore * 0.16 + valueScore * 0.12;
}

function shapeScore(areaRatio: number, width: number, height: number, fill: number): number {
  const aspect = width / Math.max(1, height);
  const aspectScore = aspect >= 0.22 && aspect <= 4.6 ? 1 : 0.25;
  const areaScore = areaRatio >= 0.00035 && areaRatio <= 0.055
    ? 1
    : areaRatio < 0.00035
      ? clamp(areaRatio / 0.00035, 0, 1)
      : clamp(0.09 / areaRatio, 0, 1);
  const fillScore = clamp(fill / 0.48, 0, 1);
  return areaScore * 0.48 + aspectScore * 0.28 + fillScore * 0.24;
}

function cleanMask(
  mask: Uint8ClampedArray,
  width: number,
  left: number,
  top: number,
  right: number,
  bottom: number,
): Uint8ClampedArray {
  const cleaned = new Uint8ClampedArray(mask.length);

  for (let y = top + 1; y < bottom - 1; y += 1) {
    for (let x = left + 1; x < right - 1; x += 1) {
      const index = y * width + x;
      let neighbors = 0;
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (offsetX === 0 && offsetY === 0) continue;
          if (mask[index + offsetY * width + offsetX]) neighbors += 1;
        }
      }

      if ((mask[index] && neighbors >= 2) || (!mask[index] && neighbors >= 6)) {
        cleaned[index] = 255;
      }
    }
  }

  return cleaned;
}

export class CanvasFishTracker {
  private previousLuma: Uint8ClampedArray | null = null;
  private previousFish: FishState | undefined;
  private missedFrames = 0;

  constructor(private readonly source: TrackingSource = "sample-video") {}

  reset(): void {
    this.previousLuma = null;
    this.previousFish = undefined;
    this.missedFrames = 0;
  }

  sampleColor(
    context: CanvasRenderingContext2D,
    point: Point,
  ): ColorProfile {
    const { width, height } = context.canvas;
    const centerX = Math.round(point.x * width);
    const centerY = Math.round(point.y * height);
    const radius = Math.max(4, Math.round(width / 100));
    const image = context.getImageData(
      Math.max(0, centerX - radius),
      Math.max(0, centerY - radius),
      Math.min(radius * 2 + 1, width - Math.max(0, centerX - radius)),
      Math.min(radius * 2 + 1, height - Math.max(0, centerY - radius)),
    );
    let hueX = 0;
    let hueY = 0;
    let saturation = 0;
    let value = 0;
    let weightTotal = 0;

    for (let index = 0; index < image.data.length; index += 4) {
      const hsv = rgbToHsv(
        image.data[index],
        image.data[index + 1],
        image.data[index + 2],
      );
      const weight = 0.25 + hsv.s * 0.75;
      const radians = (hsv.h * Math.PI) / 180;
      hueX += Math.cos(radians) * weight;
      hueY += Math.sin(radians) * weight;
      saturation += hsv.s * weight;
      value += hsv.v * weight;
      weightTotal += weight;
    }

    const hue = ((Math.atan2(hueY, hueX) * 180) / Math.PI + 360) % 360;
    return {
      hue,
      saturation: saturation / Math.max(1, weightTotal),
      value: value / Math.max(1, weightTotal),
      hueTolerance: 24,
      saturationTolerance: 0.46,
      valueTolerance: 0.5,
    };
  }

  process(
    context: CanvasRenderingContext2D,
    roi: AquariumRoi,
    profile: ColorProfile,
    timestamp: number,
  ): TrackingFrame {
    const { width, height } = context.canvas;
    const image = context.getImageData(0, 0, width, height);
    const pixelCount = width * height;
    const rawMask = new Uint8ClampedArray(pixelCount);
    const colorScores = new Float32Array(pixelCount);
    const motionScores = new Float32Array(pixelCount);
    const currentLuma = new Uint8ClampedArray(pixelCount);
    const left = clamp(Math.floor(roi.x * width), 0, width - 1);
    const top = clamp(Math.floor(roi.y * height), 0, height - 1);
    const right = clamp(Math.ceil((roi.x + roi.width) * width), left + 1, width);
    const bottom = clamp(Math.ceil((roi.y + roi.height) * height), top + 1, height);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const pixelIndex = y * width + x;
        const dataIndex = pixelIndex * 4;
        const red = image.data[dataIndex];
        const green = image.data[dataIndex + 1];
        const blue = image.data[dataIndex + 2];
        const luma = Math.round(red * 0.299 + green * 0.587 + blue * 0.114);
        currentLuma[pixelIndex] = luma;

        if (x < left || x >= right || y < top || y >= bottom) continue;
        const similarity = colorSimilarity(rgbToHsv(red, green, blue), profile);
        const motion = this.previousLuma
          ? clamp(Math.abs(luma - this.previousLuma[pixelIndex]) / 32, 0, 1)
          : 0.45;
        colorScores[pixelIndex] = similarity;
        motionScores[pixelIndex] = motion;
        if (similarity >= TRACKING_TUNING.maskThreshold) rawMask[pixelIndex] = 255;
      }
    }

    const mask = cleanMask(rawMask, width, left, top, right, bottom);
    const candidates = this.findCandidates(
      mask,
      colorScores,
      motionScores,
      width,
      height,
      roi,
      left,
      top,
      right,
      bottom,
    );
    this.previousLuma = currentLuma;

    const best = candidates[0];
    if (!best || best.score < 0.36) {
      this.missedFrames += 1;
      const fish = holdLostFish(
        this.previousFish,
        timestamp,
        this.missedFrames,
        this.source,
      );
      this.previousFish = fish;
      return {
        fish,
        contour: null,
        mask,
        analysisWidth: width,
        analysisHeight: height,
        candidateCount: candidates.length,
      };
    }

    this.missedFrames = 0;
    const confidence = confidenceFromScores(
      best.score,
      candidates[1]?.score ?? 0,
      best.continuity,
    );
    const fish = updateFishMotion(
      best.position,
      best.area,
      confidence,
      timestamp,
      this.previousFish,
      this.source,
    );
    this.previousFish = fish;

    return {
      fish,
      contour: best.contour,
      mask,
      analysisWidth: width,
      analysisHeight: height,
      candidateCount: candidates.length,
    };
  }

  private findCandidates(
    mask: Uint8ClampedArray,
    colorScores: Float32Array,
    motionScores: Float32Array,
    width: number,
    height: number,
    roi: AquariumRoi,
    left: number,
    top: number,
    right: number,
    bottom: number,
  ): Candidate[] {
    const visited = new Uint8Array(mask.length);
    const queue = new Int32Array(mask.length);
    const roiArea = Math.max(1, (right - left) * (bottom - top));
    const minimumArea = Math.max(10, Math.round(roiArea * 0.00016));
    const maximumArea = Math.round(roiArea * 0.075);
    const candidates: Candidate[] = [];

    for (let y = top; y < bottom; y += 1) {
      for (let x = left; x < right; x += 1) {
        const start = y * width + x;
        if (!mask[start] || visited[start]) continue;

        let head = 0;
        let tail = 0;
        queue[tail] = start;
        tail += 1;
        visited[start] = 1;
        let area = 0;
        let sumX = 0;
        let sumY = 0;
        let colorTotal = 0;
        let motionTotal = 0;
        let minX = x;
        let maxX = x;
        let minY = y;
        let maxY = y;

        while (head < tail) {
          const index = queue[head];
          head += 1;
          const currentX = index % width;
          const currentY = Math.floor(index / width);
          area += 1;
          sumX += currentX;
          sumY += currentY;
          colorTotal += colorScores[index];
          motionTotal += motionScores[index];
          minX = Math.min(minX, currentX);
          maxX = Math.max(maxX, currentX);
          minY = Math.min(minY, currentY);
          maxY = Math.max(maxY, currentY);

          for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
            for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
              if (offsetX === 0 && offsetY === 0) continue;
              const neighborX = currentX + offsetX;
              const neighborY = currentY + offsetY;
              if (
                neighborX < left ||
                neighborX >= right ||
                neighborY < top ||
                neighborY >= bottom
              ) continue;
              const neighbor = neighborY * width + neighborX;
              if (!mask[neighbor] || visited[neighbor]) continue;
              visited[neighbor] = 1;
              queue[tail] = neighbor;
              tail += 1;
            }
          }
        }

        if (area < minimumArea || area > maximumArea) continue;
        const fullPoint = { x: sumX / area / width, y: sumY / area / height };
        const position = normalizePointToRoi(fullPoint, roi);
        const distance = this.previousFish
          ? Math.hypot(position.x - this.previousFish.x, position.y - this.previousFish.y)
          : 0.2;
        const continuity = this.previousFish
          ? Math.exp(-distance / 0.28)
          : 0.62;
        const boxWidth = maxX - minX + 1;
        const boxHeight = maxY - minY + 1;
        const areaRatio = area / roiArea;
        const signals = {
          colorSimilarity: colorTotal / area,
          motionScore: motionTotal / area,
          previousPositionProximity: continuity,
          shapeScore: shapeScore(
            areaRatio,
            boxWidth,
            boxHeight,
            area / (boxWidth * boxHeight),
          ),
        };

        candidates.push({
          position,
          contour: {
            x: minX / width,
            y: minY / height,
            width: boxWidth / width,
            height: boxHeight / height,
          },
          area: areaRatio,
          score: scoreCandidate(signals),
          continuity,
        });
      }
    }

    return candidates.sort((first, second) => second.score - first.score);
  }
}

export function drawVideoFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
): CanvasRenderingContext2D | null {
  if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) return null;
  const width = TRACKING_TUNING.analysisWidth;
  const height = Math.round(width * (video.videoHeight / video.videoWidth));
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context?.drawImage(video, 0, 0, width, height);
  return context;
}
