import "server-only";

import { readFileSync } from "node:fs";
import { Agent, request } from "node:https";
import { isIP } from "node:net";

import type { LightFrame } from "@/lib/performance/mapper";
import { hslToHueXy, safeHueFrame } from "@/lib/lighting/hue-color";

export type LightingAdapterStatus = {
  available: boolean;
  enabled: boolean;
  connected: boolean;
  message: string;
};

export interface LightingAdapter {
  getStatus(probe?: boolean): Promise<LightingAdapterStatus>;
  setEnabled(enabled: boolean): Promise<LightingAdapterStatus>;
  update(light: LightFrame, confidence: number): Promise<void>;
  reset(): Promise<void>;
}

type HueConfig = {
  bridge: URL;
  applicationKey: string;
  groupedLightId: string;
  enabledByDefault: boolean;
};

type HueResponse = {
  errors?: Array<{ description?: string }>;
  data?: unknown[];
};

const UPDATE_INTERVAL_MS = 1000;

function readApplicationKey(): string | undefined {
  const fromEnvironment = process.env.HUE_APPLICATION_KEY?.trim();
  if (fromEnvironment) return fromEnvironment;

  const configPath = process.env.HUE_CONFIG_PATH?.trim();
  if (!configPath) return undefined;
  try {
    const parsed = JSON.parse(readFileSync(configPath, "utf8")) as {
      applicationKey?: unknown;
    };
    return typeof parsed.applicationKey === "string"
      ? parsed.applicationKey.trim() || undefined
      : undefined;
  } catch {
    return undefined;
  }
}

function isPrivateIpv4(hostname: string): boolean {
  if (isIP(hostname) !== 4) return false;
  const parts = hostname.split(".").map(Number);
  return (
    parts[0] === 10 ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168)
  );
}

function readConfig(): HueConfig | null {
  const baseUrl = process.env.HUE_BRIDGE_BASE_URL?.trim();
  const applicationKey = readApplicationKey();
  const groupedLightId = process.env.HUE_GROUPED_LIGHT_ID?.trim();
  if (!baseUrl || !applicationKey || !groupedLightId) return null;

  try {
    const bridge = new URL(baseUrl);
    if (bridge.protocol !== "https:" || !isPrivateIpv4(bridge.hostname)) return null;
    return {
      bridge,
      applicationKey,
      groupedLightId,
      enabledByDefault: process.env.HUE_ENABLED === "true",
    };
  } catch {
    return null;
  }
}

async function hueRequest(
  config: HueConfig,
  path: string,
  method: "GET" | "PUT",
  body?: Record<string, unknown>,
): Promise<HueResponse> {
  const url = new URL(path, config.bridge);
  const payload = body ? JSON.stringify(body) : undefined;

  return new Promise((resolve, reject) => {
    const req = request(
      url,
      {
        method,
        agent: new Agent({ rejectUnauthorized: false }),
        headers: {
          "hue-application-key": config.applicationKey,
          ...(payload
            ? {
                "content-type": "application/json",
                "content-length": Buffer.byteLength(payload),
              }
            : {}),
        },
        timeout: 3500,
      },
      (response) => {
        let raw = "";
        response.setEncoding("utf8");
        response.on("data", (chunk: string) => {
          raw = `${raw}${chunk}`.slice(-100_000);
        });
        response.on("end", () => {
          if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`Hue Bridge returned HTTP ${response.statusCode ?? "unknown"}.`));
            return;
          }
          try {
            const parsed = JSON.parse(raw) as HueResponse;
            const bridgeError = parsed.errors?.[0]?.description;
            if (bridgeError) reject(new Error(`Hue Bridge rejected the request: ${bridgeError}`));
            else resolve(parsed);
          } catch {
            reject(new Error("Hue Bridge returned an invalid response."));
          }
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error("Hue Bridge timed out.")));
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

export class LocalHueAdapter implements LightingAdapter {
  private enabled: boolean;
  private lastUpdateAt = 0;
  private connected = false;

  constructor(private readonly config: HueConfig | null = readConfig()) {
    this.enabled = config?.enabledByDefault ?? false;
  }

  async getStatus(probe = false): Promise<LightingAdapterStatus> {
    if (!this.config) {
      return {
        available: false,
        enabled: false,
        connected: false,
        message: "Hue is not configured.",
      };
    }
    if (probe) {
      try {
        await hueRequest(
          this.config,
          `/clip/v2/resource/grouped_light/${encodeURIComponent(this.config.groupedLightId)}`,
          "GET",
        );
        this.connected = true;
      } catch {
        this.connected = false;
      }
    }
    return {
      available: true,
      enabled: this.enabled,
      connected: this.connected,
      message: this.connected
        ? this.enabled ? "Hue is following Virtual Light." : "Hue is ready."
        : "Hue is configured but not connected.",
    };
  }

  async setEnabled(enabled: boolean): Promise<LightingAdapterStatus> {
    if (!this.config) return this.getStatus();
    this.enabled = enabled;
    return this.getStatus(true);
  }

  async update(light: LightFrame, confidence: number): Promise<void> {
    if (!this.config || !this.enabled) return;
    const now = Date.now();
    if (now - this.lastUpdateAt < UPDATE_INTERVAL_MS) return;
    this.lastUpdateAt = now;

    const safe = safeHueFrame(light, confidence);
    const xy = hslToHueXy(safe.hue, safe.saturation, safe.brightness);
    await hueRequest(
      this.config,
      `/clip/v2/resource/grouped_light/${encodeURIComponent(this.config.groupedLightId)}`,
      "PUT",
      {
        on: { on: true },
        dimming: { brightness: safe.brightness },
        color: { xy },
        dynamics: { duration: safe.transitionMs },
      },
    );
    this.connected = true;
  }

  async reset(): Promise<void> {
    if (!this.config || !this.enabled) return;
    await this.update(
      { hue: 40, saturation: 12, brightness: 12, transitionMs: 5000 },
      0,
    );
  }
}

const globalHue = globalThis as typeof globalThis & {
  swimphonyHueAdapter?: LocalHueAdapter;
};

export const hueAdapter =
  globalHue.swimphonyHueAdapter ??
  (globalHue.swimphonyHueAdapter = new LocalHueAdapter());
