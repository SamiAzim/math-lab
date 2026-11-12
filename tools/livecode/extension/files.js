// files.js: open, close and scroll, for any file anywhere (code, notebooks, images, PDFs), in any area.
//
//   {"op": "open", "file": p, "group": 2 | "beside", "line": 212 | "lines": [200, 230], "where": "center" | "top",
//    "colour": "yellow"}                                  opens (or just shows) the file in that area; with a line
//                                                          or lines it scrolls there too, and colours them if asked
//   {"op": "open", "file": nb.ipynb, "cell_id": "fig1"}    a notebook, scrolled to that cell
//   {"op": "scroll", "file": p, "line": 212 | "lines": [a, b], "where": "center" | "top", "select": false}
//   {"op": "scroll", "notebook": p, "cell_id": "fig1" | "index": 3}
//   {"op": "close", "files": [...] | "mine": true, "save": false}
//        closes those tabs ("mine" = every file LiveCode opened in this window); an unsaved tab is left alone
//        and reported, unless "save": true (saves first) or "force": true (discards)
// Lines are 1-based, as in the editor's gutter. Without a "group", a file goes where it already is, else to the
// first area that is not the chat's, else to a new area beside the chat. Never over the chat.
const vscode = require("vscode");
const path = require("path");

const openedByMe = new Set();
const BINARY_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tif", ".tiff", ".svg", ".pdf", ".mp4", ".mov", ".zip", ".gz", ".npy", ".npz", ".pt", ".pth", ".h5", ".pkl", ".vsix"]);

function findTab(file, inGroup) {
  const target = path.resolve(file);
  for (const g of vscode.window.tabGroups.all) {
    if (inGroup && g.viewColumn !== inGroup) continue;
    for (const t of g.tabs) {
      const u = t.input && (t.input.uri || t.input.modified);
      if (u && u.fsPath === target) return t;
    }
  }
  return null;
}

function kindOf(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".ipynb") return "notebook";
  if (BINARY_EXT.has(ext)) return "other";
  return "text";
}

function columnFor(file, opt) {
  const tab = findTab(file);
  const chat = require("./see").chatGroup();
  if (typeof opt.group === "number" && opt.group !== chat) return opt.group;
  if (tab && opt.group === undefined) return tab.group.viewColumn;
  if (opt.group === "beside") return vscode.ViewColumn.Beside;
  const other = vscode.window.tabGroups.all.find((g) => g.viewColumn !== chat);
  if (other) return other.viewColumn;
  return vscode.ViewColumn.Beside;
}

// Show a file in an area; returns {kind, group, editor?}. Used by open, scroll, move and restore_setup.
async function show(file, opt = {}) {
  const target = path.resolve(file), kind = kindOf(target), uri = vscode.Uri.file(target);
  const viewColumn = columnFor(target, opt), preserveFocus = opt.preserveFocus !== false, preview = !!opt.preview;
  const wasOpen = !!findTab(target);
  let editor = null;
  if (kind === "notebook") {
    const doc = await vscode.workspace.openNotebookDocument(uri);
    editor = await vscode.window.showNotebookDocument(doc, { viewColumn, preserveFocus, preview });
  } else if (kind === "text") {
    const doc = await vscode.workspace.openTextDocument(uri);
    editor = await vscode.window.showTextDocument(doc, { viewColumn, preserveFocus, preview });
  } else {
    await vscode.commands.executeCommand("vscode.open", uri, { viewColumn, preserveFocus, preview });
  }
  if (!wasOpen) openedByMe.add(target);
  const tab = findTab(target);
  return { kind, group: tab ? tab.group.viewColumn : null, editor };
}

async function scrollText(editor, req) {
  const [a, b] = req.lines || [req.line, req.line];
  const last = editor.document.lineCount;
  const range = editor.document.validateRange(new vscode.Range(Math.max(a, 1) - 1, 0, Math.min(b, last) - 1, Number.MAX_SAFE_INTEGER));
  const how = req.where === "top" ? vscode.TextEditorRevealType.AtTop : vscode.TextEditorRevealType.InCenter;
  editor.revealRange(range, how);
  if (req.select) editor.selection = new vscode.Selection(range.start, range.end);
  return [Math.max(a, 1), Math.min(b, last)];
}

async function scrollNotebook(file, req) {
  const nb = require("./notebook");
  const doc = vscode.workspace.notebookDocuments.find((d) => d.uri.fsPath === path.resolve(file));
  if (!doc) return { ok: false, error: "not_open" };
  const i = nb.findCell(doc, req);
  if (i < 0) return { ok: false, error: "cell_not_found" };
  const r = await show(file, { preserveFocus: true });
  r.editor.revealRange(new vscode.NotebookRange(i, i + 1), vscode.NotebookEditorRevealType.InCenter);
  return { ok: true, index: i, group: r.group };
}

const ops = {
  async open(req) {
    const r = await show(req.file, req);
    const res = { ok: true, kind: r.kind, group: r.group };
    if (r.kind === "notebook" && (req.cell_id !== undefined || req.index !== undefined)) Object.assign(res, await scrollNotebook(req.file, req));
    if (r.editor && r.kind === "text" && (req.line || req.lines)) {
      res.lines = await scrollText(r.editor, req);
      if (req.colour) await require("./colour").ops.colour({ file: req.file, lines: [res.lines], colour: req.colour, layer: req.layer || "main" });
    }
    return res;
  },

  async scroll(req) {
    if (req.notebook) return scrollNotebook(req.notebook, req);
    if (!findTab(req.file)) return { ok: false, error: "not_open" };
    const r = await show(req.file, { preserveFocus: true });
    if (!r.editor) return { ok: false, error: "not_text" };
    return { ok: true, lines: await scrollText(r.editor, req), group: r.group };
  },

  async close(req) {
    let targets = req.files || (req.file ? [req.file] : []);
    if (req.mine) targets = [...openedByMe];
    if (!targets.length) return { ok: false, error: "nothing to close" };
    const closed = [], unsaved = [], notOpen = [];
    for (const f of targets) {
      const tab = findTab(f);
      if (!tab) { notOpen.push(f); continue; }
      if (tab.isDirty && req.save) {
        const d = vscode.workspace.textDocuments.find((x) => x.uri.fsPath === path.resolve(f)) ||
                  vscode.workspace.notebookDocuments.find((x) => x.uri.fsPath === path.resolve(f));
        if (d) await d.save();
      }
      if (tab.isDirty && !req.save && !req.force) { unsaved.push(f); continue; }
      if (tab.isDirty && req.force) {
        await require("./layout").keepingFocus(async () => {     // discarding is something VS Code only does to the active editor
          await show(f, { preserveFocus: false });
          await vscode.commands.executeCommand("workbench.action.revertAndCloseActiveEditor");
        });
      } else {
        await vscode.window.tabGroups.close(tab, true);
      }
      openedByMe.delete(path.resolve(f));
      closed.push(f);
    }
    return { ok: true, closed, unsaved, not_open: notOpen };
  },
};

module.exports = { ops, show, findTab, kindOf, openedByMe };
