import { access } from "node:fs/promises";
import path from "node:path";

const required = [
  "AGENTS.md",
  "START_HERE.md",
  "docs/01-project-brief.md",
  "docs/04-tracking-spec.md",
  "prompts/01-phase1-tracking.md",
  "public/demo/sample-telemetry.json",
  "public/references/aquarium-front.jpeg",
  "public/references/aquarium-side.jpeg",
];

const optional = ["public/demo/goldfish-demo.mp4", ".env.local"];

async function exists(relativePath) {
  try {
    await access(path.resolve(process.cwd(), relativePath));
    return true;
  } catch {
    return false;
  }
}

let failed = false;

console.log("Swimphony readiness check\n");
for (const file of required) {
  const present = await exists(file);
  console.log(`${present ? "✓" : "✗"} required  ${file}`);
  if (!present) failed = true;
}

for (const file of optional) {
  const present = await exists(file);
  console.log(`${present ? "✓" : "·"} optional  ${file}`);
}

if (!(await exists("public/demo/goldfish-demo.mp4"))) {
  console.log(
    "\nNext required user action: add a 40–60 second front-view video at public/demo/goldfish-demo.mp4",
  );
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log("\nStarter handoff files are present.");
}
