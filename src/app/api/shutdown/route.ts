import { spawn } from "node:child_process";

import { hueAdapter } from "@/lib/lighting/hue-adapter";

export const runtime = "nodejs";

const CLOSE_SWIMPHONY_TAB_SCRIPT = `
tell application "Google Chrome"
  repeat with browserWindow in windows
    repeat with tabIndex from (count of tabs of browserWindow) to 1 by -1
      set browserTab to tab tabIndex of browserWindow
      set tabUrl to URL of browserTab
      if tabUrl starts with "http://localhost:3000/" or tabUrl starts with "http://127.0.0.1:3000/" then
        close browserTab
      end if
    end repeat
  end repeat
end tell
`.trim();

function isLocalRequest(request: Request): boolean {
  const host = request.headers.get("host") ?? "";
  const origin = request.headers.get("origin") ?? "";
  const localHost = host === "localhost:3000" || host === "127.0.0.1:3000";
  const matchingOrigin = origin === `http://${host}`;

  return localHost && matchingOrigin;
}

export async function POST(request: Request): Promise<Response> {
  if (!isLocalRequest(request)) {
    return Response.json({ error: "Local requests only." }, { status: 403 });
  }

  try {
    await hueAdapter.reset();
  } catch (error) {
    console.error(
      "Hue reset during shutdown failed",
      error instanceof Error ? error.message : "Unknown error",
    );
  }

  if (process.platform === "darwin") {
    setTimeout(() => {
      const child = spawn(
        "/usr/bin/osascript",
        ["-e", CLOSE_SWIMPHONY_TAB_SCRIPT],
        { detached: true, stdio: "ignore" },
      );
      child.unref();
    }, 180).unref();
  }

  setTimeout(() => {
    process.kill(process.pid, "SIGTERM");
  }, 1200).unref();

  return Response.json({ ok: true });
}
