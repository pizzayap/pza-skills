# Cleanup decisions and manual routes

Read the section matching measured evidence. These are candidate workflows,
not permission to execute. Verify installed versions and current official help
before presenting exact app labels or commands. If unavailable, describe the
manual review and state what remains unverified. Do not run every example.

## Ordinary files, cloud storage, and Trash

Start with System Settings → General → Storage or Finder. For Downloads and
large local files, let the user identify what is still needed. Age, extension,
or a duplicate-looking filename is not proof that a file can be removed.

For cloud-synced data, deletion can propagate to other devices. If the goal is
only local space, use the provider's supported offload/Remove Download action
after confirming the item is uploaded and offline access is unnecessary. Never
unlink a provider folder or disable sync as a shortcut. See [Apple's iCloud Drive
file guidance](https://support.apple.com/en-gb/guide/mac-help/-mchl1a02d711/mac).

Move selected ordinary files to Trash only after review. Check which items would
be permanently removed before emptying any of it; unrelated Trash is outside
scope. Explain that storage may remain occupied until permanent removal.
For Photos, Mail, Messages, device backups, and applications, use the owner's
storage management rather than deleting package internals or databases. Confirm
the specific backup is expendable and another usable copy exists when needed.

## Xcode and simulators

| Area | What matters | Manual route |
|---|---|---|
| DerivedData | Generated builds/indexes; rebuilding and package downloads may take time. Check for builds in progress and anything the user intentionally saved there | Locate the configured DerivedData folder in Xcode settings; quit active builds and review selected project folders in Finder |
| iOS DeviceSupport | Device OS/build support and symbols; “keep the newest three” is not a universal rule | Match folders to physical device OS builds/debugging needs, then review obsolete entries individually |
| Simulator devices | Installed apps and local test data, sometimes tied to a saved UUID in project tooling | Use Xcode's device/simulator manager (Device Hub or Devices and Simulators, depending on version); inspect name, UUID, runtime, and data before removing a selected device |
| Simulator runtimes | Shared OS images; deleting devices does not remove these images | Use Xcode Settings → Components, or the installed version's platform-management UI; preserve runtimes used by retained devices and test coverage |
| Archives | Can contain release builds and debug symbols that cannot simply be recreated identically | Review through Organizer; keep needed release/debugging artifacts or make a verified backup |

Inventory devices and runtimes separately, with a keep list for each. Do not use
“unavailable” or “not booted” as evidence that device data is expendable. Never
bulk-remove CoreSimulator folders or system-managed runtime assets. Verify
retained IDs and runtime availability after cleanup. Consult [Apple's component
management documentation](https://developer.apple.com/documentation/xcode/downloading-and-installing-additional-xcode-components)
for the installed Xcode UI; old screenshots and earlier cleanup reports are not
current UI evidence.

## Package caches and developer tools

Resolve the installed executable, version, configured cache/store path, and
relevant active jobs before choosing a command. A project-local shim or version
launcher can download tooling even for discovery; do not invoke `npx`, `dlx`,
Corepack version selection, or an unverified auto-installing shim to obtain a
missing version. Use already installed tools or leave that version for review.
Avoid reading full config files that may contain registry credentials.

The discovery commands below are candidates to verify, not a read-only allowlist.
Check the installed version's documented or inspected behavior before invoking
them. Some path resolvers create temporary files/directories or hard-link probes;
pnpm's [store-path resolver](https://raw.githubusercontent.com/pnpm/pnpm/29a42efc3b/store/path/src/index.ts)
is one example. A dry-run flag also needs a check of its actual side effects.
If non-mutating behavior is not established, keep the initial scan to filesystem
metadata and label configured ownership/path information unverified. A useful
stateful diagnostic can be proposed separately with its expected writes and
scope, subject to the entrypoint's authorization boundary. Do not install or
execute the command merely to discover whether it writes.

Manager cleanup generally bypasses Trash. Explain loss of offline reuse and
future downloads/build time. Cache layout names are not reliable CLI version
numbers. Check current installed help before using flags; placeholders below
must become verified quoted paths in any command shown to the user.

| Tool/data | Discovery candidates, subject to the checks above | Candidate after review |
|---|---|---|
| npm | `npm --version`, `npm config get cache`; measure `_cacache` and `_npx` separately | `npm cache clean --force` is a native cache operation, not a general repair step. Explain the required flag and bind the confirmed cache with `--cache`. Review npx entries separately; live MCP/dev processes may run from them |
| pnpm | Inspect existing store directories first. `pnpm store path` can perform filesystem probes; use only after classifying the installed implementation's effects. Compare any reported path/version with the measured store and working directory | `pnpm store prune --store-dir <confirmed-store-base>` removes unreferenced packages. Confirm how this version maps the base to its layout; do not blindly append a version suffix or delete leftover layouts |
| Bun | `bun --version`, `bun pm cache` | `bun pm cache rm` targets its resolved cache. If the installed version requires project context, use a known in-scope project with its supported `--cwd` option; do not create a manifest or run an install just to clean |
| uv | `uv --version`, `uv cache dir` | Compare supported `uv cache prune` and `uv cache clean` effects; use an explicit confirmed cache directory. Do not manipulate cache files directly or bypass locks |
| Yarn | `yarn --version`; for Classic, `yarn cache dir` | Classic `yarn cache clean` can target a confirmed `--cache-folder`. Modern Yarn/project caches need their own version's guidance; preserve tracked/offline project artifacts |
| pip | Confirm the intended installed interpreter, then `python3 -m pip cache dir` / `info` | That interpreter's `python3 -m pip cache purge` clears its cache; do not assume every Python installation shares it |
| Homebrew | `brew --version`, `brew --cache`; preview with `brew cleanup --dry-run` | Review the preview before `brew cleanup`. `--prune=all` broadens download removal and must be explicitly included in the review; do not add autoremove/uninstall |

Native “check” commands may mutate: for example, `npm cache verify` can garbage
collect. Do not treat them as read-only scans. Avoid installs, update commands,
and manager hooks; use only verified inventory/preview commands during review.
Do not remove a whole multi-version store because one version's prune left data.
Do not clear shared caches while relevant work is active unless the owner tool's
documented concurrency guarantees cover the chosen action.

Official command references, loaded only for the selected manager:
[npm](https://docs.npmjs.com/cli/v11/commands/npm-cache/),
[pnpm](https://pnpm.io/cli/store),
[Bun](https://bun.sh/docs/pm/cli/pm),
[uv](https://docs.astral.sh/uv/concepts/cache/),
[Yarn Classic](https://classic.yarnpkg.com/lang/en/docs/cli/cache/),
[pip](https://pip.pypa.io/en/stable/cli/pip_cache/), and
[Homebrew](https://docs.brew.sh/Manpage#cleanup-options-formulacask-).
Use docs matching the installed version rather than assuming the current web
default applies to an older installation.

## Coding assistants, worktrees, and app state

Measure worktrees separately from chat history, SQLite databases, plugins, and
settings. History and app state are not disposable cache. Use the owning app's
supported worktree management after checking the associated work and preserving
needed ignored files separately. Do not delete a checkout solely because Git
status is clean. A recoverable app snapshot may not include ignored files; check
the actual operation's guarantees before recommending it.

If an app connector is available, use read-only inventory tools before a proposed
archive/removal. Treat archive operations as mutations requiring the action
record and approval. Without a connector, guide the user in the app; do not
require a plugin or reconstruct private app databases to find associations.
Keep CLI/Git-managed worktrees within their owner's supported workflow, with
the same preservation review. Never raw-delete the assistant's entire data root.

## Models, browser binaries, containers, and VMs

- Hugging Face and other local models can power transcription or offline AI.
  Keep models the user uses; review named models and shared data with the owner's
  supported tools. `cache` does not imply unused. See [Hugging Face cache
  management](https://huggingface.co/docs/huggingface_hub/guides/manage-cache).
- Playwright/Puppeteer browser downloads and cached backend binaries can serve
  active automation or development. Confirm consumers and redownload ability;
  do not launch an installer to discover whether binaries are still needed.
- Docker/container images and build cache differ from volumes holding databases.
  Use the owner's disk-usage view and targeted review. Never suggest broad system
  prune with volumes as routine cleanup. Removing images may not immediately
  shrink the VM's host disk image.
- VM disk images, app Containers/Group Containers, and unfamiliar Application
  Support folders may hold unique state. Prefer the owner's cleanup/compaction
  controls after backup review; do not delete the backing image as “cache.”

## System assets and snapshots

System-managed assets, swap, Spotlight indexes, and backup snapshots are not
routine manual deletion targets. Identify the owner and use supported controls
when a specific need is established. Do not disable Time Machine, delete all
snapshots, or force-remove `/System`, `/Library`, or `/private` contents to chase
the Storage chart. If their ownership or benefit remains unclear, retain them
and report the limitation.
