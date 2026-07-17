# 12. OpenAI Setup

## Environment

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Set:

```text
OPENAI_API_KEY=<your key>
OPENAI_MODEL=gpt-5.6-terra
```

The API key must stay server-side. Do not prefix it with `NEXT_PUBLIC_`, place it in client components, print it in logs, or commit `.env.local`.

## Model choice

The documented default is `gpt-5.6-terra` because the AI Conductor is a structured creative-configuration task where cost balance matters. The environment variable allows another available GPT-5.6 variant without changing source code.

## Event cost note

Build Week Codex credits and OpenAI API usage are separate. Check the official event FAQ and your OpenAI platform usage before running repeated API tests.

## Test prompts

```text
Quiet midnight aquarium with glassy high notes and slow blue-green light.
```

```text
Warm minimal ambient music. Gold accents only on sharp turns. Never flash.
```

```text
Playful digital ripples, limited to four notes per second, with calm cyan light.
```

Verify that each returns a valid preset, changes the performance clearly, and stays inside safety limits.
