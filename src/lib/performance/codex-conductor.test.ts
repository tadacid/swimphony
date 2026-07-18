import { describe, expect, it } from "vitest";

import {
  extractFinalAgentMessage,
  resolveCodexExecutable,
} from "@/lib/performance/codex-conductor";

describe("Codex conductor protocol", () => {
  it("uses an explicitly configured local Codex executable", () => {
    expect(resolveCodexExecutable("/custom/codex", "linux")).toBe(
      "/custom/codex",
    );
  });

  it("uses the ChatGPT-bundled Codex when it is installed", () => {
    expect(resolveCodexExecutable(undefined, "darwin")).toBe(
      "/Applications/ChatGPT.app/Contents/Resources/codex",
    );
  });

  it("extracts the final structured agent message", () => {
    const text = extractFinalAgentMessage({
      turn: {
        items: [
          { type: "reasoning", text: "hidden" },
          { type: "agentMessage", text: '{"name":"Moon Water"}' },
        ],
      },
    });
    expect(text).toBe('{"name":"Moon Water"}');
  });

  it("rejects a completed turn without an agent message", () => {
    expect(() => extractFinalAgentMessage({ turn: { items: [] } })).toThrow(
      "without a preset message",
    );
  });
});
