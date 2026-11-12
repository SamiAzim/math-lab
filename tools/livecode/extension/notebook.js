// notebook.js: cells and kernels of notebooks that are open in VS Code, through the editor itself (from Live
// Cell 0.0.5). Editing an .ipynb on disk while it is open with unsaved outputs makes VS Code raise a conflict;
// applying the change through the notebook API is like typing it: outputs, kernel and unsaved state stay, and
// Ctrl+Z undoes it.
//
//   {"op": "cells", "notebook": p, "brief": true}                     ids, types and sources (never outputs);
//                                                                     brief = first line of each cell only
//   {"op": "cell_replace", "notebook": p, "cell_id": "fig1" | "index": 3, "source": "..."}
//   {"op": "cell_insert", "notebook": p, "after_id": "setup" | "after_index": 2 | "at_end": true,
//                         "cell_type": "code" | "markdown", "cell_id": "new-id", "source": "..."}
//   {"op": "cell_delete", "notebook": p, "cell_id": "fig1"}
//   {"op": "cell_run", "notebook": p, "cell_id": "fig1"}
//   {"op": "kernel", "notebook": p, "id": "<controller id>"}         attaches that kernel (the cli finds the id of a
//                                                                     kernel picked before); without an id, opens
//                                                                     VS Code's kernel picker for Sami
// cell_replace and cell_insert RUN a code cell afterwards and wait for it (unless "run": false), so what is on
// screen is always what ran; the answer says success or the error's name and message, never the outputs. A cell
// runs in the notebook's own editor (shown first if its tab is hidden), never in whatever notebook is active.
const vscode = require("vscode");
const path = require("path");

function cellId(cell) {
  const m = cell.metadata || {};
  return m.id || (m.custom && m.custom.id) || (m.metadata && m.metadata.id) || null;
}

function findCell(doc, req) {
  if (req.cell_id !== undefined && req.cell_id !== null) {
    for (let i = 0; i < doc.cellCount; i++) if (cellId(doc.cellAt(i)) === req.cell_id) return i;
    return -1;
  }
  if (req.index !== undefined && req.index !== null) return req.index >= 0 && req.index < doc.cellCount ? req.index : -1;
  return -1;
}

function docOf(req) { return vscode.workspace.notebookDocuments.find((d) => d.uri.fsPath === path.resolve(req.notebook || "")); }

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function cellResult(cell) {                             // success and, on failure, the error; never the outputs
  const sum = cell.executionSummary || {};
  const out = { success: sum.success, execution_count: sum.executionOrder };
  for (const o of cell.outputs) for (const item of o.items) {
    if (item.mime === "application/vnd.code.notebook.error") {
      try { const e = JSON.parse(Buffer.from(item.data).toString("utf8")); out.error = { name: e.name, message: String(e.message || "").slice(0, 2000) }; }
      catch (err) { out.error = { name: "error", message: "unreadable error output" }; }
    }
  }
  return out;
}

async function runCell(doc, i, timeoutS) {
  await require("./files").show(doc.uri.fsPath, { preserveFocus: true });      // the execute command needs the notebook's own editor, not whichever notebook is active
  const before = (doc.cellAt(i).executionSummary || {}).timing;
  const t0 = Date.now();
  await vscode.commands.executeCommand("notebook.cell.execute", { ranges: [{ start: i, end: i + 1 }], document: doc.uri });
  while (Date.now() - t0 < timeoutS * 1000) {           // the command can return before the kernel finishes
    const t = (doc.cellAt(i).executionSummary || {}).timing;
    if (t && t.endTime && (!before || t.endTime !== before.endTime)) return cellResult(doc.cellAt(i));
    await sleep(200);
  }
  return { success: undefined, note: `still running after ${timeoutS}s` };
}

const ops = {
  async cells(req) {
    const doc = docOf(req);
    if (!doc) return { ok: false, error: "not_open" };
    const cells = [];
    for (let i = 0; i < doc.cellCount; i++) {
      const c = doc.cellAt(i);
      const src = c.document.getText();
      cells.push({ index: i, id: cellId(c), type: c.kind === vscode.NotebookCellKind.Markup ? "markdown" : "code",
                   source: req.brief ? src.split("\n")[0].slice(0, 70) : src, lines: src.split("\n").length });
    }
    return { ok: true, dirty: doc.isDirty, cells };
  },

  async cell_replace(req) {
    const doc = docOf(req);
    if (!doc) return { ok: false, error: "not_open" };
    const i = findCell(doc, req);
    if (i < 0) return { ok: false, error: "cell_not_found" };
    const td = doc.cellAt(i).document;
    const edit = new vscode.WorkspaceEdit();
    edit.replace(td.uri, new vscode.Range(td.positionAt(0), td.positionAt(td.getText().length)), req.source || "");   // text only: outputs stay
    const ok = await vscode.workspace.applyEdit(edit);
    const res = { ok, index: i, cell_id: cellId(doc.cellAt(i)) };
    if (ok && req.run !== false && doc.cellAt(i).kind === vscode.NotebookCellKind.Code) res.run = await runCell(doc, i, req.timeout_s || 900);
    return res;
  },

  async cell_insert(req) {
    const doc = docOf(req);
    if (!doc) return { ok: false, error: "not_open" };
    let at = 0;
    if ((req.after_id !== undefined && req.after_id !== null) || (req.after_index !== undefined && req.after_index !== null)) {
      const j = findCell(doc, { cell_id: req.after_id, index: req.after_index });
      if (j < 0) return { ok: false, error: "anchor_not_found" };
      at = j + 1;
    } else if (req.at_end) at = doc.cellCount;
    const kind = req.cell_type === "markdown" ? vscode.NotebookCellKind.Markup : vscode.NotebookCellKind.Code;
    const data = new vscode.NotebookCellData(kind, req.source || "", kind === vscode.NotebookCellKind.Markup ? "markdown" : "python");
    data.metadata = { id: req.cell_id || `cell-${Date.now()}` };
    const edit = new vscode.WorkspaceEdit();
    edit.set(doc.uri, [vscode.NotebookEdit.insertCells(at, [data])]);
    const ok = await vscode.workspace.applyEdit(edit);
    const res = { ok, index: at, cell_id: data.metadata.id };
    if (ok && req.run !== false && kind === vscode.NotebookCellKind.Code) res.run = await runCell(doc, at, req.timeout_s || 900);
    return res;
  },

  async cell_delete(req) {
    const doc = docOf(req);
    if (!doc) return { ok: false, error: "not_open" };
    const i = findCell(doc, req);
    if (i < 0) return { ok: false, error: "cell_not_found" };
    const edit = new vscode.WorkspaceEdit();
    edit.set(doc.uri, [vscode.NotebookEdit.deleteCells(new vscode.NotebookRange(i, i + 1))]);
    return { ok: await vscode.workspace.applyEdit(edit), index: i };
  },

  async cell_run(req) {
    const doc = docOf(req);
    if (!doc) return { ok: false, error: "not_open" };
    const i = findCell(doc, req);
    if (i < 0) return { ok: false, error: "cell_not_found" };
    if (doc.cellAt(i).kind !== vscode.NotebookCellKind.Code) return { ok: true, index: i, note: "markdown: nothing to run" };
    return { ok: true, index: i, run: await runCell(doc, i, req.timeout_s || 900) };
  },

  async kernel(req) {
    const doc = docOf(req);
    if (!doc) return { ok: false, error: "not_open" };
    // "notebook.selectKernel" acts on the ACTIVE notebook editor, so the notebook takes the focus for a moment, in
    // its own area (never the chat's), and the focus goes back where it was (Sami's cursor is his).
    const files = require("./files"), { keepingFocus } = require("./layout");
    const tab = files.findTab(doc.uri.fsPath);
    const group = tab ? tab.group.viewColumn : undefined;
    if (req.id) {                                       // the id comes from the cli (VS Code's record of kernels, or built from the interpreter path)
      const ok = await keepingFocus(async () => {
        await files.show(doc.uri.fsPath, { group, preserveFocus: false });
        return vscode.commands.executeCommand("notebook.selectKernel", { id: req.id, extension: req.extension || "ms-toolsai.jupyter" });
      });
      return { ok: ok !== false, id: req.id, note: ok === false ? "VS Code did not accept that kernel id" : req.note };
    }
    await files.show(doc.uri.fsPath, { group, preserveFocus: false });     // the picker needs the notebook focused; Sami clicks
    await vscode.commands.executeCommand("notebook.selectKernel");
    return { ok: true, picker_opened: true, note: req.note };
  },
};

module.exports = { ops, findCell, cellId };
