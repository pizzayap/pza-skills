# Instruction quality scores

Use this when preparing the audit report, before edits, and when reporting actual
updates. Scores summarize this rubric's evidence-backed judgments. They are not
probabilities of success, percentages of code correctness, performance benchmarks,
or an official score from Eric Provencher or OpenAI.
Evidence coverage means assessed rubric weight, not test coverage or proof that
referenced commands have run successfully.

## Five criteria, 20 points each

| Criterion | Skills | AGENTS.md |
|---|---|---|
| Relevance and scope | Clear task ownership and selective triggers, distinct from neighboring skills | Useful project knowledge placed at the appropriate root or nested scope |
| Context efficiency | Detail appears when needed; a short single-file skill is valid | Conditional document reading, little duplication or unrelated always-loaded prose |
| Clarity and actionability | Usable outcomes and procedures, with exact steps where they matter | Concrete, understandable conventions and workflow instructions |
| Accuracy and consistency | Valid resources, supported claims, coherent instructions and adapters | Current paths and command definitions, supported claims, coherent parent/child rules |
| Completion and authority | Finishes authorized work with relevant checks and genuine stopping boundaries | Proportionate validation, useful persistence, and explicit approval boundaries |

Rate each assessable criterion using these anchors:

- 20: supported by evidence; no material issue found within the reviewed scope.
- 15: useful overall; a small, localized issue limits it.
- 10: mixed; material friction or ambiguity affects part of the workflow.
- 5: weak; substantial defects undermine most of the criterion.
- 0: fails the criterion; evidence shows it is unusable or contradicts its purpose.

Explain each rating with a concise file/line reference or local evidence. Tie
deductions to finding identifiers. Missing optional complexity is not a defect:
do not deduct for a skill lacking scripts, references, or extra sections it does
not need. Avoid counting the same problem under multiple criteria unless it has
distinct effects that you explain.

Use Unverified when no defensible criterion rating is supported; exclude its 20
points from the assessed maximum. A confirmed defect must retain its justified
deduction even when other claims are unresolved: rate from the known evidence,
mark the rating and total provisional if the unknowns could change it, and list
the gap. Never turn a known failing criterion into Unverified to raise the score.
Use N/A only when the entire criterion has no meaningful application, with a
reason; exclude it from both assessed and applicable maxima. Neither status earns
full marks or zero marks. Do not penalize uncertainty itself.

## Calculate and interpret

For each file:

    Quality % = 100 × points earned / assessed maximum
    Evidence coverage % = 100 × assessed maximum / applicable maximum

Compute with unrounded values and display whole percentages, rounding .5 upward.
With fewer than
three assessed criteria, report Insufficient evidence instead of a quality
percentage. If any criterion is provisional or Unverified, mark the score provisional.
If there are no applicable criteria, report N/A; never divide by zero.

| Quality | Assessment |
|---|---|
| 90–100% | Strong |
| 75–89% | Good |
| 50–74% | Needs improvement |
| 0–49% | Poor |

Use the displayed whole percentage to choose the band. Append provisional when
applicable. A high score never clears a confirmed blocking issue, such as an
instruction authorizing destructive actions outside the user's scope. Show such
findings prominently beside the score; do not let an average conceal them.

Example: ratings of 15, 10, 15, Unverified, and 20 earn 60 of 80 assessed points:
75% Good (provisional), with 80% evidence coverage. Report the unknown accuracy
criterion and its missing evidence; do not turn it into a failed or passed check.

If four criteria earn 20 each and a known broken workflow earns 5, the result is
85/100 = 85%, even if another claim under that last criterion remains unresolved.
Show it as provisional; dropping the 5/20 criterion to report 100% is incorrect.
Coverage counts rated criteria, not every factual claim, so a 100%-coverage result
can still be provisional. Name unresolved evidence alongside it.

## Show individual and project results

Treat a skill and its directly relevant resources as one unit. Score each root
or nested AGENTS.md separately. Count canonical files once; generated mirrors and
installed duplicates do not inflate the averages. Attribute mirror drift to the
owning unit's consistency finding.

For one unit, report its score once; do not repeat it as group and project averages.
For multiple units, lead with the applicable group(s) and reviewed-scope average.
Each is the arithmetic
mean of the unrounded scores of its scored units. Show scored/total canonical
unit counts; label the overview partial or provisional if units are excluded or
any contributing score is provisional. If no units can be scored, show N/A with
the reason. For each group, evidence coverage is its total assessed maximum
divided by total applicable maximum, including unscored units; show N/A when the
denominator is zero. A scoped audit describes only the reviewed scope, not the
entire project. Always surface blocking findings even from unscored units.
An unread in-scope unit contributes zero assessed and 100 applicable points to
coverage until inspected; do not infer N/A criteria from its name or description.

Use a compact overview table: File | Quality | Assessment | Evidence coverage.
Follow it with criterion breakdowns using the same five columns in rubric order.
Explain deductions and unknowns by finding ID; group shared evidence for full-mark
ratings rather than repeating identical prose. State skipped or
unread files separately; do not score a skill from its description alone.

After edits, reassess changed units against their actual final contents and show
Before | After | Change in percentage points. Carry forward unchanged units only
if their files and relevant evidence stayed unchanged. Use the same scope and
criteria; if evidence coverage or applicability changed, disclose that and avoid
claiming a directly comparable gain. Do not forecast an achieved score for an
unapplied proposal or treat a higher score as proof of better agent performance.
