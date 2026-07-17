import { DEFAULT_PRESET } from "@/lib/performance/default-preset";
import { generatePresetWithCodex } from "@/lib/performance/codex-conductor";

export const runtime = "nodejs";

type RequestBody = {
  prompt?: unknown;
};

function fallbackResponse(warning: string) {
  return Response.json({
    preset: DEFAULT_PRESET,
    source: "fallback" as const,
    model: "built-in safe preset",
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
  if (prompt.length > 800) {
    return Response.json(
      { error: "Keep the mood prompt under 800 characters." },
      { status: 400 },
    );
  }

  try {
    const result = await generatePresetWithCodex(prompt);
    return Response.json({
      preset: result.preset,
      source: "codex-local" as const,
      model: result.model,
    });
  } catch (error) {
    console.error(
      "Local Codex Conductor failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return fallbackResponse(
      "Local Codex was unavailable. The built-in safe preset remains active.",
    );
  }
}
