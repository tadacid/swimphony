import { z } from "zod";

import { hueAdapter } from "@/lib/lighting/hue-adapter";

export const runtime = "nodejs";

const HueUpdateSchema = z.object({
  light: z.object({
    hue: z.number().min(0).max(360),
    saturation: z.number().min(0).max(100),
    brightness: z.number().min(0).max(100),
    transitionMs: z.number().int().min(0).max(6000),
  }).strict(),
  confidence: z.number().min(0).max(1),
}).strict();

const HueToggleSchema = z.object({ enabled: z.boolean() }).strict();

export async function GET(): Promise<Response> {
  return Response.json(await hueAdapter.getStatus(true));
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    const body = HueToggleSchema.parse(await request.json());
    return Response.json(await hueAdapter.setEnabled(body.enabled));
  } catch {
    return Response.json({ error: "Invalid Hue toggle request." }, { status: 400 });
  }
}

export async function DELETE(): Promise<Response> {
  try {
    await hueAdapter.reset();
    return Response.json(await hueAdapter.getStatus(true));
  } catch (error) {
    console.error(
      "Hue default reset failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return Response.json({ error: "Hue could not return to default." }, { status: 503 });
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = HueUpdateSchema.parse(await request.json());
    await hueAdapter.update(body.light, body.confidence);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Hue update failed", error instanceof Error ? error.message : "Unknown error");
    return Response.json({ ok: false }, { status: 503 });
  }
}
