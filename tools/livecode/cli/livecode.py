#!/usr/bin/env python3
"""
livecode.py -- Claude's command line to the LiveCode VS Code extension (no dependencies beyond Python 3).

One call = one request to VS Code, written as a JSON file in ~/.livecode/inbox and answered in ~/.livecode/outbox
(extension/bridge.js). Prints the answer; exit code 0 = done, 2 = no window could take it (file not open there, or
the extension is not running), 1 = the window refused or failed.

  livecode see                                  what is on screen (every window), as a short summary; --json for all
  livecode read FILE [--lines 10 40]            the text as the editor holds it (unsaved changes included)
  livecode open FILE [--group 2|beside] [--line 212 | --lines 200 230] [--top] [--colour yellow]
  livecode open NB.ipynb [--cell-id fig1]
  livecode scroll FILE --line 212 | --lines 200 230 [--top] [--select]
  livecode scroll NB.ipynb --cell-id fig1 | --index 3
  livecode close FILE... | --mine [--save | --force]
  livecode split [--group 1] [--down]           a new empty area beside (or under) that one
  livecode close-group 2 [--force]
  livecode focus 2                              the one command that moves Sami's cursor
  livecode move FILE --to 2
  livecode layout '{"orientation": "columns", "groups": [{}, {"groups": [{}, {}]}]}'
  livecode setup save NAME | restore NAME | list
  livecode colour FILE --lines 10 14 [40 40 ...] | --spans 12 5 18 | --pattern 'F\\.interpolate' [--colour c] [--layer L] [--add]
  livecode colour NB.ipynb --cell-id fig1 --lines 1 3
  livecode clear [FILE] [--layer L]
  livecode edit FILE (--lines 10 14 | --at 57 | --at end | --all) (--text '...' | --text-file F) [--whole | --stream] [--no-colour] [--save] [--force]
  livecode save FILE
  livecode cells NB.ipynb [--brief]              ids, types, sources (--brief: first line of each)
  livecode cell replace NB.ipynb --cell-id X (--source '...' | --source-file F) [--no-run]
  livecode cell insert  NB.ipynb [--after-id Y | --after-index 2 | --at-end] --cell-id X [--type markdown] (--source ... )
  livecode cell delete  NB.ipynb --cell-id X;   livecode cell run NB.ipynb --cell-id X
  livecode kernel NB.ipynb [--match als-nb | --python /path/bin/python | --id ID]
        attaches the kernel: one picked before whose id matches (default match: the notebook's kernelspec name, or its
        display name's kernelspec), else the one for that kernelspec's or --python's interpreter (id built as the
        Jupyter extension builds it); the picker only if none of that works
  livecode raw '{"op": "...", ...}'               any request as JSON
Common, before or after the command: --window NAME (that VS Code window), --timeout S, --json (raw answer).
All paths are made absolute from the current directory.
"""
import argparse
import glob
import json
import os
import sys
import time
import uuid

ROOT = os.path.expanduser("~/.livecode")
KERNELSPECS = os.path.expanduser("~/Library/Jupyter/kernels")


# ------------------------------------------------------------------ sending and waiting

def tidy():
    """Answers nobody read (a slow second window) and claimed requests older than a day are removed."""
    now = time.time()
    for d, age in (("outbox", 3600), ("done", 86400)):
        for f in glob.glob(os.path.join(ROOT, d, "*.json")):
            try:
                if now - os.path.getmtime(f) > age:
                    os.remove(f)
            except OSError:
                pass


def send(req, timeout, broadcast=False):
    for d in ("inbox", "outbox", "done"):
        os.makedirs(os.path.join(ROOT, d), exist_ok=True)
    tidy()
    name = f"{time.strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:6]}.json"
    req["sent_at"] = time.time()
    req["ttl_s"] = timeout + 5                                   # a window that finds it later than this does not run it
    if broadcast:
        req["broadcast"] = True
    tmp = os.path.join(ROOT, name + ".tmp")
    with open(tmp, "w") as fh:
        json.dump(req, fh)
    inbox = os.path.join(ROOT, "inbox", name)
    os.replace(tmp, inbox)                                      # appears whole, never half-written
    t0 = time.time()
    if broadcast:                                               # every window answers; collect for a moment
        answers, first = {}, None
        while time.time() - t0 < timeout and (first is None or time.time() - first < 1.5):
            for f in glob.glob(os.path.join(ROOT, "outbox", name[:-5] + ".*.json")):
                if f not in answers:
                    try:
                        answers[f] = json.load(open(f))
                        first = first or time.time()
                    except json.JSONDecodeError:
                        pass
            time.sleep(0.1)
        _remove(inbox)
        for f in answers:
            _remove(f)
        return list(answers.values()) or [dict(ok=False, error="no_window", note="no VS Code window answered: extension not running?")]
    out = os.path.join(ROOT, "outbox", name)
    done = os.path.join(ROOT, "done", name)
    claimed = False
    while time.time() - t0 < timeout:
        if not claimed and (not os.path.exists(inbox) or os.path.exists(done)):
            claimed = True
        if not claimed and time.time() - t0 > 2.5:
            break                                               # nobody took it
        if os.path.exists(out):
            try:
                res = json.load(open(out))
            except json.JSONDecodeError:
                time.sleep(0.05)
                continue
            _remove(out)
            return res
        time.sleep(0.1)
    if not claimed:
        _remove(inbox)
        return dict(ok=False, error="no_window", request=req,
                    note="no VS Code window took it: the file is not open in any window (is the path right?), or the extension is not running")
    return dict(ok=False, error="timeout", request=req, note=f"a window took it but had not answered after {timeout:.0f}s")


def _remove(p):
    try:
        os.remove(p)
    except FileNotFoundError:
        pass


# ------------------------------------------------------------------ the "see" summary (short, for reading in chat)

def summarise_see(windows):
    lines = []
    for w in windows:
        if not w.get("ok"):
            lines.append(f"!! {w.get('error')}: {w.get('note', '')}")
            continue
        lines.append(f"[{w['window']}] {'focused' if w.get('focused') else 'not focused'}")
        for g in w.get("groups", []):
            tabs = "  ".join(f"{t['label']}{'*' if t.get('dirty') else ''}{' <' if t.get('active') else ''}" for t in g["tabs"]) or "(empty)"
            lines.append(f"  area {g['group']}{'*' if g.get('active') else ' '}{' (chat)' if g.get('chat') else ''} {tabs}")
            v = g.get("view")
            if v and "file" in v:
                vis = f"lines {v['visible'][0]}-{v['visible'][1]} of {v['lines']}" if v.get("visible") else f"{v['lines']} lines"
                sel = f", selected {v['selection'][0][0]}-{v['selection'][1][0]}" if v.get("selection") else ""
                lines.append(f"       {os.path.basename(v['file'])} {vis}, cursor {v['cursor'][0]}:{v['cursor'][1]}{sel}")
            elif v and "notebook" in v:
                vc = v.get("visible_cells") or ["?", "?"]
                lines.append(f"       {os.path.basename(v['notebook'])} cells {vc[0]}-{vc[1]} of {v['cells']}, selected cell {v.get('selected_cell')}")
        if w.get("typed_seconds_ago"):
            lines.append("  typed: " + ", ".join(f"{os.path.basename(f)} {s}s ago" for f, s in w["typed_seconds_ago"].items()))
        if w.get("coloured"):
            lines.append("  coloured: " + "; ".join(f"{os.path.basename(f)} " + ", ".join(f"{l} {v['colour']} x{v['spans']}" for l, v in layers.items())
                                                     for f, layers in w["coloured"].items()))
        if w.get("history"):
            lines.append("  last: " + ", ".join(f"{h['op']}{'' if h.get('ok') else '!'} {os.path.basename(h['file']) if h.get('file') else ''}".strip() for h in w["history"][-5:]))
    return "\n".join(lines)


# ------------------------------------------------------------------ kernels

def kernel_ids(match):
    """Controller ids of kernels Sami has picked before, from VS Code's own state databases (read on copies, so
    a running VS Code is never disturbed). The Jupyter extension's ids carry the interpreter path, so a venv
    name like "als-nb" picks it out."""
    import glob as g, re, shutil, sqlite3, tempfile
    base = os.path.expanduser("~/Library/Application Support/Code/User")
    ids = set()
    for db in g.glob(os.path.join(base, "workspaceStorage", "*", "state.vscdb")) + [os.path.join(base, "globalStorage", "state.vscdb")]:
        if not os.path.exists(db):
            continue
        tmp = os.path.join(tempfile.gettempdir(), "livecode_state.vscdb")
        shutil.copy(db, tmp)
        con = sqlite3.connect(tmp)
        for _, v in con.execute("select key, value from ItemTable where key in ('notebook.controller2NotebookBindings', 'notebook.kernelHistory')"):
            s = v if isinstance(v, str) else v.decode("utf8", "replace")
            ids.update(re.findall(r'ms-toolsai\.jupyter/([^"\]]+)', s))
        con.close()
    return sorted(i for i in ids if match in i)


def kernel_id_for_python(python):
    """The Jupyter extension's controller id for a Python interpreter, built the way the extension builds it (checked
    against VS Code's stored ids on 2026-10-14): ".jvsc74a57bd0" + sha256(path) + "." + path + "." + path +
    ".-m#ipykernel_launcher", where path has "/bin/python" shortened to "/python". So a kernel never picked before
    can still be attached by name, as long as the Jupyter extension has found that environment."""
    import hashlib, re
    path = re.sub(r"/bin/python[0-9.]*$", "/python", python)
    return f".jvsc74a57bd0{hashlib.sha256(path.encode()).hexdigest()}.{path}.{path}.-m#ipykernel_launcher"


def kernelspec_python(name=None, display_name=None):
    """argv[0] of the registered kernelspec with that name, or with that display name."""
    for spec in glob.glob(os.path.join(KERNELSPECS, "*", "kernel.json")):
        try:
            k = json.load(open(spec))
        except (OSError, ValueError):
            continue
        if (name and os.path.basename(os.path.dirname(spec)) == name) or (display_name and k.get("display_name") == display_name):
            return k["argv"][0]
    return None


def kernel_request(a):
    r = dict(op="kernel", notebook=os.path.abspath(a.notebook))
    if a.id:
        r["id"] = a.id
        return r
    if a.python:
        r["id"] = kernel_id_for_python(os.path.abspath(a.python))
        return r
    name, display = a.match, None
    if not name:
        try:
            ks = json.load(open(a.notebook))["metadata"]["kernelspec"]
            name, display = ks.get("name"), ks.get("display_name")
        except (OSError, KeyError, ValueError):
            pass
    generic = name in (None, "python", "python3")
    found = kernel_ids(name) if name and not generic else []
    if len(found) == 1:
        r["id"] = found[0]
    elif len(found) > 1:
        r["note"] = f"{len(found)} kernels match {name!r}; pass --id or --python"
        r["candidates"] = found
    else:
        python = kernelspec_python(name=None if generic else name, display_name=display)
        if python:
            r["id"] = kernel_id_for_python(python)
            r["note"] = f"id built from the kernelspec for {display or name!r} ({python})"
        else:
            r["note"] = f"no kernel known for {display or name!r}: opening the picker"
    return r


# ------------------------------------------------------------------ command line

def build(argv):
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--window", default=argparse.SUPPRESS)
    common.add_argument("--timeout", type=float, default=argparse.SUPPRESS)
    common.add_argument("--json", action="store_true", default=argparse.SUPPRESS)
    ap = argparse.ArgumentParser(prog="livecode", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter, parents=[common])
    ap.set_defaults(window=None, timeout=None, json=False)
    sub = ap.add_subparsers(dest="cmd", required=True)

    def P(name):
        return sub.add_parser(name, parents=[common])       # so --window/--timeout/--json work after the command too

    P("see")
    p = P("read"); p.add_argument("file"); p.add_argument("--lines", nargs=2, type=int); p.add_argument("--cell-id")
    p = P("open"); p.add_argument("file"); p.add_argument("--group"); p.add_argument("--line", type=int); p.add_argument("--lines", nargs=2, type=int)
    p.add_argument("--top", action="store_true"); p.add_argument("--colour"); p.add_argument("--preview", action="store_true"); p.add_argument("--cell-id"); p.add_argument("--index", type=int)
    p = P("scroll"); p.add_argument("file"); p.add_argument("--line", type=int); p.add_argument("--lines", nargs=2, type=int)
    p.add_argument("--top", action="store_true"); p.add_argument("--select", action="store_true"); p.add_argument("--cell-id"); p.add_argument("--index", type=int)
    p = P("close"); p.add_argument("files", nargs="*"); p.add_argument("--mine", action="store_true"); p.add_argument("--save", action="store_true"); p.add_argument("--force", action="store_true")
    p = P("split"); p.add_argument("--group", type=int); p.add_argument("--down", action="store_true")
    p = P("close-group"); p.add_argument("group", type=int); p.add_argument("--force", action="store_true")
    p = P("focus"); p.add_argument("group", type=int)
    p = P("move"); p.add_argument("file"); p.add_argument("--to", type=int, required=True)
    p = P("layout"); p.add_argument("grid")
    p = P("setup"); p.add_argument("action", choices=["save", "restore", "list"]); p.add_argument("name", nargs="?")
    p = P("colour"); p.add_argument("file"); p.add_argument("--lines", nargs="+", type=int); p.add_argument("--spans", nargs="+", type=int)
    p.add_argument("--pattern"); p.add_argument("--colour", dest="col"); p.add_argument("--layer"); p.add_argument("--add", action="store_true"); p.add_argument("--cell-id"); p.add_argument("--index", type=int)
    p = P("clear"); p.add_argument("file", nargs="?"); p.add_argument("--layer"); p.add_argument("--cell-id")
    p = P("edit"); p.add_argument("file"); p.add_argument("--lines", nargs=2, type=int); p.add_argument("--at"); p.add_argument("--all", action="store_true")
    p.add_argument("--text"); p.add_argument("--text-file"); p.add_argument("--whole", action="store_true"); p.add_argument("--stream", action="store_true")
    p.add_argument("--no-colour", action="store_true"); p.add_argument("--colour", dest="col"); p.add_argument("--save", action="store_true"); p.add_argument("--force", action="store_true")
    p.add_argument("--ms-per-line", type=int)
    p = P("save"); p.add_argument("file")
    p = P("cells"); p.add_argument("notebook"); p.add_argument("--brief", action="store_true")
    p = P("cell"); p.add_argument("action", choices=["replace", "insert", "delete", "run"]); p.add_argument("notebook")
    p.add_argument("--cell-id"); p.add_argument("--index", type=int); p.add_argument("--after-id"); p.add_argument("--after-index", type=int); p.add_argument("--at-end", action="store_true")
    p.add_argument("--type", default="code", choices=["code", "markdown"]); p.add_argument("--source"); p.add_argument("--source-file"); p.add_argument("--no-run", action="store_true")
    p = P("kernel"); p.add_argument("notebook"); p.add_argument("--id"); p.add_argument("--python", help="interpreter of the environment to use"); p.add_argument("--match", help="text in the kernel id, e.g. the venv name")
    p = P("raw"); p.add_argument("json")
    return ap.parse_args(argv)


def cell_ref(a):
    """{"cell_id": ...} or {"index": ...}, whichever was given (never both, never null)."""
    if getattr(a, "cell_id", None) is not None:
        return {"cell_id": a.cell_id}
    if getattr(a, "index", None) is not None:
        return {"index": a.index}
    return {}


def request(a):
    """The request for the parsed command line, plus the default timeout and whether it is a broadcast."""
    A = os.path.abspath
    c = a.cmd
    if c == "see":
        return dict(op="see"), 4, True
    if c == "read":
        r = dict(op="read", **({"notebook": A(a.file), "cell_id": a.cell_id} if a.cell_id else {"file": A(a.file)}))
        if a.lines: r["lines"] = a.lines
        return r, 8, False
    if c == "open":
        r = dict(op="open", file=A(a.file), where="top" if a.top else "center", preview=a.preview, **cell_ref(a))
        if a.group: r["group"] = int(a.group) if a.group.isdigit() else a.group
        if a.line: r["line"] = a.line
        if a.lines: r["lines"] = a.lines
        if a.colour: r["colour"] = a.colour
        return r, 15, False
    if c == "scroll":
        if cell_ref(a):
            return dict(op="scroll", notebook=A(a.file), **cell_ref(a)), 8, False
        if not a.line and not a.lines:
            raise SystemExit("scroll: give --line or --lines (or --cell-id for a notebook)")
        r = dict(op="scroll", file=A(a.file), where="top" if a.top else "center", select=a.select)
        if a.line: r["line"] = a.line
        if a.lines: r["lines"] = a.lines
        return r, 8, False
    if c == "close":
        if not a.files and not a.mine:
            raise SystemExit("close: give files or --mine")
        return dict(op="close", files=[A(f) for f in a.files], mine=a.mine, save=a.save, force=a.force), 15, False
    if c == "split":
        return dict(op="split", group=a.group, direction="down" if a.down else "right"), 8, False
    if c == "close-group":
        return dict(op="close_group", group=a.group, force=a.force), 15, False
    if c == "focus":
        return dict(op="focus", group=a.group), 8, False
    if c == "move":
        return dict(op="move", file=A(a.file), to=a.to), 15, False
    if c == "layout":
        return dict(op="layout", grid=json.loads(a.grid)), 8, False
    if c == "setup":
        if a.action == "list": return dict(op="setups"), 8, False
        if not a.name: raise SystemExit("setup: give a name")
        return dict(op=f"{a.action}_setup", name=a.name), 30, False
    if c == "colour":
        r = dict(op="colour", layer=a.layer or "main", add=a.add)
        r.update({"notebook": A(a.file), **cell_ref(a)} if cell_ref(a) else {"file": A(a.file)})
        if a.lines: r["lines"] = [a.lines[i:i + 2] for i in range(0, len(a.lines) - 1, 2)]
        if a.spans: r["spans"] = [a.spans[i:i + 3] for i in range(0, len(a.spans) - 2, 3)]
        if a.pattern: r["pattern"] = a.pattern
        if a.col: r["colour"] = a.col
        if not (a.lines or a.spans or a.pattern): raise SystemExit("colour: give --lines, --spans or --pattern")
        return r, 8, False
    if c == "clear":
        r = dict(op="clear")
        if a.file: r.update({"notebook": A(a.file), "cell_id": a.cell_id} if a.cell_id else {"file": A(a.file)})
        if a.layer: r["layer"] = a.layer
        return r, 8, False
    if c == "edit":
        if a.text is None and not a.text_file: raise SystemExit("edit: give --text or --text-file")
        text = open(a.text_file).read() if a.text_file else a.text
        r = dict(op="edit", file=A(a.file), text=text, save=a.save, force=a.force)
        if a.lines: r["lines"] = a.lines
        if a.at: r["at"] = "end" if a.at == "end" else int(a.at)
        if a.all: r["all"] = True
        if a.whole: r["stream"] = False
        if a.stream: r["stream"] = True
        if a.no_colour: r["colour"] = False
        elif a.col: r["colour"] = a.col
        if a.ms_per_line is not None: r["ms_per_line"] = a.ms_per_line
        return r, 120, False
    if c == "save":
        return dict(op="save", file=A(a.file)), 15, False
    if c == "cells":
        return dict(op="cells", notebook=A(a.notebook), brief=a.brief), 8, False
    if c == "cell":
        r = dict(op=f"cell_{a.action}", notebook=A(a.notebook), **cell_ref(a))
        for k in ("after_id", "after_index"):
            if getattr(a, k) is not None: r[k] = getattr(a, k)
        if a.at_end: r["at_end"] = True
        if a.action in ("replace", "insert"):
            if a.source is None and not a.source_file: raise SystemExit("cell: give --source or --source-file")
            r["source"] = open(a.source_file).read().rstrip("\n") if a.source_file else a.source
            r["cell_type"] = a.type
            if a.no_run or a.type == "markdown": r["run"] = False
        runs = a.action == "run" or (a.action in ("replace", "insert") and not a.no_run and a.type == "code")
        r["timeout_s"] = 900 if runs else 8
        return r, 900 if runs else 8, False
    if c == "kernel":
        r = kernel_request(a)
        if "candidates" in r:
            print(json.dumps(r)); sys.exit(1)
        return r, 15, False
    if c == "raw":
        r = json.loads(a.json)
        return r, r.pop("timeout", 30), bool(r.get("broadcast"))
    raise SystemExit(f"unknown command {c}")


def main():
    a = build(sys.argv[1:])
    req, timeout, broadcast = request(a)
    if a.window: req["window"] = a.window
    res = send(req, a.timeout or timeout, broadcast)
    if broadcast:
        print(json.dumps(res, indent=1) if a.json else summarise_see(res))
        sys.exit(0 if any(r.get("ok") for r in res) else 2)
    for k in ("request", "pid"):
        res.pop(k, None)
    print(json.dumps(res, indent=1 if a.json else None))
    sys.exit(0 if res.get("ok") else (2 if res.get("error") in ("no_window", "not_open") else 1))


if __name__ == "__main__":
    main()
