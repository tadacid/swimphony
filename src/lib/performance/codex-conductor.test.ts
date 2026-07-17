import { describe, expect, it } from "vitest";

import { extractFinalAgentMessage } from "@/lib/performance/codex-conductor";

describe("Codex conductor protocol", () => {
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
