# Provisional curriculum

## Current route through the foundations

Updated November 20, 2026 after the first three guided problems. The learner wants problems with an outcome worth investigating before committing to written work. Use a substantive question to introduce each unit, then teach the definitions and methods needed to resolve it. This remains a broad undergraduate education; the winding notebook is one motivating thread.

The standing plan holds three layers together: the full undergraduate curriculum, reconstruction from the learner's actual retained knowledge, and the motivating winding/dynamics/topology/blender questions. The learner's prior coursework through Goode and Annin does not imply mastery; multivariable calculus also needs review. Use substantial theorems as visible destinations and introduce definitions, notation, worked examples, and proof moves in small steps. Shared foundations and ambitious goals belong in the same course.

Goode and Annin's Differential Equations and Linear Algebra, 4th edition, is a confirmed existing source. Its eigenvector-independence theorem (7.2.5), diagonalization, and matrix exponentials offer meaningful destinations for a linear algebra strand. Develop that strand alongside the broader dependency guide below. The learner is ready to resume after alignment; begin with one needed concept rather than another curriculum redesign.

| Unit | Questions to investigate | Mathematics to build |
| --- | --- | --- |
| Linear algebra through transformations | Can two mirror reflections produce a quarter-turn of every point? Can different transformations have the same effect? What happens when a matrix acts repeatedly on a drawing? | Vectors, linear maps, bases and coordinates, matrices and composition, kernel and image, eigenvalues and eigenvectors. |
| Rigorous calculus and motion | What does it mean to move in a tangent direction? When does a prescribed velocity determine a path? How can a rule constrain motion to a curve or surface? | Limits and justification, derivatives of parametrized curves, multivariable derivatives, vector fields, introductory ODEs. Introduce analytic prerequisites explicitly. |
| Algebra, symmetry, and periodicity | Which operations preserve an object? When do repeated operations return to the identity? How many distinct patterns remain after identifying rotations? | Groups and actions, modular arithmetic, orbit and stabilizer ideas, counting with symmetry. |
| Topology and geometry | What happens when opposite edges of a square are identified? How do two angular positions specify a point on a torus? Which paths close? | Equivalence relations, quotient constructions, continuity and topology, torus parametrizations and winding. |

These units overlap and may be revisited. They are not a claim that all linear algebra must be completed before starting analysis, or that one project replaces subject breadth. The longer dependency guide below retains the full undergraduate scope.

The early linear algebra topics are consistent with the [MIT 18.06 syllabus](https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/pages/syllabus/), which includes transformations, spaces, eigenvalues, and applications. The problem selection and order here are a tutor proposal tailored to the learner, rather than that course's sequence.

## Suggested first problem

Can you produce a 90-degree counterclockwise rotation about the origin by composing two mirror reflections across lines through the origin? Choose one fixed pair of mirror lines that must work for every point in the plane. State the order of the reflections and eventually justify why it works for all points.

This candidate is deferred: reflection was not shared vocabulary when it was proposed. Establish the required language, notation, examples, and basic operations before assigning it. It has not been attempted or accepted as the next assignment. A drawing or small code experiment can establish a conjecture; written work should explain a result or resolve a genuine uncertainty. No solution or mirror-line choice is supplied here.

## How lessons should work

Begin with a clear problem and its purpose, let the learner explore and describe a conjecture, introduce a needed concept, and help them justify the conclusion. Follow with a variation to check transfer and retention. Use concise verbal arguments where adequate; request written work when tracking several steps or proving a general claim makes it useful. Keep technical drills short and explain the skill they are building.

Offer programming as a tool for constructions, experiments, and falsifying guesses. Keep numerical evidence distinct from universal proof. The separate request for a learning method with a Lean-like constructive and checkable feel remains open; this roadmap does not select a proof system or turn every exercise into a programming task.

## Initial resource allocation: 20 hours/week

| Strand | Hours | Starting material |
| --- | ---: | --- |
| Proof techniques | 7 | Richard Hammack, Book of Proof: logic, sets, functions, direct proof, contraposition, contradiction, induction |
| Rigorous linear algebra | 9 | Sheldon Axler, Linear Algebra Done Right: vector spaces, subspaces, linear maps |
| Geometry notebook | 4 | Circles, rotations, periodic motion, quotient constructions, identifying opposite sides of a square |

These were starting resources and an approximate time split proposed in the initial planning conversation. They remain optional reference material, not fixed reading assignments or a commitment to four calendar weeks. Select exact sections after reviewing work; use the current route above to choose the next lesson. Develop real analysis alongside proof fluency and linear algebra.

Weekly rhythm: short reading or lesson; independent attempts; hints and proof critique; revision; mixed retrieval problems and periodic work without AI assistance.

## First geometry project

Construct T² = R²/Z² and study t ↦ (at,bt) modulo Z². Define return, periodicity, and winding carefully. Prove the closed-orbit criterion before moving toward irrational directions and density. Later connect real quotient tori to complex tori C/Λ.

## Broad undergraduate foundation

The order is adjustable; this is a dependency guide, not a promise of a fixed completion date.

1. Proofs, sets, functions, countability, induction; rigorous linear algebra.
2. Real analysis; groups and group actions; discrete mathematics and number theory.
3. Multivariable analysis; point-set topology; rigorous ODEs and dynamical systems; rings and fields.
4. Complex analysis; smooth manifolds; differential geometry; algebraic topology and covering spaces.
5. Measure/integration and rigorous probability; functional analysis; numerical analysis and optimization as breadth subjects.
6. Differential topology, Morse theory, surfaces and selected low-dimensional topology; Riemann surfaces and elliptic curves.
7. PDE foundations, variational methods, geometric analysis, Hamiltonian dynamics, and selected integrable systems.

Analysis should develop alongside geometry so PDEs can eventually arise naturally from geometric constructions and dynamics. Maintain breadth rather than skipping directly to specialized research.

An earlier rough estimate was two to three years at this pace; treat it as provisional. Depth, retained knowledge, and exercise performance determine the actual timeline.

## Milestones

- Write and revise complete elementary proofs.
- Prove basic structural linear algebra results.
- Handle convergence, continuity, and compactness rigorously.
- Construct quotient spaces and work with maps between them.
- Explain what extra structure distinguishes a complex torus from a topological torus.
- Reconstruct the paper's Hopf-torus construction with explicit hypotheses.
- Formulate and prove a modest statement about a chosen abstract dynamical construction.

The first three placement problems have been worked through with guidance. No full subject milestone has yet been independently assessed as complete. See the [learner map](../LEARNING.md) for the actual evidence and current checkpoint.
