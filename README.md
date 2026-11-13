# Math Lab

**[Start here: session handoff, curriculum, and initial exercises](START-HERE.md)**

An AI-assisted, proof-focused undergraduate mathematics education, pursued at roughly **20 hours per week**. The aim is broad, rigorous foundations, with careful definitions, independently worked proofs, exercises, and computational experiments that support mathematical understanding.

## Current work

The first exploration is an informal starting assessment: constructing and coloring sampled 3D curves with NumPy and Plotly. It records an early attempt to express ordered winding and vertical oscillation. The undergraduate curriculum remains the larger goal; the motivating geometry gives us examples to understand and justify as foundations develop.

- [First exploration notebook](notebooks/001-3d-functions.ipynb): the learner's current construction, saved outputs, and unfinished scratch work.
- [Daily learning log](journal/README.md): session history, observations, mathematical distinctions, and open questions.
- [Latest entry: November 12, 2026](journal/2026-11-12.md).
- [Provisional curriculum](curriculum/roadmap.md) and [original placement exercises](exercises/001-starting-problems.md). Those formal exercises remain unattempted.

The notebook is a work in progress. It contains an unfinished `dfdx =` cell and later scratch work that depends on earlier kernel state, so it is not currently a clean “Run All” notebook. Saved outputs are preserved as part of the exploration. Use VS Code or Jupyter to interact with the Plotly figures.

## Open the notebook locally

Create a local Python environment and install the notebook dependencies from the repository root:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
```

Open the notebook in VS Code with the Python and Jupyter extensions, choose the repository's `.venv` as its kernel, and run individual cells. The cell's run button works independently of custom keyboard shortcuts. The local environment and notebook checkpoints are excluded from Git.

## Starting point and direction

The starting background is computer science and data science, engineering calculus, basic differential equations and linear algebra, probability and statistics, and introductory abstract algebra. The long-term direction includes geometry, topology, complex analysis, elliptic curves, dynamics, and partial differential equations.

## Motivating research question

How can abstract local interactions and forcing generate organized winding or lobed geometry? Blender flow and the Hopf-torus embeddings in Hajouji and Trettel’s *Elliptic Curves and the Hopf Fibration* motivate this question. Any connection between these settings is a hypothesis to investigate—not an established fact.

AI will support explanation, proof critique, and exploration; mathematical claims should be checked through explicit reasoning and reliable sources.

## Notebook collaboration

[LiveCode source and local setup](tools/livecode/README.md) are included for interactive VS Code notebook work. The bridge requires a shared local filesystem; repository access alone does not give a cloud assistant control of a local editor.
