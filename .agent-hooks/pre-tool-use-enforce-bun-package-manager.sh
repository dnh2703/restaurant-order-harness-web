#!/bin/sh

set -eu

payload=$(cat)

command=$(
  printf '%s' "$payload" |
    python3 -c '
import json
import sys

try:
    payload = json.load(sys.stdin)
except json.JSONDecodeError:
    sys.exit(0)

tool_input = payload.get("tool_input")
if not isinstance(tool_input, dict):
    sys.exit(0)

command = tool_input.get("command") or tool_input.get("cmd") or ""
if isinstance(command, str):
    print(command)
'
)

if [ -z "${command:-}" ]; then
  exit 0
fi

segments=$(printf '%s' "$command" | sed 's/&&/\
/g; s/||/\
/g; s/[;|()]/\
/g')

blocked=0

while IFS= read -r segment; do
  # Intentional word splitting: this hook only needs the command position,
  # not full shell evaluation.
  # shellcheck disable=SC2086
  set -- $segment

  while [ "$#" -gt 0 ]; do
    case "$1" in
      sudo | command | exec | env | time | builtin)
        shift
        ;;
      *=*)
        shift
        ;;
      *)
        command_name=${1##*/}

        case "$command_name" in
          npm | npx | pnpm | pnpx | yarn | yarnpkg | corepack)
            echo "Blocked by pre-tool-use-enforce-bun-package-manager: use bun or bunx only in this repo. Do not use npm, npx, pnpm, pnpx, yarn, yarnpkg, or corepack." >&2
            blocked=1
            break 2
            ;;
        esac

        break
        ;;
    esac
  done
done <<AGENT_HOOK_SEGMENTS
$segments
AGENT_HOOK_SEGMENTS

if [ "$blocked" -eq 1 ]; then
  exit 2
fi

exit 0
