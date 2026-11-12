// LiveCode: Claude shows, arranges, colours, edits and explains code on Sami's screen while the conversation stays in
// chat. This file only wires the pieces together; each piece is one small module with one topic:
//
//   bridge.js     the file inbox/outbox protocol and which window answers a request
//   see.js        what is on screen: windows, areas, tabs, visible lines, cursor, selection, unsaved text
//   layout.js     split, close, focus, move tabs, saved setups
//   files.js      open, close, scroll
//   colour.js     coloured spans as a viewing layer (never written into the file)
//   edit.js       edits typed live or landed whole, saving
//   notebook.js   cells and kernels (from Live Cell 0.0.5)
//   review.js     review mode: the real file beside the code down to one line and its explanation
//
// Every module exports `ops`: {name: async (req, ctx) => answer}. A request is one JSON file whose "op" names the
// operation; the answer is {"ok": true, ...} or {"ok": false, "error": "..."}. See SPEC.md for the design.
const vscode = require("vscode");
const bridge = require("./bridge");

const MODULES = ["see", "layout", "files", "colour", "edit", "notebook"];   // review.js joins when built
const VERSION = require("./package.json").version;

function activate(context) {
  const ctx = { context, version: VERSION, log: vscode.window.createOutputChannel("LiveCode") };
  const ops = {};
  for (const name of MODULES) {
    const mod = require(`./${name}`);
    if (mod.activate) mod.activate(ctx);                // modules that watch editor events register them here
    for (const [op, fn] of Object.entries(mod.ops || {})) ops[op] = fn;
  }
  bridge.start(ctx, ops);
  context.subscriptions.push({ dispose: () => bridge.stop() });
  context.subscriptions.push(vscode.commands.registerCommand("livecode.status", () =>
    vscode.window.showInformationMessage(`LiveCode ${VERSION}: ${bridge.status()}`)));
  ctx.log.appendLine(`LiveCode ${VERSION} ready; ops: ${Object.keys(ops).sort().join(", ")}`);
}

function deactivate() { bridge.stop(); }

module.exports = { activate, deactivate };
