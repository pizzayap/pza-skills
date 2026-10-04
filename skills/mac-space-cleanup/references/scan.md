# Staged read-only scan

## Baseline and access

Use macOS tools already present. Record the local timestamp and OS version, then
measure the Data volume (use `/` on older systems without that mount):

```sh
date '+%Y-%m-%dT%H:%M:%S%z'
sw_vers -productVersion
df -k /System/Volumes/Data
```

For the human view, direct the user to System Settings → General → Storage on
supported macOS versions. **System Data is a category, not a deletable folder**;
its total need not match a `du` subtotal. See [Apple's storage guidance](https://support.apple.com/en-us/102624).

When snapshots or a large unexplained discrepancy matter, inspect without
changing them:

```sh
tmutil listlocalsnapshots /
diskutil apfs listSnapshots /System/Volumes/Data
```

Keep the scope of each result: no Time Machine snapshots does not prove that
every APFS volume has no snapshots. Do not sum free space from volumes sharing
an APFS container. macOS can count purgeable space differently from `df`.
[Time Machine manages local snapshots automatically](https://support.apple.com/en-us/102154);
their presence is not by itself a reason to delete them.

## Discover, then narrow

Use metadata-only enumeration of immediate entries to establish which areas
exist. Start with likely relevant local roots, not all paths below at once.
Common candidates:

| Area | Places to inspect when present | Scope caution |
|---|---|---|
| Ordinary files | Downloads, Movies, locally stored Documents/Desktop, Applications | Check cloud status; do not open content or traverse Photos/media libraries by default |
| Xcode | `~/Library/Developer/Xcode`, `~/Library/Developer/CoreSimulator/Devices` | Archives, simulator data, and generated builds have different preservation needs |
| Package data | `~/.npm`, `~/Library/pnpm`, `~/.bun/install`, `~/Library/Caches`, `~/.cache` | Start with immediate children; app/model state can live here |
| Coding assistants | `~/.codex/worktrees`, `~/.codex/sessions`, app folders in `~/Library/Application Support` | Measure history/database files by metadata only; do not query their contents |
| Projects | User's known project roots | Source and ignored/untracked files may be unique; build output needs owner review |
| Backups and large app data | `~/Library/Application Support/MobileSync/Backup`, Containers/Group Containers, VM locations | Measure only; use owning apps for review, and preserve denial as a coverage gap |

Discover configured paths for installed tools only as needed; these examples
are not authoritative defaults. A manager's path query is not automatically a
read-only operation: follow the [diagnostic checks](cleanup.md#package-caches-and-developer-tools)
before invoking one. If its effects are unknown, measure existing in-scope
directories and label their configured use unverified. Do not dump complete
configs or the environment. After the path checks below, report top-level sizes
before deep per-file listings. Use scoped macOS `du`, e.g.:

```sh
du -x -k -d 1 "$HOME/Library/Developer/Xcode"
du -x -k -d 1 "$HOME/.npm"
```

`-d 1` limits output depth, **not traversal work**. Run roots separately so a
blocked/slow subtree can be canceled without losing other results. Keep commands
interruptible; check progress and cancel a branch after roughly 30–60 seconds
without useful progress unless continued work is justified. Do not restart the
same stalled cloud/provider scan. A bounded partial report is useful.

Use `du -x` to avoid crossing filesystem mounts and do not add symlink-following
flags. Before enumerating or measuring a target, inspect it and its ancestor
components with non-following metadata such as `lstat`. Compare the resolved
target with the already established, canonical allowed roots using path-component
boundaries, not a plain string prefix. A final directory can be ordinary while
an ancestor redirects it; neither a final-component symlink check nor `du -x`
prevents that traversal. Do not make a discovered link destination a new allowed
root merely to pass this check.

If a link redirects outside scope, do not enumerate or measure its destination;
report it as excluded. If resolution or permissions leave containment uncertain,
skip the target and report that gap. Recheck if paths change during the scan.
Do not follow symlinks encountered inside a scanned directory.

Exclude cloud-provider roots such as
`~/Library/Mobile Documents` and `~/Library/CloudStorage` from recursive scans by
default; Documents/Desktop may also be synced. Inspect them through Finder's
storage/download status, without opening or hydrating files. Do not assume a
symlink check alone detects all provider-managed locations.

On access denial, preserve the error and mark the size **partial / unknown**.
On a missing path, label **not found**, not “zero bytes reclaimed.” A successful
parent measurement can still include an incomplete subtree if errors occurred.
Do not discard stderr or infer success from the exit status of a sorting command.

Paths can contain tabs, newlines, quotes, and shell metacharacters. Use quoted
literal arguments, structured subprocess arguments, or NUL-safe enumeration
when automating. Do not parse arbitrary `du` output by whitespace into executable
commands. Escape unusual names in the report; never execute them.

## Focused usage evidence

Before recommending a particular cache, check its owner and any relevant active
use. Keep process inspection narrow; full command lines and environments may
contain secrets. Use app UIs, process names/PIDs, or targeted open-file evidence
as needed. Avoid a recursive open-file scan of the whole disk. Missing/limited
process access means **use unverified**, not “unused.”

If Xcode is already installed and usable, `xcrun simctl list devices --json` and
`xcrun simctl list runtimes --json` help separate devices from runtime images.
Do not install developer tools or accept setup/license changes just to scan.
Only inspect project simulator references within projects already in scope.

For a selected Git worktree, use read-only status, worktree, and ref metadata.
Use `GIT_OPTIONAL_LOCKS=0` to avoid optional index writes. Uncommitted, untracked,
ignored, unpushed, detached, or unmerged work needs preservation; a clean status
or an archived chat alone does not establish dispensability. Do not fetch remotes
or read ignored secrets to establish safety. Flag incomplete evidence instead.

## Measurement and report rules

- `du -k` reports allocated KiB; multiply by 1024 for bytes. Choose decimal GB
  (bytes / 1,000,000,000) or GiB (bytes / 1,073,741,824) and label consistently.
- Parent/child rows overlap. Even disjoint roots can share hard-linked or cloned
  storage; separate `du` calls can count the same hard-linked data again.
- APFS clones, sparse disk images, snapshots, compression, and live writes make
  a folder's measured allocation different from guaranteed physical recovery.
  A VM's virtual capacity is not its host allocation or a cleanup estimate.
- Distinguish measured allocation, apparent/logical size, owner-tool estimate,
  and `df` availability. Do not reconcile them by inventing “hidden junk.”
- Save only needed metadata. Record exact commands, exit status/errors,
  timestamps, exclusions, and whether evidence is current, supplied, or historic.
  The short user report should identify the largest useful opportunities and
  limitations; keep detailed private inventories in the local report directory.
