# Auditing skills

Read this for SKILL.md and its directly linked resources. Review portfolio
discovery first, then the relevant workflow. These are decision criteria, not
mandatory sections to add to every skill.

## Selection cost

Names and descriptions are exposed before the body is selected. Look for the
task the skill owns, a concrete activation condition, and enough differentiation
from neighboring skills. Remove promotional claims, exhaustive keyword lists,
and commands to activate whenever a loosely related technology appears.

Example: a release-note skill should match a request to prepare release notes.
It should not demand activation for every commit or documentation edit. Test both
requests against its description and neighboring skills. Narrow accidental
overreach while preserving intended users and explicit invocation contracts.

A large inventory merits inspection, not automatic uninstalling. Recommend
consolidation only when workflows actually duplicate each other; preserve useful
specializations and report installed copies outside the authorized scope.

## Context when needed

Ask which instructions are useful on every invocation. Keep purpose, scope,
essential constraints, and routing in the entrypoint. Move substantial optional
procedures into references with a clear condition for reading each one. Do not
move essential permissions or safety boundaries to an optional reference.

For a short, single-purpose skill, one file can be the clearest design. Do not
introduce a router, empty folders, or a forced reference structure. Check that
links resolve relative to their containing file and that resources moved out of
the body are still discoverable at the moment they matter.

## Instructions that affect outcomes

Keep domain knowledge, unusual environment constraints, proven failure modes,
and concrete acceptance criteria. Trim generic exhortations and duplicated
manuals. Replace arbitrary itineraries with outcomes and decision criteria when
ordering carries no correctness or safety value. Keep exact steps for fragile
interfaces, irreversible operations, reproducibility, or required policy.

Bundle scripts when repeatable mechanics justify them. Inspect existing scripts
and callers before recommending removal; do not replace deterministic operations
with improvised prose to make the skill shorter.

## Completion and authority

Check whether the skill finishes the user's requested outcome or stops at a
first draft despite remaining authorized work. State relevant validation and
repair work, plus the real stopping boundary. Avoid unlimited improvement loops.

An update request can authorize ordinary edits; it does not grant new authority
to publish, spend money, change access, or weaken existing approval rules. Flag
unnecessary repeated permission prompts separately from genuine boundaries.
Preserve explicit-only discovery when chosen by the user; do not change invocation
policy as an incidental simplification.
