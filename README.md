# PZA-skills

[![skills.sh](https://skills.sh/b/pizzayap/pza-skills)](https://skills.sh/pizzayap/pza-skills)

Independent skills for designers and builders who work with AI agents: a
component lab for designing every state, edge case and variant, a plan-to-ship
loop, visual proof and review, teaching and writing workflows, and a few stack
recipes. They come from workflows used daily in Claude Code, Codex, Cursor and
T3 Code. Each skill lives in `skills/<name>/` with a `SKILL.md` entrypoint and
any references it needs.

## Install

Choose the skills and target agents interactively:

```bash
npx skills add pizzayap/pza-skills
```

Install one skill or list the catalog first:

```bash
npx skills add pizzayap/pza-skills --skill arewedone
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

### Component lab

Each of these opens one component on a throwaway dev page with a small control
tray, so you design against the real component instead of a screenshot. The page
lives in one folder and is removed in one step.

| Skill | Use it for | Requirements |
|---|---|---|
| [state-machine](skills/state-machine/SKILL.md) | Every real state of a component (loading, error, auth expired) with mock data and a grouped switcher | Running app with a dev server; local file access |
| [edge-case](skills/edge-case/SKILL.md) | Worst-case content (long text, huge numbers, right-to-left, narrow slots) one scenario at a time, then Before and After fixes | Running app with a dev server; local file access; approval before fixes |
| [design-variant](skills/design-variant/SKILL.md) | Three genuinely different designs behind a 1-2-3 picker; iterate by number and promote the pick | Running app with a dev server; local file access |
| [ui-review](skills/ui-review/SKILL.md) | A measured craft review with callouts pinned to each element, then Before and After fixes | Running app with a dev server; local file access; a browser to measure; approval before fixes |

### Plan, build, ship

The core loop: `write-plan`, `areyousure`, implement, `arewedone`, fix,
`agents-md-revise`, commit, `next-session-prompt`, then a fresh session.
`ship-loop` runs the whole sequence.

| Skill | Use it for | Requirements |
|---|---|---|
| [write-plan](skills/write-plan/SKILL.md) | Write an implementation plan with scope fences and verification before any code | Repository access |
| [areyousure](skills/areyousure/SKILL.md) | Check an implementation plan against local evidence and relevant public documentation | Repository or supplied plan; web/MCP optional |
| [ship-loop](skills/ship-loop/SKILL.md) | Take one change from plan to commit with a gate after each step | Repository access; Git |
| [arewedone](skills/arewedone/SKILL.md) | Check requested changes for completeness, correctness, and missing verification | Repository access; relevant project tools for proof |
| [next-session-prompt](skills/next-session-prompt/SKILL.md) | Check real state, pick one next task and return a paste-ready prompt for a fresh session | Repository access; Git; `gh` optional |
| [issue-to-merged-pr](skills/issue-to-merged-pr/SKILL.md) | Take one GitHub issue from intake to merge, with failure modes first and E2E proof | Git and `gh` |
| [session-orchestrator](skills/session-orchestrator/SKILL.md) | Run long jobs as a lean master session plus one fresh worker session per unit | A harness that can start sessions or workers; a state file |

### Prove and review

| Skill | Use it for | Requirements |
|---|---|---|
| [visual-proof](skills/visual-proof/SKILL.md) | Prove UI works with real captures at desktop and mobile, then score each part and fix only the lowest | Running app; a browser automation tool |
| [spec-compliance-review](skills/spec-compliance-review/SKILL.md) | Check a change against the issue or spec it came from | Repository access; `gh` optional |
| [adversarial-security-review](skills/adversarial-security-review/SKILL.md) | Review a bounded diff for security, thinking like an attacker | Repository access; Git |

### Project guidance

| Skill | Use it for | Requirements |
|---|---|---|
| [agents-md-audit](skills/agents-md-audit/SKILL.md) | A focused, read-only AGENTS.md review | Local file access |
| [agents-md-revise](skills/agents-md-revise/SKILL.md) | Capture durable project guidance in AGENTS.md through an approved diff | Local file access; approval before guidance edits |
| [astra-instruction-audit](skills/astra-instruction-audit/SKILL.md) | Article-based, scored, or combined skills/AGENTS.md audits and authorized updates | Local file access; web optional |

### Teach and create content

| Skill | Use it for | Requirements |
|---|---|---|
| [video-to-workshop](skills/video-to-workshop/SKILL.md) | Turn a tutorial video and transcript into a staged, hands-on workshop | Transcript; the video or its frames |
| [transcript-to-deck-coverage](skills/transcript-to-deck-coverage/SKILL.md) | Update a deck from a session transcript without losing content | Transcript; the deck source; its live URL |
| [voice-kit](skills/voice-kit/SKILL.md) | Build your own writing-voice profile and write, review and refine in it | 20 or more of your own published posts |
| [build-in-public-video](skills/build-in-public-video/SKILL.md) | Plan a video or post from real work you shipped | First-hand material such as commits, screenshots, notes |
| [meeting-memory](skills/meeting-memory/SKILL.md) | Summarise meetings and answer "what did we decide?" with dated citations | Meeting transcripts |

### Design and business

| Skill | Use it for | Requirements |
|---|---|---|
| [explain-design](skills/explain-design/SKILL.md) | Explain what works in a design and why, plus only the improvements worth making, as one HTML spec sheet with callouts around the design, or section by section for a whole page | A URL, Figma frame, running app or screenshot; a browser tool for measured values; Node 18+ to build the report |
| [taste-file](skills/taste-file/SKILL.md) | Write your design taste into a portable `taste.md` | Your likes or saves export with images |
| [art-direction-loop](skills/art-direction-loop/SKILL.md) | Style bible, concept images, checklist review, human verdict, build brief | An image generation tool; a style bible |
| [browser-website-design-clone](skills/browser-website-design-clone/SKILL.md) | Map a website's distinct layouts, routes, and interactions; produce design specifications or a working clone. Website coverage is the default; explicit page-only requests stay scoped | Live browser; local file access; project tools for implementation; authorized source assets or capable generation tools when replacement media is needed |
| [concept-pitch-site](skills/concept-pitch-site/SKILL.md) | Build a one-page concept site to pitch a local business | Sourced facts about the business; a browser for screenshots |
| [evidence-gated-lead-research](skills/evidence-gated-lead-research/SKILL.md) | Find businesses with a provable, visible website problem | Browser or web access to public listings |
| [competitor-teardown-to-briefs](skills/competitor-teardown-to-briefs/SKILL.md) | Turn a competitor review into one implementation brief per idea | Competitor URL or screenshots; repository access |

### Tools and stack recipes

| Skill | Use it for | Requirements |
|---|---|---|
| [portless-local-dev](skills/portless-local-dev/SKILL.md) | Give each local app a stable HTTPS `.localhost` URL instead of clashing ports | Node 24 or later; Portless |
| [web-analytics-setup](skills/web-analytics-setup/SKILL.md) | Set up Vercel Analytics, GA4 and Search Console on Next.js | A Next.js site; access to the analytics dashboards |
| [mac-space-cleanup](skills/mac-space-cleanup/SKILL.md) | Scan Mac storage, explain cleanup opportunities, and guide manual cleanup before optional approved AI assistance | Local macOS shell for measurements; built-in tools; owning apps/tools optional; approval for specific cleanup actions |

The component lab skills are independent implementations inspired by
[Jakub Krehel's skills](https://github.com/jakubkrehel/skills) (MIT).

The reviewers operate directly in the current harness. They can use native
read-only workers when useful and available, and work serially otherwise. They
do not configure models or invoke external model CLIs. Missing optional tools
are disclosed; missing evidence is not silently treated as success.

The focused AGENTS audit and the broader Astra audit retain separate scoring
rubrics. Their scores are judgment-based and should not be compared as measured
agent performance. The Astra skill credits
[Eric Provencher's article](https://x.com/pvncher/status/2095991462416490862);
it is an independent implementation, not an official or endorsed skill.

For renamed skills or existing plugin/runtime installations, read the
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
