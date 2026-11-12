# LiveCode for Math Lab

LiveCode is a VS Code extension and Python command-line bridge for opening, inspecting, arranging, highlighting, editing, and running notebook cells. An assistant with local command access can use it to work through proofs and computations alongside a learner.

## Source

This folder contains the runtime and packaging source from `SamiAzim/LiveCode`, commit `53455ca6371571e23f0d5e9b9303f0f7ddc43ad1` (version 0.1.0). It is a snapshot of the committed GitHub version, not the newer local development copy. Original runtime files are unchanged. Historical discussion/specification notes and unrelated demo files are omitted. No license has been added.

## Local setup

Prerequisites: VS Code, Python 3, and `bash`/`zip` for packaging. Python notebooks also need the VS Code Python/Jupyter extensions and an appropriate kernel with `ipykernel` installed.

From the Math Lab repository root:

```sh
bash tools/livecode/build.sh
code --install-extension tools/livecode/livecode-0.1.0.vsix
python3 tools/livecode/cli/livecode.py --help
python3 tools/livecode/cli/livecode.py see --json
```

Restart or reload VS Code after installation if required. Use the window name returned by `see` with `--window NAME` when multiple windows are open. Read open notebook contents through the bridge before editing; do not overwrite an open notebook file directly on disk.

The CLI and extension exchange local JSON files under `~/.livecode`; they need access to the same machine/account filesystem. Downloading this code in a cloud session does **not** connect that session to a VS Code instance on another computer. Cloud sessions can inspect or develop this source without controlling the local editor.
