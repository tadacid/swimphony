import "server-only";

import { readFileSync } from "node:fs";
import { Agent as HttpAgent, request as httpRequest } from "node:http";
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
  update(light: LightFrame, confidence: number, forceOutput?: boolean): Promise<void>;
  reset(): Promise<void>;
}

type HueConfig = {
  bridge: URL;
  applicationKey: string;
  groupedLightId: string;
  legacyGroupId?: string;
  enabledByDefault: boolean;
};

type HueResponse = {
  errors?: Array<{ description?: string }>;
  data?: unknown[];
};

type PendingHueUpdate = {
  light: LightFrame;
  confidence: number;
  forceOutput: boolean;
};

const FLOW_UPDATE_INTERVAL_MS = 1000;
const SNAP_UPDATE_INTERVAL_MS = 100;
const HUE_ADAPTER_VERSION = 5;
const HUE_AGENT = new Agent({
  rejectUnauthorized: false,
  keepAlive: true,
  maxSockets: 2,
});
const HUE_V1_AGENT = new HttpAgent({ keepAlive: true, maxSockets: 2 });

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
      legacyGroupId: process.env.HUE_V1_GROUP_ID?.trim() || undefined,
      enabledByDefault: process.env.HUE_ENABLED === "true",
    };
  } catch {
    return null;
  }
}

async function hueV1GroupRequest(
  config: HueConfig,
  body: Record<string, unknown>,
): Promise<void> {
  if (!config.legacyGroupId) throw new Error("Hue v1 group is not configured.");
  const url = new URL(
    `/api/${encodeURIComponent(config.applicationKey)}/groups/${encodeURIComponent(config.legacyGroupId)}/action`,
    `http://${config.bridge.hostname}`,
  );
  const payload = JSON.stringify(body);

  await new Promise<void>((resolve, reject) => {
    const req = httpRequest(
      url,
      {
        method: "PUT",
        agent: HUE_V1_AGENT,
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(payload),
        },
        timeout: 1500,
      },
      (response) => {
        let raw = "";
        response.setEncoding("utf8");
        response.on("data", (chunk: string) => {
          raw = `${raw}${chunk}`.slice(-20_000);
        });
        response.on("end", () => {
          if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error("Hue v1 group request failed."));
            return;
          }
          try {
            const parsed = JSON.parse(raw) as Array<{ error?: { description?: string } }>;
            const bridgeError = parsed.find((item) => item.error)?.error?.description;
            if (bridgeError) reject(new Error(`Hue Bridge rejected the update: ${bridgeError}`));
            else resolve();
          } catch {
            reject(new Error("Hue Bridge returned an invalid v1 response."));
          }
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error("Hue Bridge timed out.")));
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
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
        agent: HUE_AGENT,
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
  private pendingOperation: Promise<void> = Promise.resolve();
  private queuedUpdate: PendingHueUpdate | null = null;
  private updateInFlight = false;

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

  async update(light: LightFrame, confidence: number, forceOutput = false): Promise<void> {
    if (!this.config || !this.enabled) return;
    const config = this.config;
    const now = Date.now();
    const updateIntervalMs = light.transitionMs < 1200
      ? SNAP_UPDATE_INTERVAL_MS
      : FLOW_UPDATE_INTERVAL_MS;
    if (now - this.lastUpdateAt < updateIntervalMs) return;
    if (this.updateInFlight) {
      this.queuedUpdate = { light, confidence, forceOutput };
      return;
    }
    this.lastUpdateAt = now;
    this.updateInFlight = true;

    const operation = this.pendingOperation
      .catch(() => undefined)
      .then(async () => {
        let next: PendingHueUpdate | null = { light, confidence, forceOutput };
        while (next && this.enabled) {
          const current: PendingHueUpdate = next;
          this.queuedUpdate = null;
          const safe = safeHueFrame(
            current.light,
            current.forceOutput ? 1 : current.confidence,
          );
          const xy = hslToHueXy(safe.hue, safe.saturation, 50);
          if (config.legacyGroupId && safe.transitionMs === 0) {
            await hueV1GroupRequest(config, safe.brightness <= 0
              ? { on: false, transitiontime: 0 }
              : {
                  on: true,
                  bri: Math.round((safe.brightness / 100) * 254),
                  xy: [xy.x, xy.y],
                  transitiontime: 0,
                });
          } else {
            await hueRequest(
              config,
              `/clip/v2/resource/grouped_light/${encodeURIComponent(config.groupedLightId)}`,
              "PUT",
              {
                on: { on: safe.brightness > 0 },
                ...(safe.brightness > 0
                  ? { dimming: { brightness: safe.brightness }, color: { xy } }
                  : {}),
                dynamics: { duration: safe.transitionMs },
              },
            );
          }
          this.connected = true;
          next = this.queuedUpdate;
        }
      });
    this.pendingOperation = operation;
    try {
      await operation;
    } finally {
      this.updateInFlight = false;
    }
  }

  async reset(): Promise<void> {
    if (!this.config) return;
    const config = this.config;
    this.enabled = false;
    this.queuedUpdate = null;
    const defaultWarmWhite = { x: 0.3684, y: 0.3638 };
    const operation = this.pendingOperation
      .catch(() => undefined)
      .then(async () => {
        await hueRequest(
          config,
          `/clip/v2/resource/grouped_light/${encodeURIComponent(config.groupedLightId)}`,
          "PUT",
          {
            on: { on: true },
            dimming: { brightness: 100 },
            color: { xy: defaultWarmWhite },
            dynamics: { duration: 2500 },
          },
        );
      });
    this.pendingOperation = operation;
    await operation;
    this.lastUpdateAt = Date.now();
    this.connected = true;
  }
}

const globalHue = globalThis as typeof globalThis & {
  swimphonyHueAdapter?: LocalHueAdapter;
  swimphonyHueAdapterVersion?: number;
};

if (
  !globalHue.swimphonyHueAdapter ||
  globalHue.swimphonyHueAdapterVersion !== HUE_ADAPTER_VERSION
) {
  globalHue.swimphonyHueAdapter = new LocalHueAdapter();
  globalHue.swimphonyHueAdapterVersion = HUE_ADAPTER_VERSION;
}

export const hueAdapter = globalHue.swimphonyHueAdapter;
