import type { LightFrame } from "@/lib/performance/mapper";

export type LightingAdapterStatus = {
  enabled: boolean;
  connected: boolean;
  message: string;
};

export interface LightingAdapter {
  getStatus(): Promise<LightingAdapterStatus>;
  update(light: LightFrame, confidence: number): Promise<void>;
  reset(): Promise<void>;
}

/**
 * Placeholder adapter for Phase 4.
 *
 * Keep Hue optional and server-side. The browser should send sanitized light
 * state to a local Next.js route; the route owns bridge credentials and rate
 * limiting. Do not add credentials here.
 */
export class DisabledHueAdapter implements LightingAdapter {
  async getStatus(): Promise<LightingAdapterStatus> {
    return {
      enabled: false,
      connected: false,
      message: "Hue integration is disabled until Phase 4.",
    };
  }

  async update(): Promise<void> {
    return;
  }

  async reset(): Promise<void> {
    return;
  }
}
