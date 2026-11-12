// bridge.js: how a request reaches the right VS Code window and how its answer comes back.
//
// Files, so any tool can drive it (Claude calls cli/livecode.py):
//   ~/.livecode/inbox/<name>.json     one request  {"op": "...", "sent_at": <unix s>, "ttl_s": 60, ...}
//   ~/.livecode/outbox/<name>.json    its answer   {"ok": true, ...}
//   ~/.livecode/done/<name>.json      the request, once a window has claimed it
//   ~/.livecode/trace.jsonl           one line per event, every window (diagnostics; kept from Live Cell 0.0.5,
//                                     which once lost a request and stayed "busy" for a morning)
//
// Several windows (laptop: one; at work: two) run this extension and share the inbox. Which one answers:
//   broadcast: true          every window answers, in outbox/<name>.<pid>.json (used by "see")
//   "window": "<name>"       only the window whose workspace has that name
//   "file" / "notebook"      a window that has that document open
//   otherwise                any window
// and in every case the FOCUSED window claims at once while an unfocused one waits 700 ms, so the window Sami is
// looking at wins. A window claims by renaming the request into done/ (atomic: exactly one window gets it), then
// runs it WITHOUT holding up the next request (a cell can run for minutes; "see" must still answer). A request
// older than its ttl is not run (a sender that gave up must not have its edit land minutes later).
const vscode = require("vscode");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.join(os.homedir(), ".livecode");
const INBOX = path.join(ROOT, "inbox"), OUTBOX = path.join(ROOT, "outbox"), DONE = path.join(ROOT, "done");
const TRACE = path.join(ROOT, "trace.jsonl");
const UNFOCUSED_DELAY_MS = 700;

let ctx = null, ops = null, timer = null, polling = false, answered = 0, statusItem = null;
const running = new Map();                              // request file -> {op, since}
const firstSeen = new Map();                            // request file -> when this window first saw it
const seenBroadcast = new Set();
const history = [];                                     // the last 30 things this window did, for "see"

function windowName() { return vscode.workspace.name || "(no folder)"; }

function trace(event, data) {
  const rec = Object.assign({ t: new Date().toISOString(), pid: process.pid, window: windowName(), event }, data || {});
  try { fs.appendFileSync(TRACE, JSON.stringify(rec) + "\n"); } catch (e) { /* tracing never breaks a request */ }
  if (ctx) ctx.log.appendLine(`${rec.t} ${event} ${data ? JSON.stringify(data) : ""}`);
}

function hasDocument(p) {
  const target = path.resolve(p);
  return vscode.workspace.textDocuments.some((d) => d.uri.fsPath === target) ||
         vscode.workspace.notebookDocuments.some((d) => d.uri.fsPath === target) ||
         vscode.window.tabGroups.all.some((g) => g.tabs.some((t) => t.input && t.input.uri && t.input.uri.fsPath === target));
}

function targetOf(req) { return req.file || req.notebook || (req.files && req.files[0]) || null; }

// Does this window take the request now?
function routes(req, file) {
  if (req.window && req.window !== windowName()) return false;
  const target = targetOf(req);
  const needsDocument = target && !["open", "layout", "restore_setup", "review"].includes(req.op);
  if (needsDocument && !hasDocument(target)) return false;
  if (vscode.window.state.focused) return true;
  if (!firstSeen.has(file)) firstSeen.set(file, Date.now());
  return Date.now() - firstSeen.get(file) >= UNFOCUSED_DELAY_MS;
}

function expired(req) {
  if (!req.sent_at) return false;
  return Date.now() / 1000 - req.sent_at > (req.ttl_s || 60);
}

function updateStatus() {
  if (!statusItem) return;
  const n = running.size;
  statusItem.text = n ? `$(sync~spin) LiveCode: ${[...running.values()].map((r) => r.op).join(", ")}` : "$(eye) LiveCode";
  statusItem.tooltip = `LiveCode ${ctx.version}, window "${windowName()}": ${n ? "working" : "idle"}; ${answered} requests answered`;
}

async function answer(req, file, suffix) {
  running.set(file, { op: req.op, since: new Date().toISOString() });
  updateStatus();
  let res;
  try {
    const fn = ops[req.op];
    res = fn ? await fn(req, ctx) : { ok: false, error: `unknown op "${req.op}"` };
  } catch (e) {
    res = { ok: false, error: String((e && e.message) || e) };
    trace("op_threw", { request: file, op: req.op, error: res.error });
  }
  res = Object.assign({ ok: false }, res, { request: file, window: windowName(), pid: process.pid });
  const out = path.join(OUTBOX, suffix ? file.replace(/\.json$/, `.${suffix}.json`) : file);
  try {
    fs.writeFileSync(out + ".tmp", JSON.stringify(res, null, 1));
    fs.renameSync(out + ".tmp", out);                   // appears whole, never half-written
  } catch (e) { trace("answer_write_failed", { request: file, error: String(e) }); }
  trace("answered", { request: file, op: req.op, ok: res.ok, error: res.error });
  running.delete(file);
  if (res.ok) answered++;
  if (req.op !== "see" && req.op !== "read") {
    history.push({ op: req.op, file: targetOf(req), ok: res.ok, when: new Date().toISOString() });
    if (history.length > 30) history.shift();
  }
  updateStatus();
}

function poll() {
  if (polling) return;
  polling = true;
  try {
    let files;
    try { files = fs.readdirSync(INBOX).filter((f) => f.endsWith(".json")).sort(); } catch (e) { return; }
    for (const f of files) {
      let req;
      try { req = JSON.parse(fs.readFileSync(path.join(INBOX, f), "utf8")); } catch (e) { continue; }  // half-written: next poll
      if (req.broadcast) {                              // everyone answers once; the sender removes the request
        if (seenBroadcast.has(f)) continue;
        seenBroadcast.add(f);
        if (!req.window || req.window === windowName()) answer(req, f, String(process.pid));
        continue;
      }
      if (!routes(req, f)) continue;
      try { fs.renameSync(path.join(INBOX, f), path.join(DONE, f)); } catch (e) { continue; }   // another window took it
      firstSeen.delete(f);
      if (expired(req)) { trace("expired", { request: f, op: req.op }); continue; }
      trace("claimed", { request: f, op: req.op, file: targetOf(req) });
      answer(req, f);                                   // not awaited: the next request is not held up
    }
    for (const f of [...seenBroadcast]) if (!files.includes(f)) seenBroadcast.delete(f);
    for (const f of [...firstSeen.keys()]) if (!files.includes(f)) firstSeen.delete(f);
  } catch (e) {
    trace("poll_error", { error: String(e) });
  } finally {
    polling = false;
  }
}

function start(context, allOps) {
  ctx = context; ops = allOps;
  for (const d of [INBOX, OUTBOX, DONE]) fs.mkdirSync(d, { recursive: true });
  trace("activate", { version: ctx.version, vscode: vscode.version });
  statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 50);
  statusItem.command = "livecode.status";
  statusItem.show();
  updateStatus();
  ctx.context.subscriptions.push(statusItem);
  timer = setInterval(poll, 300);
}

function stop() { if (timer) clearInterval(timer); timer = null; trace("deactivate", { running: [...running.keys()] }); }

function status() {
  const n = running.size;
  return `${n ? `working on ${[...running.entries()].map(([f, r]) => `${r.op} (${f}, since ${r.since})`).join("; ")}` : "idle"}; ${answered} requests answered this session; window "${windowName()}"`;
}

module.exports = { start, stop, status, trace, history, ROOT };
