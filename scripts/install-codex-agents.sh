#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
agents_dir="${CODEX_AGENTS_DIR:-$HOME/.codex/agents}"
newline=$'\n'
carriage_return=$'\r'

case "$agents_dir" in
  *"'"*|*"$newline"*|*"$carriage_return"*)
    printf 'Unsafe CODEX_AGENTS_DIR: path must not contain single quotes or newlines\n' >&2
    exit 1
    ;;
esac

agents_dir_abs="$(mkdir -p "$agents_dir" && cd "$agents_dir" && pwd -P)"

case "$agents_dir_abs" in
  *"'"*|*"$newline"*|*"$carriage_return"*)
    printf 'Unsafe CODEX_AGENTS_DIR: resolved path must not contain single quotes or newlines\n' >&2
    exit 1
    ;;
esac

agents=(
  structural-completeness-reviewer
  code-quality-reviewer
  standards-compliance-reviewer
  spec-compliance-reviewer
  plan-verifier
  adversarial-reviewer
)

for agent in "${agents[@]}"; do
  source_file="$repo_root/agents/$agent.md"
  target_file="$agents_dir_abs/$agent.md"
  target_toml="$agents_dir_abs/$agent.toml"
  source_real="$(cd "$(dirname "$source_file")" && pwd -P)/$(basename "$source_file")"
  target_real="$(cd "$(dirname "$target_file")" && pwd -P)/$(basename "$target_file")"

  case "$agent" in
    structural-completeness-reviewer)
      description="Read-only structural reviewer for completeness, dead code, dev artifacts, dependencies, and config hygiene."
      ;;
    code-quality-reviewer)
      description="Read-only quality reviewer for correctness, security, architecture, and performance risks."
      ;;
    standards-compliance-reviewer)
      description="Read-only standards reviewer for documented repo conventions and guidance compliance."
      ;;
    spec-compliance-reviewer)
      description="Read-only spec reviewer for issue, PRD, and requirement compliance."
      ;;
    plan-verifier)
      description="Read-only plan verifier that checks technical claims against local repository evidence and bounded online evidence when available."
      ;;
    adversarial-reviewer)
      description="Read-only adversarial reviewer for security-focused review of bounded redacted git context."
      ;;
    *)
      printf 'Unknown PZA agent: %s\n' "$agent" >&2
      exit 1
      ;;
  esac

  if [ ! -f "$source_file" ]; then
    printf 'Missing canonical PZA agent: %s\n' "$source_file" >&2
    exit 1
  fi

  if [ "$source_real" = "$target_real" ]; then
    printf 'Refusing to install over canonical source agent: %s\n' "$source_file" >&2
    exit 1
  fi

  rm -f "$target_file" "$target_toml"
  cp "$source_file" "$target_file"
  chmod 644 "$target_file"

  cat > "$target_toml" <<EOF
name = "$agent"
description = "$description"
sandbox_mode = "read-only"
developer_instructions = '''
You are the PZA $agent role. Follow the installed agent markdown at $target_file.
Do not modify files. Report findings only.
'''
EOF
  chmod 644 "$target_toml"
done

printf 'Installed PZA Codex agents to %s\n' "$agents_dir_abs"
