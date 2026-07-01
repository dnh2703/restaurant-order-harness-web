# Shared Agent Hooks

`.agent-hooks/` is the shared hook implementation directory for Claude Code and
Codex. Agent-specific config files should only wire lifecycle events to scripts
in this directory instead of duplicating hook logic.

## Hook Task Naming

Use `<event>-<task>.sh` for executable hook scripts.

- **`pre-tool-use-enforce-bun-package-manager`** (`PreToolUse`) — blocks
  non-`bun`/`bunx` package managers (npm, npx, pnpm, pnpx, yarn, yarnpkg,
  corepack) from shell tool calls.

## Wiring

- Claude Code project hooks live in `.claude/settings.json` (path via `${CLAUDE_PROJECT_DIR}`).
- Codex project hooks live in `.codex/hooks.json` (path via `$(git rev-parse --show-toplevel)`).
- Codex repo-local hooks are enabled in `.codex/config.toml` (`[features] hooks = true`).
- On first run Codex prompts to trust the hook script; approve it once (the trust
  hash is then stored in `~/.codex/config.toml`).
- A blocked command exits with code `2`, which both harnesses treat as a hard block
  and surface the message on stderr back to the agent.
