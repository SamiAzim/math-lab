# Math Lab: session handoff

This repository is the shared home for our mathematical education and exploratory work. Before tutoring, read this file, the [tutor working profile](.tutor/learner-profile.md), the [learner map and intuition notes](LEARNING.md), the curriculum, and the research notebook. The learner requested that the tutor profile travel with the repository so this context can be used across accounts; the learner does not need to read it.

## Learner and purpose

- Background: computer science/data science; probability and statistics; engineering calculus sequence; basic differential equations and linear algebra; an introductory abstract algebra course. Burnside's lemma was particularly enjoyable.
- Commitment: approximately 20 hours per week.
- Motivation: love of mathematics and a desire for fluency beyond a perceived plateau in computational biology research.
- Goal: a broad, rigorous undergraduate mathematics education, with independent proof writing and construction of mathematical objects. Research interests guide the path without replacing the foundations.
- Interests: low-dimensional topology, geometry, local-to-global constructions, dynamics, elliptic curves, and eventually PDEs.

## Teaching approach

Use definitions, examples, counterexamples, constructions, and proofs. Let the learner attempt problems before supplying solutions. Offer graduated hints and critique reasoning precisely. Use computation and interactive diagrams to support understanding, alongside independent assessments.

Work one small concept or notebook cell at a time. Explain the relevant library calls without assuming the learner needs elementary Python instruction. Read the current learner work before commenting or changing it; preserve exploratory versions. The learner has custom keybindings, so do not assume default shortcuts.

Maintain the overall learning trajectory across exchanges. The learner uses informal words to communicate visual intuition; preserve the intended behavior and check an interpretation before launching a lesson based on a technical label. Distinguish brainstorming from an exercise attempt. Use brief checkpoints at topic changes to connect current work, prior reasoning, and its curricular purpose. Record the learner's reasoning and tutor-supplied steps separately in the learner map and daily log.

Keep the motivating question alive without repeatedly substituting physical simulation or statistical analysis for the learner's intended mathematical investigation. Do not dismiss visual intuition, and do not promote it to an established connection without proof. Help find meaningful definitions under which its insight might become a theorem.

## Resume the class

Open the [course bookmark](curriculum/bookmark.md) and the prepared lesson it names. The bookmark holds the live question across sessions. The notes below give the background to this course.

## Current state

As of November 20, 2026, the learner has built a first NumPy/Plotly exploration of sampled circles and a deformed 3D curve with vertical oscillations and color indicating sample order. Treat this as an informal starting assessment of mathematical construction and experimentation.

The three original placement problems have now been worked through in dialogue. The learner produced the collision argument for injectivity of f, identified the role of the image of f, and gave the core subtraction argument for the union-of-subspaces problem after a witness-selection hint. For periodic motion, the learner derived rationality as a necessary condition with guidance and recognized the LCM connection; the tutor supplied the general converse. Independent retention and broader proficiency remain to be assessed. See the [learner map](LEARNING.md) for the current checkpoint.

The notebook is an early expression of the motivating idea. The learner's goal is undergraduate mathematics, with the geometry serving as a continuing source of questions. A literal blender simulation is not the intended project. The latest curriculum proposal remains proofs plus rigorous linear algebra, with a geometry thread about periodic motion and tori; its pace and entry point are provisional.

The notebook contains unfinished scratch work and an evolving phase-based construction; inspect its current live state before interpreting it. A torus-based modification was discussed by the tutor. Do not report that proposal or a partial-derivative lesson as completed learner work. Requests for new starting exercises and for a discussion of programming-based mathematical learning are separate and remain open.

The learner has reaffirmed the standing brief and is ready to resume: broad undergraduate coverage, reconstruction of unevenly retained foundations, and the motivating questions maintained together. Goode and Annin is a confirmed source and prior-exposure marker, not a mastered baseline or the whole curriculum. Keep substantive theorem goals visible while teaching prerequisites one move at a time. Use the course bookmark for the next teaching move.

- [Learner map and intuition notes](LEARNING.md)
- [Current exploration notebook](notebooks/001-3d-functions.ipynb)
- [Daily learning log](journal/README.md)
- [Curriculum and first month](curriculum/roadmap.md)
- [Initial diagnostic](exercises/001-starting-problems.md)
- [Motivating question and images](research/emergent-winding.md)
- [Image sources and provenance](assets/images/README.md)
- [LiveCode setup](tools/livecode/README.md)

## Working between sessions

The local clone was reported at ~/Developer/math-lab. Pull current main before editing. Inspect existing work and avoid overwriting learner attempts. LiveCode 0.1.0 is already included; use its bridge to inspect an open notebook before editing it. Its current bridge requires shared local filesystem access.

Save lessons, attempts, feedback, and revised conjectures here as work develops. Distinguish proposals, observations, conjectures, and proved results. This handoff summarizes the substantive learning discussion rather than reproducing account-access troubleshooting.
