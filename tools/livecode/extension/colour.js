// colour.js: coloured spans on code, as a viewing layer. Nothing is written into the file; the colours have no
// built-in meaning (what a colour means is said in chat, per request).
//
//   {"op": "colour", "file": p, "lines": [[10, 14], [40, 40]]}                 whole lines
//   {"op": "colour", "file": p, "spans": [[12, 5, 18]]}                        line, from column, to column
//   {"op": "colour", "file": p, "pattern": "F\\.interpolate|bilinear"}         every match of a regex
//   {"op": "colour", "notebook": p, "cell_id": "fig1", "lines": [[1, 3]]}      inside one notebook cell
//     options: "colour": "yellow" | "green" | "red" | "blue" | "orange" | "purple" | "grey" | any CSS colour
//              "layer": "main"   several layers can be on at once; colouring a layer again replaces it,
//                                "add": true adds to it instead
//   {"op": "clear", "file": p, "layer": "main"}     one layer of one file; without "layer" every layer of that
//                                                   file; without "file" everything in this window
// Colours stay while the file is scrolled or edited; when its tab is hidden and shown again they are put back
// at the lines they were given (an edit above them in between shifts the text, not the colours).
const vscode = require("vscode");
const path = require("path");

const NAMED = { yellow: "rgba(255, 220, 0, 0.30)", green: "rgba(80, 220, 100, 0.30)", red: "rgba(255, 80, 80, 0.30)",
                blue: "rgba(80, 160, 255, 0.30)", orange: "rgba(255, 160, 40, 0.35)", purple: "rgba(190, 110, 255, 0.30)",
                grey: "rgba(150, 150, 150, 0.30)" };
const types = new Map();                               // layer + colour + whole-line? -> decoration type (one per layer, so layers never overwrite each other)
const layers = new Map();                              // document key -> layer name -> {type, ranges, colour}
const painted = new WeakSet();                         // editors already carrying their colours (not repainted on every visibility change)

function typeFor(layer, colour, whole) {
  const key = `${layer}|${colour}|${whole}`;
  if (!types.has(key)) types.set(key, vscode.window.createTextEditorDecorationType({ backgroundColor: colour, isWholeLine: whole }));
  return types.get(key);
}

function keyOf(uri) { return uri.toString(); }

function editorsOf(key) { return vscode.window.visibleTextEditors.filter((e) => keyOf(e.document.uri) === key); }

function repaint(key, force) {
  const byLayer = layers.get(key) || new Map();
  for (const e of editorsOf(key)) {
    if (!force && painted.has(e)) continue;
    for (const t of types.values()) e.setDecorations(t, []);
    for (const { type, ranges } of byLayer.values()) e.setDecorations(type, ranges);
    painted.add(e);
  }
}

function activate(ctx) {
  ctx.context.subscriptions.push(vscode.window.onDidChangeVisibleTextEditors((editors) => {
    for (const e of editors) if (layers.has(keyOf(e.document.uri))) repaint(keyOf(e.document.uri), false);
  }));
}

// The text document a request points at: a file, or one cell of an open notebook.
function documentOf(req) {
  if (req.notebook) {
    const nb = vscode.workspace.notebookDocuments.find((d) => d.uri.fsPath === path.resolve(req.notebook));
    if (!nb) return null;
    const i = require("./notebook").findCell(nb, req);
    return i < 0 ? null : nb.cellAt(i).document;
  }
  return vscode.workspace.textDocuments.find((d) => d.uri.fsPath === path.resolve(req.file || "")) || null;
}

function rangesOf(doc, req) {
  const out = [], whole = !req.spans && !req.pattern;
  const last = doc.lineCount;
  for (const [a, b] of req.lines || []) out.push(doc.validateRange(new vscode.Range(Math.max(a, 1) - 1, 0, Math.min(b, last) - 1, Number.MAX_SAFE_INTEGER)));
  for (const [l, c1, c2] of req.spans || []) out.push(doc.validateRange(new vscode.Range(l - 1, c1 - 1, l - 1, c2 - 1)));
  if (req.pattern) {
    const re = new RegExp(req.pattern, (req.flags || "").replace("g", "") + "g");
    const text = doc.getText();
    let m;
    while ((m = re.exec(text)) !== null) {
      out.push(new vscode.Range(doc.positionAt(m.index), doc.positionAt(m.index + m[0].length)));
      if (m[0].length === 0) re.lastIndex++;
    }
  }
  return { ranges: out, whole };
}

function summary() {                                    // for "see": which files carry which layers
  const out = {};
  for (const [key, byLayer] of layers) {
    const file = vscode.Uri.parse(key).fsPath;
    out[file] = {};
    for (const [layer, v] of byLayer) out[file][layer] = { colour: v.colour, spans: v.ranges.length, first_line: v.ranges.length ? v.ranges[0].start.line + 1 : null };
  }
  return out;
}

const ops = {
  async colour(req) {
    const doc = documentOf(req);
    if (!doc) return { ok: false, error: "not_open" };
    const { ranges, whole } = rangesOf(doc, req);
    const colour = NAMED[req.colour] || req.colour || NAMED.yellow;
    const key = keyOf(doc.uri), layer = req.layer || "main";
    if (!layers.has(key)) layers.set(key, new Map());
    const byLayer = layers.get(key);
    const type = typeFor(layer, colour, whole);
    const prev = byLayer.get(layer);
    byLayer.set(layer, { type, colour: req.colour || "yellow", ranges: req.add && prev && prev.type === type ? prev.ranges.concat(ranges) : ranges });
    if (!editorsOf(key).length && req.file) await require("./files").show(req.file, { preserveFocus: true });
    repaint(key, true);
    return { ok: true, layer, spans: ranges.length, colour, lines: ranges.map((r) => [r.start.line + 1, r.end.line + 1]).slice(0, 50) };
  },

  async clear(req) {
    if (!req.file && !req.notebook) {
      const keys = [...layers.keys()];
      layers.clear();
      for (const k of keys) repaint(k, true);
      return { ok: true, cleared: keys.length };
    }
    const doc = documentOf(req);
    if (!doc) return { ok: false, error: "not_open" };
    const key = keyOf(doc.uri);
    if (req.layer && layers.has(key)) layers.get(key).delete(req.layer); else layers.delete(key);
    repaint(key, true);
    return { ok: true };
  },
};

module.exports = { ops, activate, summary };
