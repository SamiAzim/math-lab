# Learner map and intuition notes

Updated November 20, 2026. Read this with [START-HERE](START-HERE.md) before tutoring. This is the shared place for the learner's intentions, current understanding, and teaching continuity. The [daily log](journal/README.md) records the history; this file records the current picture.

[AGENTS.md](AGENTS.md) directs repository tutoring sessions to read this context and maintain the teaching approach.

## Purpose

Build a broad, rigorous undergraduate mathematics education. The [blender and winding question](research/emergent-winding.md) is a continuing motivation. The first notebook is an early attempt to express that intuition and evidence about the learner's starting point. Keep foundations and motivating questions connected while maintaining the broader curriculum.

## The learner's words

> I am no longer able to chain together basic logical building blocks to build the idea I have in my head visually of like this kind of function that goes around a torus, that winds around a torus kind of.

> I don't know the name of it mathematically. ... And so I just use what's in my head. And I use the wrong name. And then you think I'm talking about that thing.

> When I built this notebook originally, I really tried to set out to write a partial differential equation that returns a function that effectively gives that like winding where one period goes back to where it starts. And it goes like up and down around the torus n times for that many lobes.

These describe the learner's intention and experience. In particular, “partial differential equation” is a tentative label for the desired construction, not evidence that a PDE has been specified. Preserve the intended behavior before deciding which mathematical object or vocabulary fits it.

## Current interpretation to check together

The learner wants to construct a winding path that returns to its starting point and has a controllable up/down pattern, as a toy expression of the larger visual intuition. Two coordinated angular motions are a plausible starting model. This is a tutor interpretation to refine together; the notebook's curve has not been established to lie on a standard torus or explain blender flow.

## Evidence from the first exercises

| Topic | What happened | Follow-up to support learning |
| --- | --- | --- |
| Functions and injectivity | After terminology clarification and hints, the learner gave the collision/contradiction argument for injectivity of f and identified the restriction of g to the image of f. | Revisit domain, codomain, and image in context; let concise valid reasoning count. |
| Union of subspaces | Given witnesses to failure of containment, the learner used subtraction to rule out membership of their sum in either subspace. The tutor supplied the easy containment direction. | Reuse the witness-and-contradiction move in a later problem. |
| Common return times | With guidance, the learner derived the necessary rationality condition and recognized the LCM connection. The tutor supplied the general converse construction. | Consolidate necessary versus sufficient conditions and connect symbols to the question they answer. |

The three problems have been worked through in dialogue. Independent retention has not been checked. These observations do not establish a global year level or a general inability to reason.

## Teaching continuity

- Maintain a class-level perspective: current foundation, reason for studying it, connection to earlier work, and the next small step. State this briefly when changing direction; do not turn every response into a progress report.
- Distinguish brainstorming, a request for terminology, and an exercise attempt. During brainstorming, collect the intended behavior before treating a word such as “tangent,” “eigenvalue,” or “PDE” as a settled mathematical claim.
- Use short exchanges. Offer one idea or question, wait for reasoning, and respond to it. Avoid unsolicited lectures, complete code rewrites, or extra problems introduced during a request to step back.
- The learner explicitly wants frequent definition reminders, resets from a shared starting point, and one reasoning move at a time. Establish vocabulary, notation, and worked examples before a problem relies on them. Treat these as normal lesson design.
- Choose problems with an interesting question or construction before asking for written work. The learner finds routine definition-checking alone insufficient motivation for pen and paper. Explain what a proof move or technical drill is for; a short verbal argument can be sufficient.
- When a step is unclear, locate the missing link: notation, meaning of the task, logical implication, geometric interpretation, or calculation. Do not infer a general skill deficit from one confusing exchange.
- Keep verbal or computational evidence separate from a proof and distinguish learner arguments from tutor-supplied steps. Explain why a requested proof step matters rather than demanding algebraic ceremony.
- Preserve the notebook. Inspect its live state before editing and make requested changes one cell at a time. The learner has custom keybindings.

## Current checkpoint

The first three exercises were a broad starting assessment, not a prerequisite chain to the notebook. The periodic-motion problem connected directly to the winding motivation; the functions and subspaces problems sampled general foundations.

The learner has requested a clearer roadmap and more engaging problems. The revised [roadmap](curriculum/roadmap.md) proposes beginning with linear algebra through geometric transformations, then developing analysis and motion, symmetry and algebra, and topology and geometry alongside broader foundations. The proposed two-reflection construction relied on an operation that had not been introduced and is deferred. The learner wants a shared introductory foundation before problems rely on its terminology.

The current activity is designing a continuing teaching strategy aligned with canonical undergraduate mathematics. The proposed approach uses external course standards, explicit instruction followed by gradually reduced support, delayed independent checks, and a maintained learner record. No new exercise is currently assigned. At the learner's explicit request, tutor-facing working notes are versioned with the repository for use across accounts; the learner does not need to read or manage them. AGENTS.md directs assistants to consult the profile.

The undergraduate route remains provisional. [Proofs and rigorous linear algebra](curriculum/roadmap.md) are the foundations strand; the notebook can provide examples for functions, parametrization, periodicity, and later derivatives and dynamics. Requests for fresh mathematics exercises and for a separate programming-based learning approach remain distinct. A partial-derivative explanation is still pending.

Add new learner descriptions to this shared note and update the checkpoint as understanding changes. Revise tutor interpretations when corrected, and record substantive lesson evidence in the daily log.
