# How product designers use agents and subagents

Research for Day 2 of the Codex workshop for product designers (Group 1: Tuesday 10 November
2026, Group 2: Tuesday 17 November 2026). Collected on Saturday 7 November 2026 from X, read
signed in through the T3 in-app browser, plus web search and the official OpenAI docs.

Every source below was checked on **2026-11-07**. Post dates come from the post's own
timestamp on X; some show the next day in Singapore time, and both are given where that
happens. Quotes are copied from the page. ⚠️ marks anything unknown or not confirmed.

## What Codex supports today

**The Codex desktop app is now a view inside the ChatGPT desktop app.** Since 9 July 2026 the
ChatGPT desktop app has three views, Chat, Work and Codex. Codex users updated straight into
it, and the help article says Codex "workflows are unchanged". The old Codex docs at
developers.openai.com/codex now redirect to learn.chatgpt.com/docs.

- [Moving to the new ChatGPT desktop app](https://help.openai.com/en/articles/20001276-moving-to-the-new-chatgpt-desktop-app), OpenAI Help Center (shows "Updated: 9 days ago").
- [Business Insider, 9 July 2026](https://www.businessinsider.com/openai-codex-chatgpt-app-releases-gpt-5-6-models-2026-7).

| Feature | Status today | What a designer does in the app | Source |
|---|---|---|---|
| Subagents | On by default. Launched in the Codex app and CLI on 16 March 2026 ([@OpenAIDevs](https://x.com/OpenAIDevs/status/2033636701848174967)). | Ask for them in plain words ("use one subagent per direction"), or run a skill that asks. The app shows each subagent's chat, plus a Subagents panel with Active and Done lists. | [Subagents docs](https://learn.chatgpt.com/docs/agent-configuration/subagents) |
| When Codex delegates | "when you ask directly or when applicable `AGENTS.md` or skill instructions request it". Codex does not delegate on its own, except at the Ultra level in ChatGPT Work. | A skill can contain the request, so the designer doesn't have to remember to ask. | Same page |
| Subagent cost | "subagent workflows consume more tokens than comparable single-agent runs". Parallel agents fit "read-heavy tasks such as exploration, tests, triage, and summarization". Take care with parallel writes, because agents editing code at once "can create conflicts". | Each subagent writes only its own files. | Same page |
| Subagent limits | `agents.max_concurrent_threads_per_session` caps them. "When you leave [it] unset, Codex chooses the default." ⚠️ The current number isn't published. The May 2026 docs said 6 threads and depth 1 ([Wayback, 24 May 2026](https://web.archive.org/web/20260524042439/https:/developers.openai.com/codex/subagents)). ⚠️ The current docs don't mention depth. | Keep it to 3 to 5 subagents per run. | Same page |
| Custom agents | One TOML file per agent in `.codex/agents/` (project) or `~/.codex/agents/` (personal). Required fields: `name`, `description`, `developer_instructions`. They cannot override `sandbox_mode` or `approval_policy`. | Optional. Our skills don't need them, because each brief goes inside the skill. | Same page; [config reference](https://learn.chatgpt.com/docs/config-file/config-reference.md) |
| Skills | `SKILL.md` folders found in `.agents/skills` (repo) and `~/.agents/skills` (personal). | Call one with `$skill-name`, or choose it from the `/` list or the Skills page in the sidebar. `npx skills add` installs into `.agents/skills`. | [Build skills](https://learn.chatgpt.com/docs/build-skills) |
| Parallel chats | Yes. "Run projects in parallel… Keep parallel work visible." `/side` opens a side chat, and `/fork` copies a chat into a new chat or worktree. | A good option when the designer, not the agent, wants to steer each direction. | [App docs](https://learn.chatgpt.com/docs/app) |
| Worktrees | Yes. Choose Worktree under the composer, or use `/worktree`. Hand off moves a chat between Local and the worktree. | Useful when directions must change real app code without colliding. Not needed for static HTML. | [Git worktrees](https://learn.chatgpt.com/docs/environments/git-worktrees) |
| HTML preview | The desktop app previews generated files: "When HTML previews are available, generated .html and .htm files can also open as interactive previews." The CLI has no visual preview. | Click the generated `.html` in the chat, or double-click it in Finder. | [Artifacts viewer](https://learn.chatgpt.com/docs/artifacts-viewer) |
| In-app browser | Opens "the local route, file-backed page, or public page". Has annotation and Adjust, and agents can drive it through `@Browser`. Not available in the CLI or the IDE extension. ⚠️ The impeccable critique skill tells Codex "Do not spend a Browser attempt on `file://`", which conflicts with the docs. Our skills don't depend on it. | Walk the running app. Open the report from Finder if the browser refuses a file. | [Browser docs](https://learn.chatgpt.com/docs/browser?surface=app) |

Official design material from OpenAI:

- [Codex and Figma code-to-design launch](https://openai.com/index/figma-partnership/), 26 February 2026.
- [Building frontend UIs with Codex and Figma](https://developers.openai.com/blog/building-frontend-uis-with-codex-and-figma), date not shown ⚠️.
- [@OpenAIDevs, 21 May 2026](https://x.com/OpenAIDevs/status/2057530210967523399): in-app browser annotation mode "so designers and developers can show exactly what they want".
- [@embirico, 20 April 2026](https://x.com/embirico/status/2046033614106931414) (Alexander Embiricos, Codex): "when I need anything new, I say 'using a subagent in parallel, do X'".
- [@embirico, 8 October 2026](https://x.com/embirico/status/2108344827536617902): "We currently limit the number of parallel subagents".

## The best findings

### 1. Many options at once, then the human picks

- **[@foomix (Thomas), 15 July 2026](https://x.com/foomix/status/2077324522953294309)** (timestamp 2026-07-14 UTC on the quoted thread):
  "I've tried many variations of taste improvement skills, hacks, etc. Nothing comes close to
  version variance. Tell your agent 'set up an html view where I can review design options,
  spawn 5 subagents, have each one design 2 versions, I'll pick the one I like'". The whole
  pattern fits in one sentence: an HTML board, subagents, and a human pick.
- **[@MilksandMatcha (Sarah Chieng) with @0xSero, 17 April 2026](https://x.com/MilksandMatcha/status/2044863551186309460)**,
  X article "Single-agent AI coding is a nightmare for engineers", 293.7K views.
  - It calls this pattern "The Prep Line": "Have your line cooks each generate many options,
    then manually pick the best ones", and calls it "a great way to inject taste into your AI
    workflow."
  - Example: "50 variations of a mascot… we dispatched 5 Codex spark sub-agents with 10
    variations each."
  - Speed: "Running five parallel mascot generations took roughly one minute versus five
    minutes sequentially."
  - It also gives a Codex + Figma MCP comparison: single-agent runs averaged "36.5 min/run…
    12 interventions (and 100% failure rate)", while the multi-agent run took "5.2 minute[s], 2
    manual interventions, and success on the first try".
  - ⚠️ The article is sponsored by Cerebras and promotes Codex Spark. The numbers are the
    authors' internal trials, not independent measurements.
- **[@notEgoyard (YARD), 6 September 2026](https://x.com/notEgoyard/status/2096616218400637045)**
  describes a `/wireframe` skill that "generates 5 different UX approaches - one safe extension
  of your existing patterns, four genuinely exploratory - all in black and white first, all
  interactive, all in one HTML file". It "scans your CSS, JS, and templates to learn your actual
  design patterns before generating anything". After the pick, "5 parallel agents kick in and
  write Clean and Polished color variants". ⚠️ The post doesn't link the skill's source, and I
  couldn't find its author.
- **[Jidong Lab blog, 16 April 2026](https://portfolio-site-2ez.pages.dev/posts/2026-04-16-portfolio-site-en)**,
  "10 Parallel Claude Agents, 139 Tool Calls, Zero Code Written".
  - Ten agents each built one named concept (bento, Swiss tabular, neo-brutalism…) as a
    standalone HTML mockup. The mockups were compared in the browser with an injected top-bar
    switcher.
  - What broke: vague early prompts. Two rounds were rejected ("all of these are bad, find a
    design skill") until a design skill was loaded.
  - Lesson: parallel agents suit comparing directions, not implementation.
  - ⚠️ No personal name; the byline is "jidonglab".
- **[@felixleezd (Felix Lee), 2 April 2026](https://x.com/felixleezd/status/2039731306612060186)**,
  "A Guide to Claude Code and Paper for Designers", 58K views. Claims "10 new design iterations
  in 5 minutes" by driving the Paper canvas over MCP. It's a single agent, not subagents; it
  shows how designers frame the value.

### 2. Panels of reviewers who score separately, then merge

- **[@ShreyashGuptas (Shreyash Gupta), 6 November 2026](https://x.com/ShreyashGuptas/status/2118486099014062567)**
  (2026-11-05 UTC). He reports: "Had my agent run a panel and vote and rank things to improve
  readability and accessibility of the website, and it made hundreds of very tiny changes and it
  looks so much better than just saying 'improve the website'."
  - The dictated prompt asks for "a total of 9 sub agents", which all "rank every single place
    where a design system should be improved out of a scale of 1 to 10". Items above 7 get
    variations, "voted on which one would be the best", then "screenshots of before and after".
  - It walks pages as a reader would: "what questions someone might have when they are
    scrolling".
  - ⚠️ The result is his own judgment. He showed no before and after in the post.
- **[@reach_vb (Vaibhav Srivastav), 6 July 2026](https://x.com/reach_vb/status/2074152211882426857)**:
  "All our docs PRs are reviewed by both @dkundel and @charlierguo (or rather sub agents that
  mimic their past PR reviews)". Reviewer roles built from a real person's past comments, not
  generic personas. In a reply, [@kavindpadi](https://x.com/kavindpadi) suggests the same for
  PRDs and strategy docs.
- **impeccable `critique` by Paul Bakaus**
  ([repo](https://github.com/pbakaus/impeccable), Apache-2.0, last push 2026-11-07; file
  `skill/reference/critique.md`):
  - It runs "two independent assessments" as "two isolated sub-agents"; "They must not see each
    other's output."
  - A run without subagents must say so: "⚠️ DEGRADED: single-context".
  - Codex-specific: "Codex's permission model requires asking before spawning". ⚠️ This
    conflicts with the official docs, which let skill instructions request delegation. My test
    runs below check it.
  - Desktop apps run assessors one at a time, because "both sub-agents would drive the app's
    single window at once".
  - Persona walkthroughs pick "2–3 personas most relevant to the interface" and report "what
    broke for them", not generic descriptions.
- **[Designpowers by MC Dean (Owl-Listener)](https://github.com/Owl-Listener/designpowers)**
  (76 commits; ⚠️ last commit date not shown). Ten design agents in a mostly sequential
  pipeline. The accessibility reviewer and design critic "run simultaneously after the build",
  then their findings are reconciled before a fix round.

### 3. Personas walking a flow

- **[Brian Parsons, AI agents case study](https://brian-parsons-bpdesigns.squarespace.com/ai-agents)**
  (⚠️ no date; image names suggest mid-2025). He built a CrewAI panel of accessibility personas
  modeled on gaming accessibility consultants.
  - **What broke:** the reports "lacked actionable design feedback", and the technology "Was
    not production ready technology for accurate information".
  - He moved to in-house WCAG and EAA guidelines instead.
  - **Lesson for our skill:** every persona finding must point at an element and carry a fix.
    Personas are a way to look, not a stand-in for research with real people.
- **[@01ayushgarg, 28 September 2026](https://x.com/01ayushgarg/status/2104525440593633312)**:
  "I made my AI agent sign up for my own SaaS as a new user - it recorded every user flow".
- **[Figma Help Center](https://help.figma.com/hc/en-us/articles/41159752541719)** (⚠️ date not
  checked) recommends giving an agent a persona and asking targeted questions, such as whether
  contrast, tap targets and reading order meet guidelines.

### 4. What breaks

- **[@Lon (Lon Lundgren), 7 October 2026](https://x.com/Lon/status/2107616818726838545)**, 114.6K
  views: "I regret letting Codex ever run with a /goal prompt or launch sub-agents… The model
  always goes off track, ignores scope, and finds a way to digress into scaffolding,
  certification machinery, evidence gathering or audits… it always ends in an absolute mess of
  junk files, slop code, and an account drained of limits."
- **[@ZypherHQ, 4 November 2026](https://x.com/ZypherHQ/status/2117889910795358213)**: "Don't let
  your subagents overengineer… they often mistake achieving a satisfactory result for running 10
  subagents to review".
- **[@thsottiaux, 29 June 2026](https://x.com/thsottiaux/status/2071740419030053227)** and
  **[29 August 2026](https://x.com/thsottiaux/status/2093801758665715784)**: Codex reset usage
  limits after reports that usage was consumed faster than expected.
- **Jidong Lab (above):** directions from a vague brief all looked like the default style until a
  design skill was loaded.
- **Brian Parsons (above):** personas without element-level evidence give feedback nobody can act
  on.

## Patterns, and which ones to build

| Pattern | Evidence | Fit for designers in the Codex app | Decision |
|---|---|---|---|
| Parallel design directions on one HTML board, human picks | foomix, Chieng "Prep Line", YARD `/wireframe`, Jidong Lab | Every task is independent, so there are no file conflicts. Output is visual. Teaches subagents with the lowest risk. | **Build: `design-directions`** |
| Persona walkthrough of one flow, merged into a friction map | impeccable personas, Parsons (failure lesson), ayushgarg | Mostly reading, which the docs name as the best fit for parallel agents. Gives designers a usability lens they can't get from a static critique. | **Build: `persona-walkthrough`** |
| Critique panel that scores and votes | Shreyash Gupta, reach_vb, impeccable A/B, Designpowers | Strong, but it overlaps with `ui-review` and `explain-design` in this repo. | Not built. Open question for Pizza |
| Competitor teardown, one subagent per competitor | Mike Futia's 10-agent ad teardown in Claude Cowork ([4 March 2026](https://x.com/mikefutia/status/2029220162818453968)) | `competitor-teardown-to-briefs` already exists and can run one competitor per subagent without a new skill. | Not built |
| Builder plus separate verifiers | Chieng "Gordon Ramsay", Designpowers | A discipline more than a designer workflow. Both new skills check every subagent's output before accepting it. | Built into both skills |

Out of scope: 3D, motion and the AI avatar (Meng To's part of the session), and design handoff
(a separate thread).

## What the test runs showed (7 November 2026)

Both skills ran in Codex CLI 0.167.0 (`codex exec`, workspace-write sandbox) on temporary copies
of the workshop web-app.

- **Codex started subagents from the skill text alone.** Each run spawned three subagents
  (`/root/direction_1` to `direction_3`; `/root/first_time`, `/root/power`, `/root/screen_reader`)
  without a separate request and without a permission prompt. ⚠️ This was exec mode with an
  automatic approval reviewer. Whether the desktop app asks first, as the impeccable skill
  claims, is untested.
- **Walkers ran in parallel in separate Playwright browser contexts,** using the project's own
  `playwright-core`. ⚠️ Untested: whether the desktop app's built-in browser gives each subagent
  its own tab.
- **What broke:**
  - Both builder scripts had a syntax error. Codex worked around it by patching copies of the
    scripts in the run folder.
  - The report crammed caveats into the goal line.
  - Full-size PNG screenshots made the report 19 MB.
  - An automatic approval reviewer blocked one walker from clicking a disabled button.
  - All of these led to fixes in the skills: escaped script, `notes` field and length limits,
    JPEG viewport captures, "trying a disabled control is part of the walk", and "report
    script errors, don't patch".
- **Second run, on the fixed skills:**
  - People screen, structure axis: three subagents built clearly different layouts (panel,
    access matrix, sharing groups). The board built cleanly, and the orchestrator sent
    direction 3 back once for contrast.
  - "Why is the first flight late" from `/home?m=2`: all three personas gave up. They found
    four issues, including "Submitted delay questions clear without an answer". The report
    was 3.9 MB, and Codex kept its own check files in `checks/`.

## Rules the two skills take from this

1. **Each subagent owns its own files and edits no shared files.** This follows the docs' warning
   about parallel writes and Chieng's "tasks don't share files".
2. **Each subagent starts with the same short brief** and never sees the other subagents' work,
   so the directions or personas stay independent (impeccable).
3. **A fixed number of subagents, 3 by default and 5 at most.** No extra review agents, no audit
   documents (Lon, ZypherHQ, usage limits).
4. **Read the project's design system first,** or every direction comes out in the default look
   (Jidong Lab, YARD).
5. **The human picks.** The agent never ranks the directions (foomix, Chieng).
6. **Every finding points at an element and carries a fix,** and personas are labeled as a
   walkthrough, not research (Parsons).
7. **Without subagents, run the same briefs one after another, and say so in the output**
   (impeccable's degraded banner).
8. **The deliverable is one HTML file that opens with a double-click,** because the Codex app
   previews generated HTML and designers share files.
