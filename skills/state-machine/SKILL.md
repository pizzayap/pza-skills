---
name: state-machine
description: >-
  Render every state of one component on a throwaway dev page, fed by mock data,
  with a grouped switcher so you can flip between states and design each one.
  Use when the user says "show me every state of X", "I need to design the
  empty/error/loading state", or "build a state switcher for this card". Not for
  stress-testing content (edge-case), exploring alternative designs
  (design-variant) or critiquing finished UI (ui-review).
user-invocable: true
disable-model-invocation: true
argument-hint: '[component name or path]'
---

# State machine

This skill does one thing: it puts every state a component can really be in on one throwaway page, so a designer can work on each state with the real component, real styles and believable data. It does not stress-test long text or tiny containers (that's `edge-case`), invent new designs (that's `design-variant`) or score the craft (that's `ui-review`).

The page is a workbench, not a deliverable. It lives in one folder, never ships, and is deleted in one step when the user is done.

## Stance

The states come from the code, not from imagination. A designer opens this page to answer "what does the user see when the connection drops?", and the answer must be what production would really render.

Two failure modes, and the first is worse:

1. **Faking a state.** Editing the component, adding a branch, or mocking so deep that the page shows something production never could.
2. **Missing a state.** A branch exists in the code (auth expired, partial data) and the switcher does not offer it, so nobody designs it.

## Hard rules

1. **One component per run.** "The settings page" is several components. List them and ask which one.
2. **Never edit the component.** Import it as is. All state comes from outside: props, providers, or mocked data at the fetch boundary.
3. **Only reachable states.** If the design shows a state the code cannot reach, list it under "Missing in code" in the report and leave it off the switcher.
4. **Mock data reads like production.** Real-looking names, plausible numbers, realistic lengths. No "Lorem ipsum", no "Test User 1".
5. **The switcher stays outside the design system.** Neutral chrome, system font, no project tokens, so it is never mistaken for the design. Spec: [switcher.md](references/switcher.md).
6. **One folder, dev only.** Page, fixtures and switcher live in one folder that production never imports. Removal is one delete plus any route registration line.

## The sequence

### 1. Scope the component

Restate it in one sentence: what it shows, where it renders, where its data comes from. **Gate:** if the request names more than one component, stop and ask which one.

### 2. Map the states from the code

Read the component and the hooks or queries that feed it. List every branch it renders. Use this table as a checklist, not a quota:

| Group | Typical states |
| --- | --- |
| Data | Skeleton or loading, empty, one item, typical set, long set that scrolls, syncing or refetching, error, partial (some parts loaded) |
| Connection | Connected, setup incomplete, connected elsewhere, disconnected, reconnecting |
| Access | Signed out, auth expired, missing permission, read-only role, owner vs member |
| Plan or feature | Free vs paid tier, trial, limit reached, feature flag off, locked |

Name groups and states the way the product does ("Auth expired", not "error_401"). Combine two groups only where the code branches on the combination. Never build the full cross product.

Write the list before building:

```text
Connection: Connected, Setup incomplete, Connected elsewhere, Disconnected
Data: Skeleton, Syncing, Error
Access: Auth expired, Missing permissions
Dropped: "Plan" (the component never reads the plan)
Missing in code: "Rate limited" (in the design file, no branch exists)
```

### 3. Build the page

Create the page at `/lab/states/<component>` using the route table in [switcher.md](references/switcher.md#where-the-page-lives), from the copied `StateLab` kit. The page renders the real component once, at its production width, inside the app's providers so fonts, theme and providers come for free. In frameworks that split server and client code, make the page client code (`"use client"` in Next.js). Otherwise mock data passed across that split may not arrive, and the page renders blank with no error.

### 4. Feed each state from outside

Pick the shallowest boundary that works:

| Preference | Boundary | Use when |
| --- | --- | --- |
| 1 | Props | The component takes its data as props |
| 2 | Provider or context value | Data comes from a context or store you can wrap |
| 3 | Mocked request (MSW, a fetch stub, a query-cache seed) | Data is fetched inside the component |

Loading and syncing states must hold still: resolve them to a never-settling promise or a fixed flag, not a short timeout, so the designer can study them.

### 5. Hand it over

Open the page, click through every state once, and confirm each one renders what its name says. Then give the user the link and stop. The user works; the page stays up until they say they are done.

### 6. Clean up when asked

Delete the folder and any route line you added. Run the type check or build to confirm nothing imported it.

## Output

```text
State machine: <component>
Page: http://<dev-url>/lab/states/<component>
States (10): Connection 4 · Data 3 · Access 2 · Plan 1
Missing in code: Rate limited
Keys: ↑/↓ or ←/→ step · H hide switcher
Remove: delete <folder> (+ <route file> line <n>)
```

## Anti-patterns

- **The helpful branch.** A new `if (demo)` appears in the component to reach a state. The tell: the component's diff is not empty.
- **The cross product.** 4 connection states times 3 data states times 2 roles gives 24 entries nobody reviews. The tell: state names joined with "+" that the code never checks together.
- **The vanishing skeleton.** Loading resolves after 300ms, so the designer never sees it. The tell: a `setTimeout` in a fixture.
- **The themed switcher.** The switcher uses the product's brand color and gets screenshotted as part of the design. The tell: a project token or font in the switcher's styles.

Inspired by Jakub Krehel's `state-machine` skill (MIT).
