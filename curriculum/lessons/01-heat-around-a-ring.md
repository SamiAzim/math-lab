# Heat around a ring

## The historical question

If we know how hot each part of a ring is now, can we predict the temperatures later? In 1822 Fourier considered a solid ring with heat moving along its length and escaping through its surface. In articles 238–239 he sets aside surface loss and looks for a temperature pattern whose proportions persist while its amplitude changes. Later in the same chapter he investigates heat exchange between separate bodies. This gives us a genuine reason to study both functions and linear algebra. [Fourier, chapter IV, especially articles 238–239 and 247](https://fr.wikisource.org/wiki/Th%C3%A9orie_analytique_de_la_chaleur/Chapitre_4)

Our classroom model has four equal pieces, perfect insulation from the room and a clock that advances in steps. The update below is our choice. A continuous rod, a real metal ring and the four-piece calculation have different assumptions. The learner's winding notebook shares the circular arrangement and the question of what repeats. A time-evolving temperature on a ring and a point moving around a torus are different objects.

## Lesson 1 · What would you measure?

Opening passage for the tutor, one turn at a time, in response to the learner's question:

> Picture four marks on a metal ring and a thermometer at each mark. You warm the metal at A, remove the heater, and write down all four readings at the same instant. Tomorrow I hand you those numbers on four loose slips of paper. What would I need to write on the slips so you could put the heat back where it was?

```text
           A
         /   \
        D     B
         \   /
           C
```

Each line joins neighbors. Ask for a sketch, a prediction or a sentence. If the learner already attaches positions to measurements, use their description immediately. If they mention time, agree and fix the instant together. If they want to talk about the far side, identify which sites C touches and what information each has in one update. If they want to know which shapes last, start with four equal readings and ask what could make one of them change. Either route returns to specifying a whole state.

Next passage once the picture makes sense:

> Let's put the slips in clockwise order, starting at A. Then (8, 0, 0, 0) tells us where the warm piece is, while (0, 0, 8, 0) puts it across the ring. Both have the same average. So a single temperature for the whole ring loses exactly the information our question depends on.

Use temperatures above a reference level throughout. Introduce “state” as the ordered readings, then “function” as assigning a reading to each labeled site. Offer a short separate coding construction only if wanted. Given a list in clockwise order, return C's two neighbors, including what happens when the selected site is A. Return to what one local exchange could do to these four readings.

## Lesson 2 · Can the readings change while their sum stays fixed?

Show one local rule. During a tick each piece keeps half its reading and contributes a quarter to each neighbor. Every new reading uses the same old snapshot. For the warm spot above, A keeps 4, B and D each receive 2, and C receives 0. Let the learner predict when C first warms before revealing another frame. [Step-through diagram](../diagrams/four-point-ring.html)

The first proof question is whether the sum stays fixed for *any* four starting readings. Track one old reading a through the new sum. It appears with weights 1/2, 1/4 and 1/4, which add to one. The same count works for each of the other readings, so the total and the mean are preserved. Ask for just the move the learner can supply and record who supplied the rest.

If “total temperature” sounds physically odd, distinguish temperatures from thermal energy. With equal fixed heat capacities the sum of temperature offsets is proportional to energy relative to the reference. Conservation here is an exact property of the update. A delayed pen-and-paper check varies the shares to 1/2 retained, 1/3 clockwise and 1/6 counterclockwise. Ask what survives when left and right symmetry disappears.

## Lesson 3 · Which shapes survive a step?

Use signed departures from a uniform background, so −1 means one degree below that background. Try (1, 0, −1, 0). One tick gives (1/2, 0, −1/2, 0). Let the learner say what stayed recognizable before introducing the name. A nonzero vector v with Av = λv is an eigenvector of the linear map A. Here λ = 1/2, and A is the one-tick rule.

Why is A linear? Each new reading is a weighted sum of old readings with fixed coefficients. Adding two patterns before the tick gives the same result as adding their updated readings, and scaling a pattern scales every output by the same factor. Show one position in detail before using that fact for the other three.

Give the fixed pattern (1, 1, 1, 1) and the alternating pattern (1, −1, 1, −1) to compare. Their multipliers are 1 and 0. A second independent half-speed pattern is (0, 1, 0, −1). Ask the learner to predict ten ticks on one pattern, then vary its orientation or add a constant. The larger question is whether *every* starting state can be assembled from patterns with known futures.

Later proof destination: the four displayed vectors are nonzero and pairwise orthogonal, so they form a basis of four-dimensional real space. Establish inner product, independence, dimension and basis before relying on that argument. With a basis, linearity gives the future of any initial state, including convergence to its original mean. Distinct-eigenvalue independence alone does not settle the two vectors that share 1/2. Goode and Annin, chapters 4–7, supply the language and theorems behind this argument.

## Where this story opens out

A ring can carry many more than four readings. When position varies continuously, a temperature field depends on both position and time. This provides the occasion for the pending partial-derivative lesson: what could you change while keeping the thermometer in one place? The analogy suggests a heat equation. Deriving a continuum limit needs its own hypotheses and estimates. Fourier's continuous result is a later destination.

Return independently to the learner's two-angle construction when periodicity enters the curriculum. Ask which *input* must change by one period and which *output* must agree. Use their earlier rational-return argument as guided prior work and give a fresh case when checking retention.
