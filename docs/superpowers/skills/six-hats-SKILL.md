---
name: six-hats
description: "Use to stress-test design decisions and reach firm conclusions using De Bono's Six Thinking Hats. Run before committing to major architectural, product, or strategic decisions. Surfaces risks, alternatives, and blind spots that single-perspective thinking misses."
---

# Six Thinking Hats

A structured framework for examining decisions from six distinct perspectives before committing to a direction. Each hat forces a different mode of thinking — preventing the most common failure mode in design: everyone thinking the same way at the same time.

## When to Use

- Before locking in a major architectural decision
- When a design choice feels obvious (that's when blind spots are biggest)
- When stakeholders disagree and you need to surface all perspectives
- As a precursor to the brainstorming skill when the question space needs clearing first
- When a previous decision needs to be revisited or challenged

## The Six Hats

| Hat | Mode | The Question |
|---|---|---|
| ⬜ **White** | Facts & Data | What do we know? What are we missing? |
| ❤️ **Red** | Emotion & Intuition | What does your gut say? No justification needed. |
| 🖤 **Black** | Caution & Risk | What could go wrong? What are we assuming? |
| 💛 **Yellow** | Optimism & Value | What's the best case? Why will this work? |
| 💚 **Green** | Creativity & Alternatives | What else could we do? What haven't we considered? |
| 🔵 **Blue** | Process & Synthesis | Are we asking the right question? What have we decided? |

---

## Process

### Default Mode: Batch Analysis

Run all six hats at once, then discuss. Best for decisions where context is clear and the goal is to stress-test a direction quickly.

**Steps:**
1. Read the topic and any provided context
2. Explore the project state (files, recent decisions, constraints)
3. Present all six hats as a structured analysis — each hat gets its own section
4. Ask the user which hats they want to push back on or explore further
5. Synthesize firm decisions from the discussion
6. Save decisions to a doc if the outcome warrants it

### Interactive Mode: Hat by Hat

Use when the question is complex, stakes are high, or the user explicitly asks for it. Present one hat at a time and wait for a response before moving to the next.

---

## How to Run Each Hat

### ⬜ White Hat — Facts & Data

State only what is known. No opinions, no interpretations.

- What is the current state of the codebase / product / situation?
- What constraints are fixed (tech stack, user capabilities, timeline, budget)?
- What decisions have already been made that this must work within?
- What do we NOT know that we'd need to find out?
- What data or evidence is relevant to this decision?

**Tone:** Neutral. Clinical. "We know X. We don't yet know Y."

---

### ❤️ Red Hat — Emotion & Intuition

Gut reactions only. No justification required or expected — that's the point. The red hat gives intuition a legitimate seat at the table so it doesn't leak into other hats uninvited.

- What does this feel like? Exciting? Risky? Wrong? Elegant?
- What would a user feel using this?
- What does the team's energy say about this direction?
- What are you excited about? What makes you uneasy?

**Tone:** Raw, honest, brief. "This feels over-engineered." "I love this idea." "Something about this bothers me but I can't articulate it yet."

---

### 🖤 Black Hat — Caution & Risk

Devil's advocate. This is the most valuable hat and the most often skipped. The goal is NOT to kill the idea — it's to find the real risks so they can be mitigated.

- What could go wrong technically?
- What assumptions are we making that might be false?
- What happens if a user does something unexpected?
- What's the maintenance burden 6 months from now?
- Where could this break under load, edge cases, or changing requirements?
- What does this prevent us from doing in the future?
- Where are we being overconfident?

**Tone:** Forensic. "This fails when..." "We're assuming X, but..." "The hidden cost of this is..."

---

### 💛 Yellow Hat — Optimism & Value

Genuine optimism, not cheerleading. Articulate the actual value and the best realistic case.

- What specific value does this deliver to users?
- Why is this the right approach for this context?
- What technical advantages does this have over alternatives?
- What does success look like concretely?
- How does this compound positively over time?
- Why will this work?

**Tone:** Grounded. "This works because..." "The specific value is..." "In 12 months this pays off by..."

---

### 💚 Green Hat — Creativity & Alternatives

Lateral thinking. The goal is to generate options that haven't been considered, not to defend the current direction.

- What completely different approaches exist?
- What if we removed a constraint we've been treating as fixed?
- What's the simplest possible version of this?
- What would we do if the current approach were impossible?
- What could we borrow from adjacent domains?
- What's the contrarian take?

**Tone:** Generative. "What if instead..." "We haven't considered..." "The simplest version would be..."

---

### 🔵 Blue Hat — Process & Synthesis

Step back from the content and look at the thinking itself. The blue hat manages the session and makes decisions.

- Is the question framed correctly, or are we solving the wrong problem?
- What have the other hats revealed that changes our thinking?
- What tensions exist between the hats, and how do we resolve them?
- What firm decisions can we make right now?
- What questions remain open and need more information?
- What is the recommended direction, and why?

**Tone:** Decisive. "The question we're actually answering is..." "Given the above, the decision is..." "The remaining open question is..."

---

## Output Format

After running all six hats, synthesize into:

```
## Decisions Made
- [Firm decision 1 — one sentence, unambiguous]
- [Firm decision 2]
...

## Open Questions
- [Question that needs more data or a separate decision]
...

## Recommendation
[One clear paragraph: what to do, why, and what it rules out]
```

---

## Saving Decisions

When the session produces decisions that affect project direction, save them:

- **For architectural decisions:** Add to the project's decisions doc or the relevant spec file
- **For a new sub-project:** Feed into the brainstorming skill to spec it out
- **For process decisions:** Update `CLAUDE.md` or the relevant memory file

Do NOT save every session — only when firm decisions are made that future sessions need to know about.

---

## Anti-Patterns

**Skipping Black Hat because the idea feels good.** The better an idea feels, the more important the black hat is. Enthusiasm is the enemy of risk identification.

**Using Red Hat to justify a position.** Red hat is for raw gut reaction, not advocacy. If you're explaining why you feel something, you've left red hat territory.

**Green Hat that's just "what if we did it slightly differently."** Green hat means genuinely different approaches — not variations on the current direction.

**Blue Hat that restates the problem instead of making decisions.** Blue hat must produce outputs: decisions, open questions, a recommendation. It's not a summary hat — it's a synthesis hat.

**Running Six Hats after the decision is already made.** Six Hats is a decision-making tool, not a post-hoc justification tool. If you're running it to confirm what you've already decided, you're wasting everyone's time.

---

## Integration with Other Skills

**Before brainstorming:** Use Six Hats to clarify the question and surface constraints before diving into design. Especially useful when the problem space feels unclear.

**During brainstorming:** When stuck between two approaches, run a focused Six Hats on just that decision. Green hat generates options; black hat stress-tests them; blue hat decides.

**After implementation:** Black hat retrospective — what risks materialized, what didn't, what was missed?
