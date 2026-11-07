# Design handoff: research record

Research behind [skills/design-handoff](../skills/design-handoff/SKILL.md), gathered on
7 November 2026 for Day 2 of the Codex workshop for product designers. It is a maintainer
note, not part of the installed skill.

Rules followed: every source has its URL, author and the date it was checked. Quotes are
verbatim as read on the page. ⚠️ marks an unknown date or author, a second-hand or
vendor claim, or a number with no source. Engagement counts on X were read on the
check date and will change.

## Method

- **X:** read in the T3 in-app browser, signed in as Pizza, using X search with
  `min_faves` filters and reading long-form X articles in full. Searches covered design
  handoff with Codex, Claude Code and Cursor; prototypes versus specs; DESIGN.md;
  Figma Dev Mode; empty, loading and error states; and Loom or async video updates.
- **Open web:** a research agent searched and fetched pages; four of the main claims
  were then re-checked directly (the existing `design-handoff` skill, Remotion's license
  terms, Wistia's 52% figure and Monika Pawlak's quotes).
- **Gap:** X searches for complaints about Loom and async video returned mostly
  unrelated posts. The video findings rest on the web sources [W37]–[W42].

## Findings that shaped the skill

1. **Missing states are the main complaint, not the delivery format.** The deck is
   therefore built around a state coverage table, with empty, loading and error required
   for every group [W13][W17][W18][X9].
2. **Never invent a missing state.** Gaps become `missing` rows and open questions with
   an owner [W20][W21].
3. **Coded prototypes show what static files hide, but a prototype alone is not a
   handoff.** Engineers still need the intent, what's mocked and what's load-bearing
   [X1][W26][W27][W32]. Hence the "What's mocked", "Done when" and open-questions slides.
4. **DESIGN.md is becoming the shared design memory for agents, and people want to see
   tokens, not only read them.** The skill reads DESIGN.md first and shows tokens as
   swatches with their source file [X4][X5][X6][W1][W2].
5. **Practitioners pair a prototype with a short video** [W27][W30]. Short videos are
   watched more: under one minute averages 52% engagement, and the key point belongs in
   the first half [W37][W38]. Hence 45–90 seconds with the ask early and at the end.
6. **Muted viewing is common**, though the data is old consumer data ⚠️ [W39][W40].
   Captions are always on, and `captions.srt` ships too.
7. **Render video from a deterministic HTML timeline with Playwright and ffmpeg.** This is
   an established agent pattern [X7][W50]. It avoids Remotion's Company License, needed by
   teams of four or more [W48]. Pizza's `explainer-skills` (editorial-ui, saas-promo)
   already render this way. They use HTML/GSAP, not Remotion as the brief said, and
   `design-handoff` adapts their frame-capture renderer. Their visual styles (glowing
   rings, iridescent orbs) break the workshop's no-glow, no-gradient rules, so the video
   scenes are new and plain.
8. **The name `design-handoff` is already used** by Anthropic's knowledge-work-plugins
   and by humbleteam. Both turn a design into a Markdown spec [W20][W21]. This skill's
   description leads with what they lack: captures from the running prototype, and the
   stakeholder video.
9. **Codex specifics.** Skills live in `.agents/skills` and `~/.agents/skills` [W43], and
   `npx skills add` installs them [W47]. The desktop app has a built-in browser that can
   take screenshots, but annotation on localhost is reported broken [W44][W46]. The skill
   captures with its own Playwright script so it behaves the same everywhere.

## X sources

| # | URL | Author | Posted | Checked | Takeaway | Verbatim |
|---|---|---|---|---|---|---|
| X1 | https://x.com/tomjohndesign/status/2018385296610746403 | @tomjohndesign | 2026-02-03 | 2026-11-07 | X article "The new design process", step 9 "Handoff": the coded prototype is added to the static mocks and still goes to a developer to build. He also wants a way to pass along "all the different states". | "they get the same static mocks, but plus a stateful, integrated, performant, and remarkably real feeling prototype" |
| X2 | https://x.com/felixleezd/status/2033922168409538887 | @felixleezd | 2026-03-17 | 2026-11-07 | X article: the loss happens in the handoff, not in the design tool. | "Imho, Figma was never the problem. The handoff was." |
| X3 | https://x.com/aakashgupta/status/2045796812490150239 | @aakashgupta | 2026-04-19 | 2026-11-07 | A ten-step summary of a conversation with OpenAI's design lead for Codex and Figma's AI design director. ⚠️ Second-hand summary. | "Edge cases surface in the first conversation instead of the third sprint." |
| X4 | https://x.com/MengTo/status/2047917199655149791 | @MengTo | 2026-04-25 | 2026-11-07 | DESIGN.md takeaways: rules plus screenshots plus HTML reduce drift. | "DESIGN.md provides rules, screenshots communicate taste, and HTML gives implementation clues, so using them together reduces drift." |
| X5 | https://x.com/_davideast/status/2046752775942418943 | @_davideast | 2026-04-22 | 2026-11-07 | What DESIGN.md is and isn't: design intent and the reasons behind it, not a component library. | "Describes design intent" |
| X6 | https://x.com/chloepark/status/2066654402468044893 | @chloepark | 2026-06-15 | 2026-11-07 | Tokens in text need a visual view for human decisions. | "a text file is a terrible way for a human to make a visual decision" |
| X7 | https://x.com/Asteri_eth/status/2118072343444832376 | @Asteri_eth | 2026-11-04 | 2026-11-07 | A motion-explainer recipe: one HTML page, every frame a function of time, Playwright plus ffmpeg, stills before the full render. Also claims Anthropic ships a "Claude Motion" beta. ⚠️ That product claim was not verified. | "every frame is a function of time, so any moment can be re-rendered" |
| X8 | https://x.com/maayanalbert/status/2118872746415509578 | @maayanalbert | 2026-11-07 | 2026-11-07 | A founder of a designer IDE says most designers now work in coding agents. ⚠️ No source for the figure. | "3/4s of designers work in coding agents rather than design tools" |
| X9 | https://x.com/uxlinks/status/1935235583233651135 | @uxlinks (credits @uxhints_com) | 2025-06-18 | 2026-11-07 | Designer-developer checklist; "Consider all states" lists empty, error and loading. | "Consider all states" |
| X10 | https://x.com/agusegui/status/2094577179048698164 | @agusegui | 2026-09-01 | 2026-11-07 | Connects Guillermo Rauch's 2015 "Pure UI" essay to agent specs: describe the states and let something render them. | "describe the states, let something render them from the spec" |
| X11 | https://x.com/dr_cintas/status/2106482844025376965 | @dr_cintas | 2026-10-03 | 2026-11-07 | Codex and Claude Code read DESIGN.md when AGENTS.md points to it. | "Read DESIGN .md before any UI work." |

## Web sources

Sources W1–W52 were collected by the research agent. W13, W20, W27, W37 and W48 were
re-checked directly on the date above.

| # | URL | Author | Published | Checked | Takeaway | Verbatim quote |
|---|-----|--------|-----------|---------|----------|----------------|
| W1 | https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-design-md/ | Cassia Xu (Google Labs) | 2026-04-21 | 2026-11-07 | Google open-sourced Stitch's DESIGN.md as a draft spec so design rules travel across tools/agents. | "Today, we're open-sourcing the draft specification for DESIGN.md" |
| W2 | https://github.com/google-labs-code/design.md | Google Labs | — | 2026-11-07 | Spec: YAML token front matter + ordered `##` sections (Overview, Colors, Typography, Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts); `npx @google/design.md lint/diff/export` (alpha), contrast-ratio rule at WCAG AA 4.5:1. | "The tokens are the normative values. The prose provides context for how to apply them." |
| W3 | https://github.com/VoltAgent/awesome-design-md | VoltAgent | — | 2026-11-07 | Community collection of ~84 DESIGN.md files modeled on brand design systems; shows the format has traction. | "A collection of DESIGN.md files analysis by popular brand design systems." |
| W4 | https://www.figma.com/blog/design-context-everywhere-you-build/ | Kris Rasmussen (Figma CTO) | 2025-09-23 | 2026-11-07 | Figma MCP server went remote; Make files readable by agents as code; in-app Code Connect mapping. | "Now the Figma MCP server supports remote access." |
| W5 | https://www.figma.com/blog/config-2026-recap/ | Figma | 2026-06-24 | 2026-11-07 | Config 2026: "code layers" put running code on the canvas; extract design frames from code and back. | "We believe code should be treated like any other design material." |
| W6 | https://www.figma.com/blog/figma-make-now-on-your-local-code/ | Figma | 2026-05-28 | 2026-11-07 | Figma Make edits a local production codebase, adds annotations and PR creation (limited beta). | "The canvas and the codebase, in the same place." |
| W7 | https://www.figma.com/blog/introducing-figma-specs/ | Luke Zhang, Johnny Dallas, Aosheng Ran (Figma) | 2026-10-15 | 2026-11-07 | Figma Specs: multiplayer Markdown "container for context" on canvas; coding agents (Codex named) read specs via MCP. Open beta. | "Through the Figma MCP server, agents like Codex can read a spec and see all of the context it links to." |
| W8 | https://www.figma.com/blog/build-by-design/ | Dylan Field (Figma CEO) | 2026-10-15 | 2026-11-07 | Field frames Markdown as the lingua franca of agent context and Specs as its home. | "Markdown is more ubiquitous than ever." |
| W9 | https://developers.figma.com/docs/figma-mcp-server/write-to-canvas/ | Figma | — | 2026-11-07 | MCP `use_figma` writes real components/variables to Figma (beta); distinct from flat "send UI to Figma" capture. | "Output is beta quality and may need manual review and cleanup." |
| W10 | https://www.figma.com/blog/the-designers-handbook-for-developer-handoff/ | Figma | 2025-04-01 ⚠️ (index date; may be an older post) | 2026-11-07 | Figma's own guidance: design for edge cases of real content; mark Ready for dev; stay available after handoff. | "Design intent breaks down, however, with the inevitable edge cases" |
| W11 | https://help.figma.com/hc/en-us/articles/26781702258583-Dev-Mode-statuses-and-notifications | Figma Help | — | 2026-11-07 | Dev Mode has Ready for dev / Completed + an automatic "Changed" state — Figma's own acknowledgement that specs drift after handoff. | "The Changed state is set when a design that's been marked ready for dev or completed is modified." |
| W12 | https://www.techradar.com/pro/figmas-latest-survey-shows-ai-is-not-yet-living-up-to-its-over-hyped-promise | Steve Clark (TechRadar), reporting Figma 2025 AI report | 2025-04-28 | 2026-11-07 | Figma survey (n=2,500): 78% say AI improves efficiency, 58% say quality; designers less satisfied than devs. Primary: https://www.figma.com/reports/ai-2025/ | "Figma surveyed 2500 developers and designers globally between January 8 and January 30, 2025." |
| W13 | https://forum.figma.com/ask-the-community-7/what-s-the-first-thing-developers-complain-about-in-your-handoffs-52809 | Karthikeyan Sridhar (question); reply by afoothq | Q 2026-04-09; reply 2026-08-10 | 2026-11-07 | Top complaint is missing states/exceptions, not delivery format; proposes state matrix + owner per open decision. | "missing state and exception context" |
| W14 | https://www.reddit.com/r/FigmaDesign/comments/1cdkzpn/so_what_happened_with_your_devs_dev_mode/ | u/roymccowboy (OP); reply u/rufio313 | 2024-04-26 | 2026-11-07 | Many teams didn't buy Dev Mode seats for engineers; they annotate manually or treat designs as guidelines. | "We can’t increase our figma budget tenfold like that." |
| W15 | https://forum.figma.com/share-your-feedback-26/new-dev-mode-seat-pricing-is-unacceptable-what-do-we-do-now-8322 | Slava_Bronevitskiy | 2024-01-24 | 2026-11-07 | Dev Mode seat pricing pushed back on hard; engineers outnumber designers 4:1 and only occasionally inspect. | "$35/seat/month just to inspect already finished designs" |
| W16 | https://johnrubino.substack.com/p/i-ran-a-study-on-how-engineers-actually | John Rubino | 2026-03-10 | 2026-11-07 | Small qualitative study: Dev Mode helps self-serve values, but version confusion and silent late changes are top pain. | "Developers can’t build from a moving target." |
| W17 | https://gregsargent.com/articles/design-engineering-handoff | Greg Sargent | 2026-01-16 | 2026-11-07 | Specs fail on (a) missing behavior/states and (b) no priority — engineers need "must be exact" vs "rough target" and the *why*. | "It doesn't tell you whether that's load-bearing." |
| W18 | https://www.utkarshdesign.com/templates/design-handoff-checklist | Utkarsh Panwar | — | 2026-11-07 | 10-line checklist + per-screen state matrix (first use, loading, partial, empty result, error, no permission, overflow); recommends a live 20–30 min walkthrough too. | "Any line left blank turns into a question in Slack later." |
| W19 | https://idealogic.io/blog/engineering-approach-design-development | Oleh Henaliuk (Idealogic, agency ⚠️ vendor) | 2026-01-23 | 2026-11-07 | Nine-state model incl. partial/overflow, server failure, RBAC permission; maps each to a code trigger. | "Specify all 9 UI states before sprint planning" |
| W20 | https://github.com/anthropics/knowledge-work-plugins/blob/main/design/skills/design-handoff/SKILL.md | Anthropic | — | 2026-11-07 | **Existing Anthropic skill named `design-handoff`** (knowledge-work-plugins): Figma/screenshot → spec with tokens table, components table, states table, responsive, edge cases, motion, a11y. Name collision risk. | "Don't assume — If it's not specified, the developer will guess. Specify everything." |
| W21 | https://github.com/humbleteam/design-handoff | humbleteam | — | 2026-11-07 | **Another `design-handoff` Claude skill**: mockup/HTML prototype → per-screen markdown spec, 8 canonical states, `NEW-TOKEN` flags, blocking/non-blocking open questions. | "anything not visible in the source becomes an open question, never a guess." |
| W22 | https://github.com/manalkaff/opendesign/blob/main/skills/handoff-to-claude-code/SKILL.md | manalkaff (opendesign) | — | 2026-11-07 | Handoff folder + README with required sections incl. explicit "Fidelity" call and disclaimer that HTML is reference, not production code. | "the HTML files in this bundle are *design references*, not production code to copy directly" |
| W23 | https://github.com/SkillMedev/designer-to-dev-handoff | Skill Me | — | 2026-11-07 | Skill pack (handoff doc, redlines, motion spec, responsive spec, design QA) installable via `npx skills add`. Evidence the "handoff doc" niche is crowded; video + deck combo is not. | "specs so precise the build matches the design" |
| W24 | https://www.lennysnewsletter.com/p/the-design-process-is-dead | Lenny Rachitsky (guest Jenny Wen, head of design for Claude) | 2026-03-01 | 2026-11-07 | Designers' time shifted from mocking (60–70% → 30–40%) to pairing with engineers and implementing. | "Why the classic discovery → mock → iterate design process is becoming obsolete" |
| W25 | https://rogerwong.me/2026/03/the-design-process-is-dead-jenny-wen-head-of-design-at-claude | Roger Wong (quoting Jenny Wen) | 2026-03-03 | 2026-11-07 | Counterpoint: process isn't dead, proportions shifted; Wen concedes you can't mock all states. | "you can’t mock up all the states" |
| W26 | https://www.youtube.com/watch?v=s4HGbIhUgVo (also https://www.lennysnewsletter.com/p/this-week-on-how-i-ai-how-notions) | How I AI / Claire Vo, guest Brian Lovin (Notion) | 2026-02-23 | 2026-11-07 | Notion's "prototype playground" (shared Next.js repo, Claude Code); browser prototypes surface loading states and screen-size problems Figma hides. | "in the browser you notice a ton of problems" |
| W27 | https://monika.fyi/writing/vibe-coded-prototypes | Monika Pawlak (Miro) | 26 Oct, year ⚠️ (footer © 2026) | 2026-11-07 | Practitioner pattern: draft PR + short video; plus a living spec page where every state is a short loop — prototypes alone don't convey the thinking. | "I'd open a draft pull request with a short video walkthrough" / "every state captured as a short loop" |
| W28 | https://www.lukew.com/ff/2112/ai-has-flipped-software-development | Luke Wroblewski | 2025-07-27 | 2026-11-07 | Dev now runs ahead of design; quotes Henry Modisett (Perplexity). | "\"prototype to productize\" rather than \"design to build\"" |
| W29 | https://www.lukew.com/ff/2133/how-design-teams-are-reacting-to-10x-developer-productivity-from-ai | Luke Wroblewski | 2025-10-30 | 2026-11-07 | Designers shift toward UX alignment after build; some pick up coding agents themselves. | "designers increasingly focus on UX alignment after things are built" |
| W30 | https://vercel.com/blog/design-engineering-at-vercel | Glenn Hitchcock, Henry Heffernan, John Phamous, Rauno Freiberg, Yasmin Pessoa | 2024-03-29 | 2026-11-07 | Vercel design engineers skip classic handoff; collaborate via previews and videos. | "Collaboration happens through Slack messages, screenshots, videos, preview links, and Zoom calls." |
| W31 | https://vercel.com/design/engineer | Vercel | — | 2026-11-07 | Design Engineer Principles. | "Care about every state, edge case, word, and interaction" |
| W32 | https://chris-hartwig.com/blog/ai-prototypes-are-not-a-handoff-artifact/ | Chris Hartwig | 2025-12-17 | 2026-11-07 | Engineering skeptic: hand over intent (prompts, assumptions, tradeoffs) + prototype, not "finish this code". | "The mistake is confusing a prototype with a handoff." |
| W33 | https://www.builder.io/blog/no-handoff-methodology | Mike Chirokas (Builder.io ⚠️ vendor) | 2025-08-21 | 2026-11-07 | "No Handoff" playbook: working prototype as living spec; numbers in tables are vendor claims. | "It's a handshake, not a handoff." |
| W34 | https://fieldlines.substack.com/p/high-fidelity-ai-prototypes-as-replacement | Stefan Klocek | 2025-07-18 | 2026-11-07 | Shift effort from documentation to walkthrough/collaboration; big Figma handoff files go stale. | "large Figma files that immediately become out of sync with what gets built" |
| W35 | https://adplist.substack.com/p/why-i-stopped-prototyping-in-figma | Elie Majorel | 2025-05-06 | 2026-11-07 | Lovable prototype forked by engineers; keep edge cases and acceptance steps in the prompt/spec. | "Put user stories, edge cases, and acceptance steps inside the prompt" |
| W36 | https://storybook.js.org/blog/storybook-10-3/ | Michael Shilman (Storybook) | 2026-04-06 | 2026-11-07 | Storybook MCP (React, 10.3): agents reuse real components, write stories per state, run a11y/interaction tests. See also https://storybook.js.org/blog/storybook-mcp-for-react/ (Kyle Gach, 2026-03-23). | "Dev toolset helps agents show their work in all key UI states" |
| W37 | https://wistia.com/blog/optimal-video-length | Ezra Fishman, Chiara Hoogervorst (Wistia) | 2025-07-01 ⚠️ (text cites "2026 State of Video Report", likely updated) | 2026-11-07 | 13M+ videos: <1 min averages 52% engagement; 1–5 min best for explainers; put key info in first half. | "Since most viewers usually drop off around the halfway point, include the most important or compelling information in the first half of your video." |
| W38 | https://wistia.com/blog/understanding-audience-retention | Alyce Currier, Ezra Fishman, Lisa Marinelli (Wistia) | 2020-01-03 | 2026-11-07 | Early drop ("nose") grows with length: 4.9% for 1–2 min vs 17.3% for 5–10 min; avoid "in summary" outros. | "Don't use phrases like \"in summary,\" \"that’s about it,\" or \"to wrap things up.\"" |
| W39 | https://www.forbes.com/sites/tjmccue/2019/07/31/verizon-media-says-69-percent-of-consumers-watching-video-with-sound-off/ | TJ McCue (reporting Verizon Media/Publicis, n=5,616) | 2019-07-31 | 2026-11-07 | Sound-off viewing is common; captions raise stated completion intent. ⚠️ old, consumer (not workplace) data. | "69% view video with sound off in public places" |
| W40 | https://www.markstudios.com/research/video-captions-statistics | Mark Santos | 2026-09-16 | 2026-11-07 | Debunks/dates common caption stats; no newer published sound-off measurement found. | "The most-cited sound-off data is old." |
| W41 | https://www.linkedin.com/posts/jessicareeder_asyncwork-activity-7282010015064850432-Uiys | Jessica Reeder (post); reply Courtney Cavey | 2025-01-06 | 2026-11-07 | Async-video complaints: long rambling feedback videos on mockups are costly to decode; text preferred for actionables. | "I've been sent 17-minute videos containing feedback on mockups" |
| W42 | https://magicheidi.ch/blog/loom-fatigue-forget-video-and-switch-to-audio-only | — ⚠️ (author not shown) | — | 2026-11-07 | "Loom fatigue": camera shyness, partial viewing, unsearchable video; quotes Gustavo Razzetti. | "some team members will watch just part of it." |
| W43 | https://learn.chatgpt.com/docs/build-skills (redirect from developers.openai.com/codex/skills) | OpenAI | — | 2026-11-07 | Codex skills: `SKILL.md` + optional `scripts/`, `references/`, `assets/`, `agents/openai.yaml`; scanned from `.agents/skills` up to repo root, `$HOME/.agents/skills`, `/etc/codex/skills`; install curated via `$skill-installer`; implicit invocation via description. | "Codex scans `.agents/skills` in every directory from your current working directory up to the repository root." |
| W44 | https://learn.chatgpt.com/docs/browser | OpenAI | — | 2026-11-07 | Desktop app has a built-in browser (Cmd+Shift+B), `@Browser` computer use can click/type/**take screenshots**; annotation comments; not in CLI/IDE extension. Docs now say "ChatGPT desktop app" ⚠️ (Codex app appears folded into it). | "Browser isn't available in Codex CLI or the Codex IDE extension." / "Name the state you care about, such as loading, empty, error, or success." |
| W45 | https://www.linkedin.com/posts/openai-devs_codex-helps-across-your-work-activity-7450602596400111616-4AKR | OpenAI Developers | 2026-04-16 | 2026-11-07 | Launch post for Codex in-app browser + page comments. | "Open local web apps in the Codex in-app browser, then comment directly on the page" |
| W46 | https://github.com/openai/codex/issues/38988 | GitHub issue (reporter not shown) | — | 2026-11-07 | Bug: Annotation mode fails on localhost pages in the built-in browser. Don't rely on in-app annotation for the skill. | "Annotation works normally on a public HTTPS page in the same in-app browser session" |
| W47 | https://vercel.com/changelog/introducing-skills-the-open-agent-skills-ecosystem | Andrew Qu (Vercel) | 2026-01-20 | 2026-11-07 | `npx skills add <owner/repo>` installs skills across agents incl. codex, claude-code, cursor (third-party, not OpenAI's installer). | "Install a skill package with `npx skills add <package>`." |
| W48 | https://www.remotion.dev/docs/license/faq | Remotion | — | 2026-11-07 | Free license only for individuals / orgs with ≤3 people; 4+ need Company License: Creators $25/mo per person writing Remotion code (incl. via agents) or Automators $0.01/render, $100/mo minimum. | "It costs $25/month per person who writes Remotion code themselves or using agentic coding tools." |
| W49 | https://hyperframes.video/developers | HyperFrames Team | — | 2026-11-07 | MIT-licensed HTML→MP4 renderer for agents (headless Chrome beginFrame + FFmpeg), positioned as Remotion alternative. ⚠️ vendor comparison table. | "Write HTML. Render video. Built for agents." |
| W50 | https://vawe.dev/blog/gsap-to-mp4 | vawe (author not shown) | 2026-10-19 | 2026-11-07 | DIY recipe: paused GSAP timeline + `window.seek(t)` + Puppeteer/Playwright screenshots → ffmpeg; un-paused timelines give nondeterministic frames. | "4 of 30 frames differed between two passes." |
| W51 | https://v0.app/docs/github | Vercel v0 docs | — | 2026-11-07 | v0 handoff = branch per chat, preview deployment, PR, CI checks. | "v0 creates a pull request if the branch does not have one" |
| W52 | https://lovable.dev/blog/prototype-to-production-handoff-how-non-technical-teams-use-lovable-without-bypassing-engineering | Lovable (⚠️ vendor) | 2026-03-19 | 2026-11-07 | Prototype → GitHub sync → engineers take over in Claude Code/Cursor; explicit pause before production. | "there is an intentional pause between Phase 1 and Phase 3." |

## What works (web)

- **A state matrix is the core of any handoff**: loading, empty (first-use vs filtered), error (validation vs server), partial, overflow/long content, disabled, permission/RBAC, success [W13][W17][W18][W19][W20][W21][W31]. OpenAI's own browser docs tell users to name the state (loading, empty, error, success) when reviewing UI [W44].
- **Flag what's missing rather than inventing it**: open questions tagged blocking/non-blocking, each with an owner [W13][W21]; "Don't assume" [W20].
- **Say what's load-bearing**: separate "must be exact" from "rough target", and explain the *why* behind decisions [W17][W20].
- **Tokens by name, not raw values**; flag new or one-off tokens [W2][W18][W20][W21]. DESIGN.md gives a portable, lintable token + prose format that agents already read [W1][W2][W3].
- **State explicitly that prototype code is a reference**, and give a fidelity verdict (pixel-exact or layout-only) [W22][W32][W52].
- **Hand over intent, not just code**: assumptions, rejected options, tradeoffs, the prompts used [W27][W32][W35].
- **Coded prototypes reveal states Figma hides** (loading, screen-size problems) and engineers can click and fork them [W26][W34][W35]. Industry leaders describe the shift as "prototype to productize" [W28][W29][W24].
- **Pair the prototype with a short video and a PR**: draft PR + short video walkthrough [W27]; Vercel collaborates via "videos, preview links" [W30]; v0 and Lovable both standardize on branch + preview + PR [W51][W52].
- **One short loop per state** works better than a single long demo [W27]. Storybook MCP shows the same idea: agents render previews of "all key UI states" [W36].
- **Video length**: short wins. Under 1 min averages 52% engagement, 1–5 min is the range for explainers, and the key point belongs in the first half [W37]. Early drop-off more than triples from 1–2 min videos to 5–10 min videos [W38]. Skip "in summary" outros [W38].
- **Design for muted viewing**: on-screen captions/text carry the message; sound-off viewing is common, though the data is old and from consumers, not workplaces [W39][W40].
- **Deterministic HTML→MP4** (paused timeline, seek per frame, Playwright screenshots, ffmpeg) is a well-trodden agent pattern and avoids Remotion licensing [W49][W50].

## What people complain about (web)

- **Happy-path-only designs**: engineers invent empty, error and loading states, and QA later logs them as defects [W13][W17][W18][W19]. Figma itself warns that edge cases break design intent [W10].
- **Specs drift from what's built**, and silent late changes leave engineers building against a "moving target" [W11][W16][W34]. Version confusion over which design is final [W16].
- **Dev Mode cost and access**: engineers lost the free Inspect panel, teams refuse per-seat pricing and fall back to manual annotation [W14][W15].
- **No priority signal**: every value looks equally important, so the wrong things get escalated [W17].
- **Prototype dumped as "finish this"**: engineers have to reverse-engineer it, and it erodes trust [W32]. Prototypes impress in review but don't convey the thinking behind them [W27].
- **Async video fatigue**: videos are too long and rambling, go unwatched or only partly watched, can't be searched, and feedback buried in a 17-minute video takes hours to extract [W41][W42]. ⚠️ Many "Loom completion %" stats online are unsourced. Ignore them and use the Wistia data [W37][W38].
- **Tool caveats**: Figma write-to-canvas output is "beta quality" [W9]. Codex in-app annotation is broken on localhost [W46]. The DESIGN.md spec is alpha and tied to Stitch's tooling ⚠️ [W2].


## Round 2: video engine and voice (after Pizza's review, 2026-11-07)

Pizza found the first video (an HTML timeline rendered with Playwright) "too boring and confusing". The video was rebuilt as a Remotion composition that tells a five-act story. These are the decisions, and what was tested.

- **Remotion, pinned at 4.0.537.** Pizza accepted the Company License terms (W48). Note: the `~/Projects/explainer-skills` `editorial-ui` and `saas-promo` skills are not built with Remotion. Both are HTML + GSAP rendered with `playwright-core` (checked in their `package.json` files on 2026-11-07). The new video therefore borrows their editorial look and grammar, not their code: paper and ink type, a serif italic for the one stressed phrase, push-ins, camera moves onto the detail being discussed, a cursor that clicks, and hard cuts. It leaves out saas-promo's glows and gradients, which the brief forbids.
- **Fonts ship with the skill** (`@fontsource-variable/inter` and `@fontsource/instrument-serif`, both OFL), so a render needs no font download.
- **Free voice: Kokoro-82M via `kokoro-js` 1.2.1** (sources below). Measured here on an Apple Silicon Mac, 2026-11-07:
  - The model loads in 8.9 s.
  - One 13-word sentence takes 2.5 s to generate and plays for 4.6 s.
  - The npm install is about 412 MB.
  - A full 18-line script renders with voice in 40 s.
  - At default speed the voice reads about 2.4 words a second; the skill uses speed 1.1.
  - It stays an optional install, so students who record their own voice do not download it.
- **Record-your-own flow, tested with a simulated take.** The take was 18 lines read by a different Kokoro voice at 0.92 speed, with pauses of 0.9 to 1.5 s and low background noise. The script split it at the pauses with no warnings and rendered an 85.4 s video.
- **Not tested with a real key:** ElevenLabs and Fish Audio. No key was available in this environment. The request shapes follow the docs below (sources S1–S40 in the table).
- **A non-designer review of the first Remotion cut** (a fresh reviewer reading frames and captions) found these problems:
  - The opening never said what the product was, or that it is a prototype.
  - People were named before they were introduced.
  - Three decisions were promised, but only two were spoken.
  - The cursor's name tag looked like a stray label.
  - A walk caption did not match its click.
  - The seven-state grid was too small to read.
  - The video used design jargon ("empty, loading and error states").
  - It never showed Mum's side of the problem.
  
  All of these became writing rules in `references/video.md`, plus engine changes: a states list with a large window, per-item lines in the ask scene, and no default cursor tag.

### TTS research for a narrated update-video skill (Node 20 + ffmpeg, no Python)

Research date: 2026-11-07. Every source below was checked on 2026-11-07. "n/d" means the page shows no publish date.
⚠️ marks anything I could not verify against a primary source, or where sources conflict.

#### Source table

| id | URL | author/org | published | checked | claim | verbatim quote |
|---|---|---|---|---|---|---|
| S1 | https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps | ElevenLabs | n/d | 2026-11-07 | TTS-with-timestamps endpoint, body, response | "POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps" ... "`output_format` (enum, optional, default: mp3_44100_128)" (listed under **Query parameters**) ... "`model_id` (string, optional, default: eleven_multilingual_v2)" ... "`audio_base64` (string, required) — Base64 encoded audio data" ... "`alignment` (CharacterAlignmentResponseModel, optional, nullable) — Timestamp information for each character in the original text" |
| S2 | same as S1 | ElevenLabs | n/d | 2026-11-07 | Alignment fields | "`characters` (list of string, required)", "`character_start_times_seconds` (list of double, required)", "`character_end_times_seconds` (list of double, required)" |
| S3 | same as S1 | ElevenLabs | n/d | 2026-11-07 | Output-format plan limits | "MP3 with 192kbps bitrate requires you to be subscribed to Creator tier or above. PCM and WAV formats with 44.1kHz sample rate requires you to be subscribed to Pro tier or above." |
| S4 | https://elevenlabs.io/docs/api-reference/authentication | ElevenLabs | n/d | 2026-11-07 | Auth header | "All API requests should include your API key in an `xi-api-key` HTTP header" |
| S5 | https://elevenlabs.io/docs/quickstart | ElevenLabs | n/d | 2026-11-07 | Env var, current model in examples, example voice | "`ELEVENLABS_API_KEY=<your_api_key_here>`" ... `voice_id="JBFqnCBsd6RMkjVDRZzb",  # "George"` ... `model_id="eleven_v4",` |
| S6 | https://elevenlabs.io/docs/models | ElevenLabs | n/d | 2026-11-07 | Model list and limits | "`eleven_v4` \| Our most emotionally rich, expressive speech synthesis model" ... Eleven v4 "10,000 character limit"; Multilingual v2 "Most stable on long-form generations" |
| S7 | https://elevenlabs.io/docs/changelog/2026/9/28 | ElevenLabs | 2026-09-28 | 2026-11-07 | v4 launch | "Eleven v4 and Eleven v4 Turbo are now available." "Use `eleven_v4` through the Text to Dialogue API for content creation and long-form audio." |
| S8 | https://elevenlabs.io/docs/overview/capabilities/text-to-speech/eleven-v4 | ElevenLabs | n/d | 2026-11-07 | v4 limits (via fetch summary) | "Style and Speed sliders are not available in Eleven v4, and SSML is not supported." |
| S9 | https://elevenlabs.io/docs/help-center/product/voices/my-voices/what-are-default-voices | ElevenLabs | n/d | 2026-11-07 | Default voices expire; George replacement | "All our Default voices will expire on December 31, 2026, and they will no longer be accessible after this date. As part of this process, Default voices are only available for accounts that were created before March 2026." ... "\| George \| `JBFqnCBsd6RMkjVDRZzb` \| Eldrin - Crisp British Baritone \| `6WwXjDDEMyNmFG95zycZ` \|" |
| S10 | https://elevenlabs.io/docs/overview/capabilities/voices | ElevenLabs | n/d | 2026-11-07 | Free tier and Voice Library | "Voice Library voices are not available via the API to free tier users." |
| S11 | https://help.elevenlabs.io/hc/en-us/articles/28184926326033-How-much-does-it-cost-to-use-the-API | ElevenLabs | n/d | 2026-11-07 | Free tier API access | "Most of our API endpoints are available for all plans, including the free plan." |
| S12 | https://elevenlabs.io/pricing | ElevenLabs | n/d | 2026-11-07 | Free plan allowance (via fetch summary) | Free: "$0/mo", "10k creditsper month" [sic]; "Commercial License" listed only from Starter up |
| S13 | https://elevenlabs.io/docs/capabilities/text-to-speech | ElevenLabs | n/d | 2026-11-07 | Commercial rights | "commercial usage rights are only available with paid plans." |
| S14 | https://github.com/elevenlabs/elevenlabs-python/issues/556 | ElevenLabs staff (PaulAsjes) | 2025-05-20 | 2026-11-07 | Character-level only | "Word level alignment is not supported at this time with the speech with timing endpoints." |
| S15 | https://registry.npmjs.org/@elevenlabs/elevenlabs-js | npm / ElevenLabs | 2026-11-06 (v2.77.0) | 2026-11-07 | Official JS SDK | latest `2.77.0`, MIT |
| F1 | https://docs.fish.audio/api-reference/endpoint/openapi-v1/text-to-speech (+ openapi.json) | Fish Audio | n/d | 2026-11-07 | TTS endpoint, model header, body | "post /v1/tts" ... "Use `s2.1-pro-free` for the free developer tier. If omitted or set to an unrecognized value, the request falls back to `s2.1-pro`." enum: "s1, s2-pro, s2.1-pro, s2.1-pro-free, drama-3" |
| F2 | same as F1 | Fish Audio | n/d | 2026-11-07 | Body fields | format "enum: wav, pcm, mp3, opus" default mp3; mp3_bitrate "enum: 64, 128, 192" default 128; latency "normal: best quality, balanced: reduced latency, low: lowest latency."; normalize "default: true"; reference_id "Voice model ID(s) from Fish Audio library or your custom models." |
| F3 | https://docs.fish.audio/developer-guide/resources/agent-quickstart.md | Fish Audio | n/d | 2026-11-07 | Auth, env var, base URL | "Authentication: `Authorization: Bearer <FISH_API_KEY>`" ... "`export FISH_API_KEY=\"your_api_key_here\"`" |
| F4 | https://docs.fish.audio/developer-guide/getting-started/quickstart.md | Fish Audio | n/d | 2026-11-07 | Free model; public voice IDs | "New accounts start with no API credit" (llms.txt summary) ... "The examples above use the default voice." ... "Energetic Male ... `export REFERENCE_ID=\"9a9cf47702da476aa4629e2506d4a857\"`" |
| F5 | https://docs.fish.audio/developer-guide/models-pricing/pricing-and-rate-limits.md | Fish Audio | n/d | 2026-11-07 | Pricing, concurrency | "`s2.1-pro` \| \$15.00 / M UTF-8 bytes" ... "`s2.1-pro-free` \| \$0.00 / M UTF-8 bytes" ... "1M UTF-8 bytes is approximately 180,000 English words, or about 12 hours of speech" ... "Starter \| < \$100 paid \| 5 requests" |
| F6 | https://docs.fish.audio/developer-guide/getting-started/changelog.md | Fish Audio | 2026-06-23 entry | 2026-11-07 | Free model end date ⚠️ | "`s2.1-pro-free` is the same model at no cost through November 30, 2026 for testing, prototyping, development, and smaller businesses, under fair-use limits" |
| F7 | https://docs.fish.audio/developer-guide/models-pricing/deprecations.md | Fish Audio | n/d | 2026-11-07 | speech-1.x gone, s1 retiring | "**speech-1.6** - Fish Speech v1.6 has been deprecated on February, 28th, 2026" ... "S1 is deprecated and will be retired on December 31, 2026." |
| F8 | https://docs.fish.audio/api-reference/openapi.json (`/v1/tts/stream/with-timestamp`) | Fish Audio | n/d | 2026-11-07 | Word timestamps via SSE | "Server-Sent Events stream. Each `message` event contains a JSON payload with one base64 audio chunk." ... "`chunk_audio_offset_sec` can be added to segment times to derive absolute timestamps in the full audio." |
| F9 | https://registry.npmjs.org/fish-audio | npm / Fish Audio | 2026-03-10 (v0.1.0) | 2026-11-07 | Official JS SDK | latest `0.1.0`, MIT, "To provide convenient Node.js program integration for https://docs.fish.audio" |
| K1 | https://huggingface.co/hexgrad/Kokoro-82M | hexgrad | v1.0 2025-01-27 | 2026-11-07 | Licence, commercial | "With Apache-licensed weights, Kokoro can be deployed anywhere from production environments to personal projects." |
| K2 | https://github.com/hexgrad/kokoro/blob/main/kokoro.js/README.md | hexgrad / Xenova | n/d | 2026-11-07 | Node usage | `device: "wasm", // Options: "wasm", "webgpu" (web) or "cpu" (node).` ; dtype "fp32", "fp16", "q8", "q4", "q4f16" ; af_heart "Overall Grade" "**A**" |
| K3 | https://registry.npmjs.org/kokoro-js | npm | 2025-05-03 (v1.2.1) | 2026-11-07 | Version, deps | latest `1.2.1`, Apache-2.0, deps `@huggingface/transformers ^3.5.1`, `phonemizer ^1.2.1` |
| K4 | https://huggingface.co/api/models/onnx-community/Kokoro-82M-v1.0-ONNX/tree/main/onnx | onnx-community | n/d | 2026-11-07 | Download sizes | model.onnx 325,532,232 B; model_quantized.onnx (q8) 92.4 MB; model_q8f16 86.0 MB; model_fp16 163.2 MB |
| K5 | https://raw.githubusercontent.com/huggingface/transformers.js/3.8.1/src/env.js | Hugging Face | 3.8.1 (2025-12-02) | 2026-11-07 | Node cache location | "const DEFAULT_CACHE_DIR = RUNNING_LOCALLY ? path.join(dirname__, '/.cache/')" |
| K6 | https://ryanwelch.co.uk/blog/kokoro-word-timestamps/ | Ryan Welch | 2026-04-15 | 2026-11-07 | No native timings in kokoro-js | "the public ONNX and `kokoro-js` path do not expose the native model alignment output." |
| K7 | https://github.com/hexgrad/kokoro/issues/32 | hexgrad | 2025-02-07 | 2026-11-07 | Python has English word timestamps | "English-only WLTs for now" ; `print(t.text, repr(t.whitespace), t.start_ts, t.end_ts)` |
| K8 | https://micdrop.dev/blog/local-tts-node-kokoro-vs-piper | Godefroy de Compreignac (Micdrop) | 2026-09-02 | 2026-11-07 | Node CPU speed (MacBook Pro M2) | "Compute per second of audio \| ~0.2 s \| ~0.2 s \| Far below real time \| 0.4 to 0.9 s" (Kokoro is the 4th column) ; "Kokoro’s `q8` quantized weights load in around a second and a half against 5.8 seconds for `fp32`" |
| K9 | https://micdrop.dev/docs/ai-integration/provided-integrations/kokoro | Micdrop | n/d | 2026-11-07 | Quality vs Piper (opinion) | "Kokoro sounds better than Piper in English" |
| K10 | https://dev.to/voxrtio/four-on-device-tts-models-on-one-cpu-core-linnettts-piper-kokoro-pocket-tts-4lmc | VoxRT | 2026-11-06 | 2026-11-07 | CPU RTF, i9-13900K, Python pkgs | "\| Piper medium 16 M \| 5.8% \| 2.1% \|" ... "\| pocket-tts 4.0.1 (100 M) \| n/a \| 24.1% \|" ... "\| Kokoro-82M \| 51.7% \| 17.2% \|" |
| K11 | https://github.com/xenova/phonemizer.js + https://github.com/espeak-ng/espeak-ng | Xenova / eSpeak NG | n/d | 2026-11-07 | Licence chain ⚠️ | phonemizer npm declares "Apache-2.0" and is a "converter using eSpeak NG"; espeak-ng repo licence: GPL-3.0 |
| A1 | https://quelleia.com/donnees/voix-synthese-tts-arena.csv (secondary copy of https://huggingface.co/spaces/TTS-AGI/TTS-Arena-V2) | Quelleia (snapshot of TTS-AGI) | snapshot 2026-11-02 | 2026-11-07 | Arena ranks ⚠️ secondary | "29;;Chatterbox;chatterbox;Resemble AI;1468;...;1810;non;non" ; "30;;Kokoro 82M v1.0;kokoro-82m-v1-0;hexgrad;1465;...;1033;non;oui" (last flag = retired) ; "relevé du 2 novembre 2026" |
| A2 | https://www.yaps.ai/blog/best-local-tts-models | Yaps Team | 2026-10-10 | 2026-11-07 | Arena snapshot 2026-10-10 | "#29 Kokoro v1.0, rated 1478 ±22 from 1.0k votes, marked \"Retired\"" ; "#28 Chatterbox, rated 1481 ±19 from 1.8k votes" |
| P1 | https://github.com/rhasspy/piper | Rhasspy | archived (last push 2025-08-26) | 2026-11-07 | Moved | "Development has moved: https://github.com/OHF-Voice/piper1-gpl" (repo archived, licence MIT) |
| P2 | https://github.com/OHF-Voice/piper1-gpl | Open Home Foundation | v1.8.0 2026-09-04 | 2026-11-07 | GPL, Python install | licence GPL-3.0; "A fast and local neural text-to-speech engine that embeds espeak-ng for phonemization." ; "pip install piper-tts" ; "The Open Home Foundation is looking for maintainers for Piper!" |
| P3 | https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/ALIGNMENTS.md | OHF | n/d | 2026-11-07 | Phoneme timings | "Experimental support for audio alignments has been added to Piper's Python and C++ APIs." |
| P4 | https://huggingface.co/rhasspy/piper-voices (per-voice MODEL_CARD) | Rhasspy | updated 2026-11-02 | 2026-11-07 | Per-voice licences | ljspeech "License: public domain"; libritts_r "License: CC BY 4.0"; ryan "License: CC BY-NC-SA 4.0"; lessac links the Blizzard 2013 licence |
| T1 | https://github.com/KittenML/KittenTTS | KittenML / Stellon Labs | n/d | 2026-11-07 | Models, licences | "kitten-tts-nano (int8) \| 15M \| 25 MB" ; "This project is licensed under the Apache License 2.0. That covers the code" ; "KittenTTS 2 is released under the Stellon Labs Community License" |
| T2 | https://huggingface.co/KittenML/kitten-tts-mini-0.8 | KittenML | 2026-02-19 | 2026-11-07 | 0.8 weights licence | card licence: apache-2.0; voices `['Bella', 'Jasper', 'Luna', 'Bruno', 'Rosie', 'Hugo', 'Kiki', 'Leo']` |
| T3 | https://github.com/Algiras/kitten-tts-js | Algiras (unofficial) | npm 0.1.2 2026-02-24 | 2026-11-07 | Node port | "Works in Node.js and modern browsers with no Python dependency." ; "Automatic caching — `~/.cache/kitten-tts/` in Node" |
| Q1 | https://github.com/kyutai-labs/pocket-tts | Kyutai | n/d (Oct 2026 note) | 2026-11-07 | Speed, voices, binary | "Faster than real-time, ~6x real-time on a CPU of MacBook Air M4" ; "Uses only 2 CPU cores" ; "Each release comes with a `pocket-tts` binary for Linux and macOS (x86 and ARM) and Windows (x86), which needs neither Python nor PyTorch." |
| Q2 | https://huggingface.co/kyutai/pocket-tts | Kyutai | updated 2026-10-21 | 2026-11-07 | Licence | card licence: cc-by-4.0 (gated: auto); code repo MIT; "Prohibited uses include ... voice impersonation or cloning without explicit and lawful consent" |
| U1 | https://github.com/supertone-oss-archive/supertonic | Supertone | archived (2026) | 2026-11-07 | Archived; licences | "**This repository is archived. Development and support have ended.**" ; "This project's sample code is released under the MIT License." ; "The accompanying model is released under the OpenRAIL-M License." |
| C1 | https://github.com/resemble-ai/chatterbox | Resemble AI | n/d | 2026-11-07 | Retired, MIT, watermark | "**As of August 2026, Chatterbox is retired research and is no longer maintained.**" ; "Every audio file generated by Chatterbox includes Resemble AI's Perth (Perceptual Threshold) Watermarker" ; Nano "3x faster than realtime on 8 CPU cores" |
| N1 | https://huggingface.co/gradium/phonon-31m-en | Gradium | created 2026-10-19 | 2026-11-07 | Newer small model | "phonon-31m-en \| 31m \| 64.5 MB \| English \| Apache 2.0" ; "phonon-40m-en ... CC BY-NC 4.0" ; "Phonon builds on Pocket TTS" |
| N2 | https://registry.npmjs.org/sherpa-onnx-node | k2-fsa (Xiaomi) | 2026-10-26 (v2.0.1) | 2026-11-07 | One npm addon, many models | Apache-2.0; optionalDependencies for darwin-arm64/x64, linux-x64/arm64, win-x64/ia32/arm64; examples `test_tts_non_streaming_kokoro_en_*`, `_kitten_en_*`, `_pocket_en*`, `_supertonic_en*`, `_vits_piper_en_*` |

---

#### 1. Free local TTS candidates

Licence column: "Workshop OK" means running it locally to make narration for internal or teaching use. "Commercial" means using the output in paid work. Neither is legal advice.

| Candidate | Code licence | Weights/voice licence | Commercial / workshop | Node with no Python | Download | Cache | Quality (TTS Arena V2) | CPU speed | English voices | Word/phoneme timings |
|---|---|---|---|---|---|---|---|---|---|---|
| **Kokoro-82M via `kokoro-js`** | Apache-2.0 (K3) | Apache-2.0 (K1) | Yes / Yes. ⚠️ The `phonemizer` dependency declares Apache-2.0 but wraps eSpeak NG, which is GPL-3.0 (K11). This matters only if you redistribute the bundle. | `npm i kokoro-js` **1.2.1** (2025-05-03). It uses transformers.js ^3 (resolves to 3.8.1) and onnxruntime-node, with `device:"cpu"`. ⚠️ Last release was 18 months ago. | q8 ≈ 92 MB; fp32 ≈ 326 MB (K4); npm package ≈ 30 MB unpacked | `node_modules/@huggingface/transformers/.cache/` by default (K5). You can override it with `env.cacheDir` (⚠️ untested: whether this takes effect through kokoro-js's own import) | #30 of 41, Elo 1465, 1,033 votes, marked retired (snapshot 2026-11-02, A1 ⚠️ secondary). #29, 1478 ±22 on 2026-10-10 (A2) | 0.4–0.9 s of compute per 1 s of audio on an M2 in Node (K8). RTF 51.7% on 1 core and 17.2% on 4 cores, i9, Python ONNX (K10) | 20 en-US + 8 en-GB. Best grades: af_heart A, af_bella A-, af_nicole B-, bf_emma B- (K2) | **None from kokoro-js** (K6). Python `kokoro` gives English token `start_ts`/`end_ts` (K7). In JS, estimate from per-sentence chunk durations from `tts.stream()` |
| Kokoro via `kokoro-onnx` | MIT | Apache-2.0 | Yes / Yes | **Python only** (`pip install kokoro-onnx`) | ~300 MB, or ~80 MB quantized | n/a | as above | "near real-time on macOS M1" (README) | as above | no |
| Kokoro/Kitten/Pocket/Supertonic/Piper via **`sherpa-onnx-node`** | Apache-2.0 | per model | per model | `sherpa-onnx-node` **2.0.1** (2026-10-26). Prebuilt native addon for mac/win/linux (N2). Model tarballs are downloaded by hand from k2-fsa releases. ⚠️ The phonemize examples need `piper-phonemize-node`, which is GPL-3.0-or-later | per model | your choice | — | the examples print the RTF | per model | ⚠️ none documented |
| **Piper** | archive rhasspy/piper is MIT and archived (P1). Active development is `OHF-Voice/piper1-gpl`, **GPL-3.0**, v1.8.0 2026-09-04 (P2) | **Varies per voice**: ljspeech public domain, libritts_r CC BY 4.0, ryan CC BY-NC-SA 4.0 (non-commercial), lessac uses the Blizzard licence ⚠️ (P4) | Workshop yes. Commercial depends on the voice; choose ljspeech or libritts_r | Official install is `pip install piper-tts`. Node options: `piper-tts-web` 1.1.2 (MIT, browser-oriented wasm), `@mintplex-labs/piper-tts-web` 1.0.5, or sherpa-onnx-node | 64 MB medium voice (K10) | depends on the runtime | not on TTS Arena V2 | fastest measured: 5.8% RTF on 1 core (K10) | many en_US/en_GB voices | **Phoneme** alignments (experimental) in the Python and C++ APIs only, after patching the voice (P3) |
| **Kitten TTS 0.8** (nano/micro/mini) | Apache-2.0 | 0.8 ONNX weights Apache-2.0 (T2). Kitten-TTS 2 (1.7B) uses the Stellon Labs Community License ⚠️ terms not read (T1) | 0.8: Yes / Yes | `kitten-tts-js` **0.1.2**, unofficial port (T3), onnxruntime-node, CPU-only in Node | nano int8 25 MB; mini 80 MB (T1) | `~/.cache/kitten-tts/` (T3) | not on the board | "runs on CPU"; ⚠️ no published Node RTF found | 8: Bella, Jasper, Luna, Bruno, Rosie, Hugo, Kiki, Leo | no |
| **Kyutai Pocket TTS** | MIT | CC-BY-4.0 (attribution) plus prohibited-use terms. The cloning model is gated (Q2) | Yes with attribution / Yes | No official npm package. Options: (a) the official standalone `pocket-tts` binary, no Python (Q1), spawned from Node; (b) sherpa-onnx-node; (c) community `pocket-tts` npm 1.0.0 ⚠️ unvetted | weights 236 MB (K10) ⚠️ size varies by variant | HF cache | not on the board | "~6x real-time on a CPU of MacBook Air M4"; RTF 24.1% on 4 cores (K10) | 19 English presets listed in the README (alba, anna, azelma, ...) plus cloning. New 18M/7M/2M English models arrived Oct 2026 | ⚠️ none documented |
| **Supertonic 3** | MIT | **OpenRAIL-M** (use-based restrictions) ⚠️ | Commercial use is allowed only within the OpenRAIL use restrictions / Workshop yes | The official Node example uses `onnxruntime-node` directly (no npm package; npm `supertonic` 0.0.1 is a stub). Also sherpa-onnx-node. **The repo is archived; development has ended** (U1) | ONNX ≈ 398 MB (vector_estimator 256.5 + vocoder 101.4 + text_encoder 36.4 + duration 3.7 MB) | your choice | not on the board | ⚠️ no CPU RTF in the README apart from an e-reader at "0.3×" | 10 styles (M1–M5, F1–F5) | ⚠️ none documented |
| **Chatterbox** (orig/Turbo 350M/Nano 110M) | MIT | MIT. **Every output is watermarked (PerTh)** | Yes / Yes. **Retired and unmaintained since Aug 2026** (C1) | Python/PyTorch. ONNX exports exist (`ResembleAI/chatterbox-turbo-ONNX`, `onnx-community/chatterbox-ONNX`), but the examples are Python ⚠️ no supported Node path | ⚠️ not measured | — | #29, Elo 1468 (A1) — the highest open-weight model on the board | Nano "3x faster than realtime on 8 CPU cores" (C1) | default voice plus zero-shot cloning | no |
| **Phonon 31M en** (Gradium, Oct 2026, newer) | runtime "MIT OR Apache-2.0" (npm `phonon-tts` 0.6.0) | 31M English model Apache-2.0. The 40M models are **CC BY-NC 4.0** (N1) | 31M: Yes / Yes | `phonon-tts` is described as browser WASM. ⚠️ Node use only through Micdrop's worker wrapper; I have not verified it in plain Node | 64.5 MB q8 | HF | not on the board | first sound 30–100 ms on one M2 core (K8) | 102-voice catalogue | ⚠️ none documented |

Other newer models: Qwen3-TTS (needs a GPU per K8), NeuTTS, Maya1 and VibeVoice are all Python/GPU-oriented, so none of them fits the npm-only constraint.

##### Recommendation

Use **Kokoro-82M via `kokoro-js` 1.2.1**, with `dtype:"q8"` (about 92 MB, downloaded once), `device:"cpu"`, and voice `af_heart` (alternatives are `bf_emma` for British English and `am_michael` for a male voice).

Why it fits:
- It is the only candidate with an official npm package that installs in one command, needs no Python, and runs in-process on Node 20 on all three OSes.
- Both code and weights are Apache-2.0.
- It is the best-ranked small open model on TTS Arena V2, within about 3 Elo of Chatterbox (A1).
- On a laptop, a 60–90 s script takes about 25–80 s to synthesise (K8).

Caveats to design around:
1. The package has had no release since 2025-05. Pin the version and set an explicit cache dir.
2. It gives no word timings. Synthesise one sentence per call, take each sentence's duration from the sample count, and spread the time across characters. Or skip word-level sync.
3. eSpeak NG (GPL) sits inside `phonemizer`. That is fine for local use; add a note if the skill ever ships bundled binaries.

If the skill needs a smaller download or more engines later, `sherpa-onnx-node` (Apache-2.0, prebuilt) is the best single runtime. It can run Kokoro, Kitten, Pocket TTS, Supertonic and Piper, at the cost of manual tarball handling.

---

#### 2. ElevenLabs API (elevenlabs.io/docs)

- **Endpoint:** `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps` (S1). Data-residency hosts exist, for example `api.us.elevenlabs.io` and `api.eu.residency.elevenlabs.io`.
- **Auth:** header `xi-api-key: <key>`, plus `Content-Type: application/json` (S4).
- **Query parameters:**
  - `output_format` is a **query parameter, not a body field** (S1). The default is `mp3_44100_128`.
  - `mp3_44100_192` needs Creator or higher, and 44.1 kHz PCM/WAV needs Pro or higher (S3). Use `mp3_44100_128`, or `pcm_24000`/`wav_24000` ⚠️ (the plan gating of 24 kHz formats is not stated).
  - `enable_logging` is also a query parameter.
- **Body fields:**
  - `text` (required).
  - `model_id` (default `eleven_multilingual_v2`).
  - `voice_settings{stability 0.5, similarity_boost 0.75, style 0, use_speaker_boost true, speed 1}`.
  - `language_code`, `seed`, `previous_text`, `next_text`, `previous_request_ids`, `next_request_ids`, `apply_text_normalization` (auto/on/off), `pronunciation_dictionary_locators` (max 3), `audio_effects` (S1).
- **Response (JSON):**
  ```json
  { "audio_base64": "...",
    "alignment": { "characters": [...], "character_start_times_seconds": [...], "character_end_times_seconds": [...] },
    "normalized_alignment": { ...same shape, for the normalised text } }
  ```
  - `alignment` and `normalized_alignment` are nullable.
  - Timing is character-level only. Build word timings yourself by splitting `characters` on whitespace (S14).
- **Model:**
  - The current quickstart uses **`eleven_v4`** (S5). It launched 2026-09-28 (S7) and has a 10,000-character limit (S6).
  - ⚠️ The docs say "Eleven v4 is available via the Text to Dialogue API", and the quickstart calls `textToSpeech.convert` with v4. However, no page explicitly confirms v4 on the **with-timestamps** route.
  - v4 has no Style or Speed sliders and no SSML (S8).
  - The safe fallback is the endpoint default, `eleven_multilingual_v2`, which the docs call "Most stable on long-form generations" (S6).
  - Suggested logic: try `eleven_v4`, and on a 4xx error, retry with `eleven_multilingual_v2`.
- **Default voice:**
  - The quickstart uses **George `JBFqnCBsd6RMkjVDRZzb`** (S5).
  - But Default voices **expire on 2026-12-31** and exist only on accounts created **before March 2026** (S9). No premade voice is guaranteed to be on every account.
  - The listed replacement for George is **Eldrin – Crisp British Baritone `6WwXjDDEMyNmFG95zycZ`** (S9). ⚠️ I could not verify whether replacement voices can be used through the API on the free tier, since free-tier users cannot use Voice Library voices through the API (S10).
  - Suggested approach: read `ELEVENLABS_VOICE_ID`. If it is unset, call `GET https://api.elevenlabs.io/v1/voices` and use the first voice, or one the user picks.
- **Free tier:**
  - It allows API use: "Most of our API endpoints are available for all plans, including the free plan" (S11).
  - The allowance is **10k credits per month** (S12). ⚠️ The credits-per-character rate for v4 is not stated. The Kokoro card estimates about 1,000 characters per minute of speech, so a 90 s script is roughly 1.5k characters.
  - There is no commercial licence on the free plan (S12, S13).
- **SDK:** `@elevenlabs/elevenlabs-js` 2.77.0. The method is `textToSpeech.convertWithTimestamps` ⚠️ (method name not confirmed in the JS docs). Plain `fetch` is enough.

#### 3. Fish Audio API (docs.fish.audio)

- **Endpoint:** `POST https://api.fish.audio/v1/tts` (F1). The response is raw audio bytes, sent chunked.
- **Headers:**
  - `Authorization: Bearer <FISH_API_KEY>` and `Content-Type: application/json` (msgpack is also accepted).
  - `model: <id>` is optional.
- **`model` header values** (F1, F7):
  - Accepted: `s2.1-pro` (default, recommended), `s2.1-pro-free` (free developer tier), `s2-pro`, `drama-3`, and `s1` (deprecated, retires 2026-12-31).
  - `speech-1.6` and `speech-1.5` were **deprecated on 2026-02-28**. They are no longer in the enum, and any unrecognised value **silently falls back to `s2.1-pro`**, which is billed.
- **Body fields** (F2):
  - `text` (required).
  - `reference_id` (a voice model ID string).
  - `format`: wav, pcm, mp3 or opus. Default mp3.
  - `mp3_bitrate`: 64, 128 or 192. Default 128.
  - `latency`: normal (best quality), balanced or low. Default normal.
  - `normalize`: default true.
  - `sample_rate`: default 44100.
  - `prosody{speed, volume, normalize_loudness}`, `temperature` 0.7, `top_p` 0.7, `chunk_length` 100–300, `language` (BCP-47), `pronunciation_dictionary`.
- **Voice:**
  - Copy the model ID from the URL `https://fish.audio/m/<id>`.
  - If you omit `reference_id`, a default voice is used (F4).
  - Public English voice in the docs: **"Energetic Male" `9a9cf47702da476aa4629e2506d4a857`** (F4).
  - List voices with `GET /model`.
- **Timestamps:**
  - `/v1/tts` returns none.
  - Use **`POST /v1/tts/stream/with-timestamp`** with the same body. It returns SSE `message` events, each carrying `audio_base64`, `content`, `alignment{segments:[{text,start,end}], audio_duration}`, `chunk_seq` and `chunk_audio_offset_sec`.
  - To assemble it: concatenate the `audio_base64` chunks in order. *Replace*, don't append, the alignment for each `chunk_seq`. The absolute time is `chunk_audio_offset_sec + segment.start` (F8).
  - The timings are word-level.
  - A WebSocket version also exists: `wss://api.fish.audio/v1/tts/live/with-timestamp`.
- **Pricing:**
  - Pay-as-you-go with no subscription. `s2.1-pro` costs $15 per million UTF-8 bytes; `s2.1-pro-free` costs $0 under fair use (F5).
  - New accounts start with **no API credit**. Paid models return **402** on a $0 balance (F4).
  - ⚠️ The changelog says the free model is free "through November 30, 2026" (F6), but the current pricing page lists it at $0 with no end date. Plan for it possibly ending in 23 days, and handle 402 with a clear message.
  - Concurrency is 5 at the Starter tier (F5).
- **Env var:** **`FISH_API_KEY`**. The official Python `fish-audio-sdk` reads it automatically, and the JS `fish-audio` 0.1.0 examples pass `process.env.FISH_API_KEY` (F3, F9).

#### 4. ElevenLabs env var

**`ELEVENLABS_API_KEY`** (S4, S5). The quickstart puts it in `.env`, and the TS example calls `new ElevenLabsClient()` with no explicit key after loading `dotenv/config`.
