#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
install_dir="${PZA_RUNTIME_DIR:-$HOME/.pza-skills/lib}"

mkdir -p "$install_dir"
cp "$repo_root/lib/pza-runtime.js" "$install_dir/pza-runtime.js"
chmod 755 "$install_dir/pza-runtime.js"

printf 'Installed PZA runtime to %s\n' "$install_dir/pza-runtime.js"
