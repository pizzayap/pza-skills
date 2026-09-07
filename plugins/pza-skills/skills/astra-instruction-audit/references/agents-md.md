# Auditing AGENTS.md

Read this for root and nested AGENTS.md. Check the rules against the actual scope
and inheritance behavior supported by the project's harness; do not assume every
harness discovers nested files identically.

## Always-loaded value

Favor durable information an agent cannot cheaply infer: unusual commands,
architecture boundaries, project-specific pitfalls, and actual validation or
permission requirements. Check paths and command definitions locally. A command
existing in a manifest proves its definition, not successful execution or safety.

Question mandatory whole-repository tours, repeated document reading, generic
coding advice, historical diaries, and stale model workarounds. Explain their
effect on a realistic small task before proposing removal. Keep non-obvious
invariants even when they take several lines.

## Conditional placement

Put guidance where it applies. Root rules should carry project-wide decisions;
nested rules or linked docs can carry subsystem procedures when the harness
supports that scope. Preserve a discoverable pointer when relocating information.
Check parent/child conflicts and avoid repeating the same rule at every level.

Example: instead of requiring the asset pipeline guide before every edit, point
to it when changing asset import or export behavior. A spelling correction should
not inherit unrelated preparation unless the project has a concrete reason.

## Validation proportional to the change

Distinguish known commands and required gates from blanket encouragement to test
everything repeatedly. Keep CI, release, security, and fragile-workflow checks.
Propose narrower triggers only with evidence of the intended scope; a new model
release alone does not establish that a test requirement is redundant.

Where local testing is known to be isolated and disposable, guidance can state
what may run and which resulting failures the agent should repair and recheck.
Do not label a suite disposable, offline, free, or production-isolated from its
name alone. Check setup, fixture destinations, and documented side effects without
opening secret values; if still uncertain, retain the boundary and say why.

## Permission and persistence

Find wording that interrupts ordinary authorized work or stops after an initial
implementation. Separate permission to continue a defined safe workflow from
approval for consequential actions. Keep established release, data deletion,
credential, paid-service, and external-communication boundaries intact.

A useful completion instruction connects the requested implementation to its
relevant verification and fixes, then names where to stop. Avoid both mandatory
review after every small step and permission to keep changing anything forever.
Do not remove an approval requirement while relying on that removal to authorize
the current edit. Propose the change under the existing rule.
