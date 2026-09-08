# Migrate skill names and reviewer installations

The collection now distributes five independent skill folders. The last framework
revision remains in Git history at `e4ad25f`; the active tree does not carry a
second legacy copy.

## Standalone skill rename

| Previous name | Current name |
|---|---|
| `arewedone-plain` | `arewedone` |
| `areyousure-plain` | `areyousure` |

Use the current names for installation and invocation. The standalone workflows
and invocation options are preserved; the old `-plain` aliases are not shipped.
If the previous names are installed, install the renamed skills through the same
skill manager or copy the complete folders, then remove obsolete `-plain` copies
after checking ownership and local modifications. Repository updates do not
automatically migrate installed names.

## Retired features

- Framework implementations of `arewedone` and `areyousure`, plus `pza-settings`,
  `hook-worthy`, and `work-issue`.
- Codex/Claude plugin manifests and marketplace bundles.
- OpenCode command/agent adapters and Pi prompt aliases.
- Shared runtime, reviewer-provider configuration and settings UI, external
  model dispatch, named reviewer agents, and the optional Snyk wrapper.
- Automatic session tracking, review markers, and review-reminder hooks.
- Repository-local Impeccable hook bindings containing personal absolute paths.

Use the standalone `arewedone` for completion review and `areyousure` for plan
verification. These reuse the retired framework's names. Provider/model flags
and settings from the retired commands have no equivalent in these skills.
`hook-worthy` and `work-issue` have no replacements in this collection.

## Install the retained skills

Use `npx skills add pizzayap/pza-skills` and select the desired skills and target
harnesses, or copy whole skill folders into the harness's supported location.
Each folder includes its own references. Completion review may still need the
target project's tools to run relevant verification commands.

The old marketplace installation routes and adapter aliases are no longer
provided. Use the target harness's skill selector or native invocation syntax.
The collection does not promise identical slash commands in every harness.

## Existing machine-local installations

Changing this repository does not uninstall previously copied skills, cached
plugins, installed roles, global hooks, or settings. An old installation may
continue exposing the retired commands until you remove it. Updating retained
skills alone should not be treated as evidence that obsolete copies disappeared.

When migrating a machine:

1. Inventory PZA installations in the harnesses you actually use. Use the owning
   plugin or skill manager to remove the retired installation, then install the
   selected standalone skills. Preserve unrelated plugins and skills.
2. Inspect manually configured PZA hooks and remove those bindings before their
   scripts. The old package used session tracking and review reminders; other
   hooks are outside this migration.
3. If the old installers were used, review only PZA-owned files under
   `~/.pza-skills/` and the six reviewer roles under `~/.codex/agents/`. The old
   agent installer wrote both `.md` and `.toml` files for
   `structural-completeness-reviewer`, `code-quality-reviewer`,
   `standards-compliance-reviewer`, `spec-compliance-reviewer`, `plan-verifier`,
   and `adversarial-reviewer`. Check ownership and local modifications before
   removing anything; these names alone are not proof of ownership.
4. Refresh the harness if needed and verify the retained skills appear without
   duplicate legacy copies. Exercise a scoped review before relying on the new
   installation.

Never delete whole shared harness directories or reset global configuration as
part of this cleanup. Machine-local migration is a separate authorized action;
the repository does not ship an automatic uninstaller.

## Maintainer checks

`scripts/validate-portability.sh` was retired with its runtime, installer, and
adapter tests. Run `ruby scripts/validate-skills.rb` for the current package.
Existing behavior records remain historical evidence tied to their stated
revision/resource hash; they do not validate later changes automatically.
