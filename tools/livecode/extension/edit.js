// edit.js: changes to a file Sami has open, made through the editor, so he watches them happen. Typed in live
// line by line, or landed whole when the change is big. The changed lines are coloured (layer "edit") until
// cleared. Undo works. The file is saved only when asked.
//
//   {"op": "edit", "file": p, "text": "...",
//    "lines": [a, b]        replace lines a..b (inclusive)       | "at": 57 | "end"   insert before line 57 / at the end
//    "all": true            replace the whole file
//    "stream": true | false | "auto" (default: typed when <= 60 lines, whole otherwise), "ms_per_line": 25,
//    "colour": "green" | false, "save": false}
//   {"op": "save", "file": p}
// Guards: the file must be open in this window (an edit to a closed file is ordinary Claude Code business, not
// LiveCode's); if Sami typed in it during the last "guard_s" seconds (default 10) the edit is refused
// ("sami_is_typing"), unless "force": true. If he starts typing while a change is being typed in, the rest of
// the change lands whole at once, so his keystrokes and ours never interleave.
const vscode = require("vscode");
const path = require("path");
const see = require("./see");
const files = require("./files");

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function targetRange(doc, req) {                        // where the new text goes; what it replaces (may be empty)
  const last = doc.lineCount;
  if (req.all) return new vscode.Range(0, 0, last - 1, Number.MAX_SAFE_INTEGER);
  if (req.lines) {
    const [a, b] = req.lines;
    return doc.validateRange(new vscode.Range(Math.max(a, 1) - 1, 0, Math.min(b, last) - 1, Number.MAX_SAFE_INTEGER));
  }
  if (req.at === "end" || req.at > last) {
    const end = doc.lineAt(last - 1).range.end;
    return new vscode.Range(end, end);
  }
  const p = new vscode.Position(Math.max(req.at || 1, 1) - 1, 0);
  return new vscode.Range(p, p);
}

const ops = {
  async edit(req) {
    const target = path.resolve(req.file);
    if (!files.findTab(target)) return { ok: false, error: "not_open", file: target };
    if (req.text === undefined || req.text === null) return { ok: false, error: "no text given" };
    if (!req.lines && req.at === undefined && !req.all) return { ok: false, error: "say where: lines, at, or all" };
    const typed = see.userEdits.get(target);
    const guard = (req.guard_s === undefined ? 10 : req.guard_s) * 1000;
    if (typed && Date.now() - typed < guard && !req.force) return { ok: false, error: "sami_is_typing", seconds_ago: Math.round((Date.now() - typed) / 1000) };
    const r = await files.show(target, { preserveFocus: true });
    let editor = r.editor;
    if (!editor) return { ok: false, error: "not_text" };
    const doc = editor.document;
    let text = req.text;
    const range = targetRange(doc, req);
    const inserting = range.isEmpty, atEnd = req.at === "end" || req.at > doc.lineCount;
    if (!inserting && text.endsWith("\n")) text = text.slice(0, -1);              // the replaced lines keep their own line break
    if (inserting && !atEnd && !text.endsWith("\n")) text += "\n";                 // a new line stays a line
    if (inserting && atEnd && !text.startsWith("\n") && doc.lineAt(doc.lineCount - 1).text !== "") text = "\n" + text;
    const lines = text.split(/(?<=\n)/);
    const stream = req.stream === undefined || req.stream === "auto" ? lines.length <= 60 : !!req.stream;
    const msPerLine = req.ms_per_line === undefined ? 25 : req.ms_per_line;
    const startedAt = Date.now();

    see.markOurs(+1);
    let start, end, interrupted = false;
    try {
      if (!stream) {
        await editor.edit((b) => b.replace(range, text));
        start = range.start;
        end = doc.positionAt(doc.offsetAt(start) + text.length);
      } else {
        if (!inserting) await editor.edit((b) => b.delete(range), { undoStopBefore: true, undoStopAfter: false });
        start = range.start;
        let pos = start;
        for (let i = 0; i < lines.length; i++) {
          const t = see.userEdits.get(target);
          let chunk = lines[i];
          if (t && t > startedAt) { chunk = lines.slice(i).join(""); interrupted = true; }   // Sami typed: the rest lands at once
          const apply = (ed) => ed.edit((b) => b.insert(pos, chunk), { undoStopBefore: i === 0 && inserting, undoStopAfter: i === lines.length - 1 || interrupted });
          try { await apply(editor); }
          catch (e) { editor = (await files.show(target, { preserveFocus: true })).editor; await apply(editor); }   // the tab was switched away mid-stream
          pos = doc.positionAt(doc.offsetAt(pos) + chunk.length);
          if (interrupted) break;
          if (i % 4 === 0) editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
          if (msPerLine) await sleep(msPerLine);
        }
        end = pos;
      }
    } finally {
      see.markOurs(-1);
    }
    const res = { ok: true, lines: [start.line + 1, Math.max(end.line + (end.character === 0 ? 0 : 1), start.line + 1)], streamed: stream, interrupted: interrupted || undefined, group: r.group };
    editor.revealRange(new vscode.Range(start, end), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    if (req.colour !== false) {
      await require("./colour").ops.colour({ file: target, lines: [res.lines], colour: req.colour || "green", layer: "edit", add: true });
    }
    if (req.save) { await doc.save(); res.saved = true; }
    return res;
  },

  async save(req) {
    const target = path.resolve(req.file);
    const d = vscode.workspace.textDocuments.find((x) => x.uri.fsPath === target) ||
              vscode.workspace.notebookDocuments.find((x) => x.uri.fsPath === target);
    if (!d) return { ok: false, error: "not_open" };
    return { ok: await d.save(), file: target };
  },
};

module.exports = { ops };
