// see.js: what is on Sami's screen right now, in one compact answer, so Claude can decide what to do next
// without opening anything.
//
//   {"op": "see"}                       -> this window: name, focused?, the grid of areas, every area (group)
//                                          with its tabs, what is visible in each (file, visible lines, cursor,
//                                          selection), unsaved files, seconds since Sami last typed in each
//                                          file, which colour layers are on, the last things LiveCode did here
//   {"op": "read", "file": p}           -> the text as the editor holds it (unsaved changes included);
//                                          "lines": [a, b] for a part; "notebook" + "cell_id" for one cell
//
// The CLI sends "see" as a broadcast, so with two windows both answer and it merges them.
const vscode = require("vscode");
const path = require("path");

const userEdits = new Map();                           // file -> time of Sami's last keystroke (ours are excluded)
let ours = 0;                                          // > 0 while LiveCode itself is editing (edit.js sets it)

function markOurs(delta) { ours += delta; }

function activate(ctx) {
  ctx.context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((e) => {
    // Only keystrokes count as Sami typing: a few characters, in the focused window, leaving the file unsaved. A
    // file rewritten on disk (Claude's ordinary Edit tool) is reloaded by VS Code as a change that leaves the
    // document clean, so it is not him.
    if (ours > 0 || !vscode.window.state.focused || !e.document.isDirty) return;
    if (e.contentChanges.length === 0 || e.contentChanges.length > 3) return;
    if (e.contentChanges.some((c) => c.text.length > 4 || c.rangeLength > 4)) return;
    userEdits.set(e.document.uri.fsPath, Date.now());
  }));
}

function kindOf(tab) {
  const i = tab.input;
  if (!i) return "other";
  if (i instanceof vscode.TabInputText) return "text";
  if (i instanceof vscode.TabInputNotebook) return "notebook";
  if (i instanceof vscode.TabInputCustom) return i.viewType === "livecode.review" ? "review" : "custom";
  if (i instanceof vscode.TabInputWebview) return "webview";
  if (i instanceof vscode.TabInputTextDiff) return "diff";
  return "other";
}

// The area that holds the Claude chat (a webview tab; Claude Code's is "claudeVSCodePanel") is never used for files.
function chatGroup() {
  for (const g of vscode.window.tabGroups.all)
    for (const t of g.tabs) if (t.input instanceof vscode.TabInputWebview && /claude/i.test(t.label + " " + t.input.viewType)) return g.viewColumn;
  return null;
}

function tabPath(tab) {
  const i = tab.input;
  return i && i.uri ? i.uri.fsPath : (i && i.modified ? i.modified.fsPath : null);
}

function pos(p) { return [p.line + 1, p.character + 1]; }   // 1-based lines, as Sami sees them in the gutter

function viewOf(group) {
  const col = group.viewColumn;
  const ne = vscode.window.visibleNotebookEditors.find((e) => e.viewColumn === col);
  if (ne) {                                             // a notebook's cells are text editors too: the notebook comes first
    const r = ne.visibleRanges[0], s = ne.selection;
    return { notebook: ne.notebook.uri.fsPath, cells: ne.notebook.cellCount, dirty: ne.notebook.isDirty,
             visible_cells: r ? [r.start, r.end - 1] : null, selected_cell: s ? s.start : null };
  }
  const te = vscode.window.visibleTextEditors.find((e) => e.viewColumn === col && e.document.uri.scheme !== "vscode-notebook-cell");
  if (te) {
    const d = te.document, sel = te.selection, vr = te.visibleRanges;
    const v = { file: d.uri.fsPath, visible: vr.length ? [vr[0].start.line + 1, vr[vr.length - 1].end.line + 1] : null,
                lines: d.lineCount, cursor: pos(sel.active), dirty: d.isDirty };
    if (!sel.isEmpty) { v.selection = [pos(sel.start), pos(sel.end)]; v.selected_text = d.getText(sel).slice(0, 300); }
    return v;
  }
  return null;
}

async function snapshot() {
  const chat = chatGroup();
  const groups = vscode.window.tabGroups.all.map((g) => ({
    group: g.viewColumn, active: g.isActive, chat: g.viewColumn === chat || undefined,
    tabs: g.tabs.map((t) => ({ label: t.label, path: tabPath(t), kind: kindOf(t), active: t.isActive, dirty: t.isDirty, preview: t.isPreview,
                               view_type: t.input instanceof vscode.TabInputWebview || t.input instanceof vscode.TabInputCustom ? t.input.viewType : undefined })),
    view: viewOf(g),
  }));
  const now = Date.now();
  const typed = {};
  for (const [f, t] of userEdits) if (now - t < 600000) typed[f] = Math.round((now - t) / 1000);
  let grid = null;
  try { grid = await vscode.commands.executeCommand("vscode.getEditorLayout"); } catch (e) { /* not fatal */ }
  return { window: windowName(), pid: process.pid, focused: vscode.window.state.focused, grid, groups,
           unsaved: vscode.workspace.textDocuments.filter((d) => d.isDirty && d.uri.scheme === "file").map((d) => d.uri.fsPath)
                    .concat(vscode.workspace.notebookDocuments.filter((d) => d.isDirty).map((d) => d.uri.fsPath)),
           typed_seconds_ago: typed, coloured: require("./colour").summary(), history: require("./bridge").history.slice(-10) };
}

function windowName() { return vscode.workspace.name || "(no folder)"; }

const ops = {
  async see() { return Object.assign({ ok: true }, await snapshot()); },

  async read(req) {
    if (req.notebook) {
      const nb = vscode.workspace.notebookDocuments.find((d) => d.uri.fsPath === path.resolve(req.notebook));
      if (!nb) return { ok: false, error: "not_open" };
      const { findCell } = require("./notebook");
      const i = findCell(nb, req);
      if (i < 0) return { ok: false, error: "cell_not_found" };
      return { ok: true, text: nb.cellAt(i).document.getText() };
    }
    const target = path.resolve(req.file || "");
    const d = vscode.workspace.textDocuments.find((x) => x.uri.fsPath === target);
    if (!d) return { ok: false, error: "not_open" };
    if (req.lines) {
      const [a, b] = req.lines;
      const r = new vscode.Range(a - 1, 0, Math.min(b, d.lineCount) - 1, Number.MAX_SAFE_INTEGER);
      return { ok: true, lines: [a, Math.min(b, d.lineCount)], text: d.getText(d.validateRange(r)), dirty: d.isDirty };
    }
    return { ok: true, lines: [1, d.lineCount], text: d.getText(), dirty: d.isDirty };
  },
};

module.exports = { ops, activate, snapshot, markOurs, userEdits, windowName, chatGroup };
