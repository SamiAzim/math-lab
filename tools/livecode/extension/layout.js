// layout.js: the areas of a window (VS Code calls them editor groups, numbered 1, 2, ... in the order of the
// grid, left to right and top to bottom), and saved setups. Nothing here moves Sami's cursor: areas are added and
// removed by setting the grid, not by focusing and splitting, except "focus", whose whole point is the cursor.
//
//   {"op": "split", "group": 1, "direction": "right" | "down"}   a new empty area beside or under that one
//   {"op": "close_group", "group": 2}                            closes that area's tabs (refuses if one is
//                                                                unsaved, unless "force": true); the empty area goes
//   {"op": "focus", "group": 2}                                  puts the cursor there (the only op that does)
//   {"op": "move", "file": p, "to": 2}                           moves that tab to area 2
//   {"op": "layout", "grid": {...}}                              the whole grid at once, VS Code's own form:
//        {"orientation": "columns" | "rows", "groups": [{"size": 0.6}, {"groups": [{}, {}]}]}
//        ("columns" = side by side; a nested "groups" splits the other way; sizes are fractions)
//   {"op": "save_setup", "name": "gsgt3"}    remembers the grid and which file is in which area (~/.livecode/setups)
//   {"op": "restore_setup", "name": "gsgt3"} brings it back; {"op": "setups"} lists them
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const bridge = require("./bridge");
const files = require("./files");

const SETUPS = path.join(bridge.ROOT, "setups");
const ORDINAL = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth"];
const COLUMNS = 0, ROWS = 1;                           // VS Code's orientation codes

async function focusGroup(n) {
  const name = ORDINAL[n - 1];
  if (!name) throw new Error(`no area ${n}`);
  await vscode.commands.executeCommand(`workbench.action.focus${name}EditorGroup`);
}

// For the few things VS Code only does to the focused area (discarding a tab's changes, the kernel picker): the
// focus goes back where it was afterwards.
async function keepingFocus(fn) {
  const was = vscode.window.tabGroups.activeTabGroup.viewColumn;
  try { return await fn(); }
  finally { if (vscode.window.tabGroups.all.some((g) => g.viewColumn === was)) await focusGroup(was).catch(() => {}); }
}

function groupsNow() {
  return vscode.window.tabGroups.all.map((g) => ({
    group: g.viewColumn, active: g.isActive,
    tabs: g.tabs.map((t) => ({ path: t.input && t.input.uri ? t.input.uri.fsPath : null, label: t.label, active: t.isActive, dirty: t.isDirty })),
  }));
}

function toVscodeGrid(grid) {                           // "columns"/"rows" -> VS Code's 0/1, recursively
  const out = {};
  if (grid.orientation !== undefined) out.orientation = grid.orientation === "rows" ? ROWS : grid.orientation === "columns" ? COLUMNS : grid.orientation;
  if (grid.size !== undefined) out.size = grid.size;
  if (grid.groups) out.groups = grid.groups.map(toVscodeGrid);
  return out;
}

// A new area next to leaf n of the grid. Leaves are numbered depth-first (VS Code's group numbers). If the leaf's
// parent already runs in that direction the new area is a sibling after it; otherwise the leaf becomes a pair
// nested the other way (a nested "groups" flips the orientation).
function withNewArea(grid, n, direction) {
  const want = direction === "down" ? ROWS : COLUMNS;
  let count = 0;
  function walk(node, orientation) {
    if (!node.groups) return ++count === n ? "here" : null;
    for (let i = 0; i < node.groups.length; i++) {
      const child = node.groups[i];
      const r = walk(child, orientation === ROWS ? COLUMNS : ROWS);
      if (r === "here") {
        if (orientation === want) node.groups.splice(i + 1, 0, {});
        else { const leaf = Object.assign({}, child); delete leaf.size; node.groups[i] = { size: child.size, groups: [leaf, {}] }; }
        return "done";
      }
      if (r === "done") return "done";
    }
    return null;
  }
  const g = JSON.parse(JSON.stringify(grid));
  const r = walk(g, g.orientation);
  if (r !== "done") throw new Error(`no area ${n}`);
  return g;
}

const ops = {
  async split(req) {
    const grid = await vscode.commands.executeCommand("vscode.getEditorLayout");
    const n = req.group || vscode.window.tabGroups.activeTabGroup.viewColumn;
    await vscode.commands.executeCommand("vscode.setEditorLayout", withNewArea(grid, n, req.direction));
    return { ok: true, groups: groupsNow() };
  },

  async close_group(req) {
    const g = vscode.window.tabGroups.all.find((x) => x.viewColumn === req.group);
    if (!g) return { ok: false, error: `no area ${req.group}` };
    const dirty = g.tabs.filter((t) => t.isDirty).map((t) => t.label);
    if (dirty.length && !req.force) return { ok: false, error: "unsaved", tabs: dirty };
    const clean = g.tabs.filter((t) => !t.isDirty);
    if (clean.length) await vscode.window.tabGroups.close(clean, true);
    if (dirty.length) await keepingFocus(async () => {    // force: discard, one tab at a time (VS Code only does this to the active editor)
      for (const t of g.tabs.filter((x) => x.isDirty)) {
        const p = t.input && t.input.uri && t.input.uri.fsPath;
        if (p) await files.show(p, { group: req.group, preserveFocus: false });
        await vscode.commands.executeCommand("workbench.action.revertAndCloseActiveEditor");
      }
    });
    return { ok: true, groups: groupsNow() };             // an empty area disappears by itself
  },

  async focus(req) { await focusGroup(req.group); return { ok: true, groups: groupsNow() }; },

  async move(req) {
    const tab = files.findTab(req.file);
    if (!tab) return { ok: false, error: "not_open" };
    const from = tab.group.viewColumn;
    if (from === req.to) return { ok: true, group: from };
    if (req.to === require("./see").chatGroup()) return { ok: false, error: "that area holds the chat" };
    await files.show(req.file, { group: req.to, preserveFocus: true });
    const again = files.findTab(req.file, from);          // the original tab, still in the old area
    if (again) await vscode.window.tabGroups.close(again, true);
    return { ok: true, group: req.to, groups: groupsNow() };
  },

  async layout(req) {
    await vscode.commands.executeCommand("vscode.setEditorLayout", toVscodeGrid(req.grid));
    return { ok: true, grid: await vscode.commands.executeCommand("vscode.getEditorLayout"), groups: groupsNow() };
  },

  async save_setup(req) {
    fs.mkdirSync(SETUPS, { recursive: true });
    const setup = { saved: new Date().toISOString(), window: vscode.workspace.name || null,
                    grid: await vscode.commands.executeCommand("vscode.getEditorLayout"), groups: groupsNow() };
    fs.writeFileSync(path.join(SETUPS, `${req.name}.json`), JSON.stringify(setup, null, 1));
    return { ok: true, name: req.name, groups: setup.groups };
  },

  async restore_setup(req) {
    const file = path.join(SETUPS, `${req.name}.json`);
    if (!fs.existsSync(file)) return { ok: false, error: "no_such_setup", setups: fs.existsSync(SETUPS) ? fs.readdirSync(SETUPS) : [] };
    const setup = JSON.parse(fs.readFileSync(file, "utf8"));
    await vscode.commands.executeCommand("vscode.setEditorLayout", setup.grid);
    const missing = [];
    for (const g of setup.groups) {
      for (const t of g.tabs) {
        if (!t.path) continue;
        if (!fs.existsSync(t.path)) { missing.push(t.path); continue; }
        await files.show(t.path, { group: g.group, preserveFocus: true });
      }
      const active = g.tabs.find((t) => t.active && t.path && fs.existsSync(t.path));
      if (active) await files.show(active.path, { group: g.group, preserveFocus: true });
    }
    return { ok: true, name: req.name, missing, groups: groupsNow() };
  },

  async setups() {
    const names = fs.existsSync(SETUPS) ? fs.readdirSync(SETUPS).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)) : [];
    return { ok: true, setups: names };
  },
};

module.exports = { ops, focusGroup, keepingFocus, groupsNow, withNewArea };
