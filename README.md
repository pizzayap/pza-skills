# PZA-skills

[![skills.sh](https://skills.sh/b/pizzayap/pza-skills)](https://skills.sh/pizzayap/pza-skills)

Independent skills for reviewing changes, checking plans, and maintaining project
guidance. Each skill lives in `skills/<name>/` with a
`SKILL.md` entrypoint and any references it needs.

## Install

Choose the skills and target agents interactively:

```bash
npx skills add pizzayap/pza-skills
```

Install one skill or list the catalog first:

```bash
npx skills add pizzayap/pza-skills --skill arewedone-plain
npx skills add pizzayap/pza-skills --list
```

For user-wide installation, add `--global`. To update installed skills, use
`npx skills update`. See the [skills CLI](https://github.com/vercel-labs/skills)
for supported agents and installation options. The CLI requires Node.js/npm;
the review and guidance skills themselves require no runtime installation.

You can also copy a complete skill folder into your harness's skill directory.
Copy its references too. Codex, OpenCode, and Pi support `.agents/skills/` and
`~/.agents/skills/`; Claude Code uses `.claude/skills/` and `~/.claude/skills/`.
Discovery and invocation vary by harness; use its skill selector or explicitly
ask it to use the installed skill. See the official documentation for
[Codex](https://learn.chatgpt.com/docs/build-skills),
[Claude Code](https://code.claude.com/docs/en/skills),
[OpenCode](https://opencode.ai/docs/skills), and
[Pi](https://pi.dev/docs/latest/skills).

## Skills

| Skill | Use it for | Requirements |
|---|---|---|
| [arewedone-plain](skills/arewedone-plain/SKILL.md) | Check requested changes for completeness, correctness, and missing verification | Repository access; relevant project tools for proof |
| [areyousure-plain](skills/areyousure-plain/SKILL.md) | Check an implementation plan against local evidence and relevant public documentation | Repository or supplied plan; web/MCP optional |
| [agents-md-audit](skills/agents-md-audit/SKILL.md) | A focused, read-only AGENTS.md review | Local file access |
| [agents-md-revise](skills/agents-md-revise/SKILL.md) | Capture durable project guidance in AGENTS.md through an approved diff | Local file access; approval before guidance edits |
| [astra-instruction-audit](skills/astra-instruction-audit/SKILL.md) | Article-based, scored, or combined skills/AGENTS.md audits and authorized updates | Local file access; web optional |

The plain reviewers operate directly in the current harness. They can use native
read-only workers when useful and available, and work serially otherwise. They
do not configure models or invoke external model CLIs. Missing optional tools
are disclosed; missing evidence is not silently treated as success.

The focused AGENTS audit and the broader Astra audit retain separate scoring
rubrics. Their scores are judgment-based and should not be compared as measured
agent performance. The Astra skill credits
[Eric Provencher's article](https://x.com/pvncher/status/2095991462416490862);
it is an independent implementation, not an official or endorsed skill.

For existing plugin/runtime installations, read the
[migration note](docs/migration.md). Repository updates do not uninstall old
machine-local copies or settings.

## Maintain the collection

Edit canonical skill folders directly. Keep names and descriptions precise;
put substantial optional procedures in references loaded only when needed.
Use skill-owned scripts only when repeatable mechanics justify them. Update
this catalog when adding, removing, renaming, or materially changing a skill.
Project maintenance guidance lives in [AGENTS.md](AGENTS.md).

Run the package checker with Ruby and its standard libraries:

```bash
ruby scripts/validate-skills.rb
```

It checks YAML metadata, names, resource links, catalog entries, accidental
framework/personal dependencies, and fixture paths. It reads only package files;
it does not install anything, inspect global configuration, or run skill commands.
Markdown links in this package use inline `[label](path)` syntax so resource
validation can follow them. Instruction boundaries still require review and,
when behavior changes materially, a realistic trial; string matching cannot
establish whether a model will honor a permission rule.

The [Astra validation record](docs/astra-instruction-audit-validation.md) includes
synthetic audit/update fixtures and explicitly bounded historical results. Run
affected behavior trials for substantial workflow changes and distinguish them
from static package checks. No external reviewer service is required.

## License

[MIT](LICENSE). Preserve source attribution included with individual skills.
