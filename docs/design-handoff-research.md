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

