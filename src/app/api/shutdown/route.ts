export const runtime = "nodejs";

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

  setTimeout(() => {
    process.kill(process.pid, "SIGTERM");
  }, 500).unref();

  return Response.json({ ok: true });
}
