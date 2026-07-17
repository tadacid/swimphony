# 12. Local Codex Setup

## Authentication

Swimphony uses the local Codex CLI instead of a separate OpenAI API key. Confirm that Codex is installed and signed in with ChatGPT:

```bash
codex --version
codex login status
```

The local Conductor starts `codex app-server` over private stdio for one short-lived generation. It is not exposed over the network.

## Environment

Create `.env.local` from `.env.example` and optionally tune:

```text
SWIMPHONY_CODEX_MODEL=gpt-5.6-terra
SWIMPHONY_CODEX_EFFORT=low
SWIMPHONY_CODEX_TIMEOUT_MS=45000
```

`low` keeps mood generation responsive. Every result is constrained by JSON Schema and validated again with Zod before it reaches sound or light.

## Test prompts

```text
静かな深夜の水族館。透明感のある高音と青緑のゆっくりした光。点滅なし。
```

```text
暖かく穏やかな朝。丸い音色と金色の光。急な変化はなし。
```

```text
遊び心のある8-bitの水紋。音は軽やかに、光は落ち着いて絶対に点滅しない。
```

Verify that each returns `source: codex-local`, changes the performance clearly, and stays inside safety limits. If local Codex cannot start or the result is invalid, the route returns the built-in safe preset.
