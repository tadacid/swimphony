import OpenAI from "openai";

import { DEFAULT_PRESET } from "@/lib/performance/default-preset";
import { PERFORMANCE_PRESET_JSON_SCHEMA } from "@/lib/performance/preset-json-schema";
import { PerformancePresetSchema } from "@/lib/performance/preset-schema";

export const runtime = "nodejs";

const SYSTEM_INSTRUCTIONS = `
You are the audiovisual conductor for Swimphony, an installation where one
ordinary camera turns a goldfish's natural movement into music and ambient
light. Convert the user's creative direction into a restrained, coherent
performance preset.

Requirements:
- Prefer calm musical relationships over random or frantic behavior.
- Use the supplied schema exactly.
- Never create flashing, strobing, abrupt high-brightness behavior, or unsafe
  sound levels.
- Light transitions must be slow and ambient.
- Keep the preset useful for one fish moving in a home aquarium.
- The description must be concise and explain the audible/visible character.
`.trim();

type RequestBody = {
  prompt?: unknown;
};

function fallbackResponse(warning: string) {
  return Response.json({
    preset: DEFAULT_PRESET,
    source: "fallback" as const,
    model: process.env.OPENAI_MODEL ?? "gpt-5.6-terra",
    warning,
  });
}

export async function POST(request: Request): Promise<Response> {
  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return Response.json({ error: "A mood prompt is required." }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return fallbackResponse(
      "OPENAI_API_KEY is not configured. Using the built-in safe preset.",
    );
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-5.6-terra";
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const response = await client.responses.create({
      model,
      instructions: SYSTEM_INSTRUCTIONS,
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name: "swimphony_performance_preset",
          strict: true,
          schema: PERFORMANCE_PRESET_JSON_SCHEMA,
        },
      },
    });

    if (!response.output_text) {
      return fallbackResponse("GPT-5.6 returned no preset text.");
    }

    const parsedJson: unknown = JSON.parse(response.output_text);
    const parsedPreset = PerformancePresetSchema.safeParse(parsedJson);

    if (!parsedPreset.success) {
      console.error("Invalid GPT-5.6 preset", parsedPreset.error.flatten());
      return fallbackResponse(
        "GPT-5.6 returned a preset that failed safety validation.",
      );
    }

    return Response.json({
      preset: parsedPreset.data,
      source: "gpt-5.6" as const,
      model,
      requestId: response._request_id,
    });
  } catch (error) {
    console.error("AI Conductor request failed", error);
    return fallbackResponse(
      "AI Conductor could not reach GPT-5.6. Using the built-in safe preset.",
    );
  }
}
