#!/usr/bin/env python3
"""Cowork documentation build (Python standard library only; not an application script).

Usage, from the repository root:
    python3 docs/reviews/cowork/tools/build_pack.py            # write generated sections and outputs
    python3 docs/reviews/cowork/tools/build_pack.py --check    # compare only; exit 1 if anything is stale
    python3 docs/reviews/cowork/tools/build_pack.py --root DIR # operate on another checkout (used by tests)

Generated outputs (all derived from source files; edit the sources, not the outputs):
  * docs/prototype/UX_BRIEF.md        sections status-copy, state-copy       <- docs/ux/UI_COPY.json
  * docs/prototype/DEMO_SCRIPT.md     section demo-steps                     <- docs/demo/demo_steps.json
  * docs/demo/LEADERSHIP_HANDOVER.md  sections handover-*                    <- EVIDENCE_INDEX.json, DELIVERY_STATUS.json
  * docs/demo/index.html              offline documentation pack             <- all of the above + FINDINGS.csv, CLAIMS_REGISTER.md
  * docs/reviews/cowork/GENERATED_MANIFEST.json  hashes of every input and output

The build is deterministic: its only timestamp is DELIVERY_STATUS.json "as_of".
It never writes Work's canonical tracking files and never decides readiness; it displays the
readiness value and quotation that DELIVERY_STATUS.json cites from CURRENT_STATE.md.
"""
import argparse, csv, hashlib, html, io, json, re, sys
from pathlib import Path

TOOLS = Path(__file__).resolve().parent
OUT_UX = "docs/prototype/UX_BRIEF.md"
OUT_SCRIPT = "docs/prototype/DEMO_SCRIPT.md"
OUT_HANDOVER = "docs/demo/LEADERSHIP_HANDOVER.md"
OUT_HTML = "docs/demo/index.html"
OUT_MANIFEST = "docs/reviews/cowork/GENERATED_MANIFEST.json"
INPUTS = ["docs/ux/UI_COPY.json", "docs/demo/demo_steps.json", "docs/demo/EVIDENCE_INDEX.json",
          "docs/reviews/cowork/DELIVERY_STATUS.json", "docs/reviews/cowork/FINDINGS.csv", "docs/demo/CLAIMS_REGISTER.md",
          "docs/reviews/cowork/tools/pack.css", "docs/reviews/cowork/tools/build_pack.py"]
CONTEXT_SOURCES = ["AGENTS.md", "CURRENT_STATE.md", "docs/prototype/EXECUTION_PLAN.md", "docs/prototype/CONTRACT.md",
                   "docs/prototype/ACCEPTANCE.md", "docs/prototype/FILE_OWNERSHIP.md", "docs/decisions/ADR-001-prototype-profile.md",
                   "tracking/tasks.json", "tracking/acceptance.json", "packages/contracts/src/index.ts",
                   "docs/ux/ACCEPTANCE_JOURNEYS.md", "docs/runbooks/OPERATOR.md", "docs/prototype/RELEASE_CHECKLIST.md"]

AXES = [("Consent", "consent", ["NOT_GIVEN", "GRANTED", "WITHDRAWN"], "design 0.1.0"),
        ("Workflow", "workflow", ["ACCEPTED", "RUNNING", "NEEDS_ATTENTION", "COMPLETED"], "design 0.1.0"),
        ("Action status (what was sent and what the system replied)", "action",
         ["PENDING", "RUNNING", "ACKNOWLEDGED", "EFFECT_UNKNOWN", "FAILED", "MANUAL_REQUIRED", "SKIPPED"], "design 0.1.0"),
        ("Observation (what ORVIA read separately)", "observation",
         ["NOT_CHECKED", "OBSERVED_SATISFIED", "OBSERVED_NOT_SATISFIED", "UNVERIFIABLE", "STALE"], "design 0.1.0"),
        ("Reconciliation record (0.2.0 proposal, pending W00)", "reconciliation",
         ["PENDING", "RECONCILING", "RESOLVED", "INCONCLUSIVE", "FAILED"], "proposal 0.2.0"),
        ("Processing decision", "decision", ["ALLOW", "BLOCK", "INDETERMINATE"], "design 0.1.0"),
        ("Test result", "test", ["NOT_RUN", "RUNNING", "PASS", "FAIL", "ERROR", "SKIPPED"], "design 0.1.0")]
ICON = {"NOT_GIVEN": "○", "GRANTED": "●", "WITHDRAWN": "–", "ACCEPTED": "○", "RUNNING": "◐", "NEEDS_ATTENTION": "!",
        "COMPLETED": "✓", "PENDING": "○", "ACKNOWLEDGED": "↩", "EFFECT_UNKNOWN": "?", "FAILED": "✕",
        "MANUAL_REQUIRED": "✎", "SKIPPED": "–", "NOT_CHECKED": "○", "OBSERVED_SATISFIED": "✓",
        "OBSERVED_NOT_SATISFIED": "!", "UNVERIFIABLE": "?", "STALE": "◷", "ALLOW": "✓", "BLOCK": "✕",
        "INDETERMINATE": "?", "NOT_RUN": "○", "PASS": "✓", "FAIL": "✕", "ERROR": "!", "RECONCILING": "◐",
        "RESOLVED": "✓", "INCONCLUSIVE": "?"}
TONE = {"OBSERVED_SATISFIED": "ok", "COMPLETED": "ok", "PASS": "ok", "ALLOW": "ok", "RESOLVED": "ok",
        "EFFECT_UNKNOWN": "warn", "NEEDS_ATTENTION": "warn", "STALE": "warn", "INDETERMINATE": "warn",
        "UNVERIFIABLE": "warn", "INCONCLUSIVE": "warn", "FAILED": "bad", "FAIL": "bad", "ERROR": "bad",
        "BLOCK": "bad", "OBSERVED_NOT_SATISFIED": "bad", "MANUAL_REQUIRED": "manual", "ACKNOWLEDGED": "info"}
PILL = {"MISSING": "bad", "NOT_IMPLEMENTED": "bad", "NOT_RUN": "neutral", "BLOCKED": "bad", "NOT_READY": "bad",
        "OPEN": "warn", "PARTIALLY_RESOLVED": "info", "RESOLVED": "ok", "RESOLVED_PENDING_REVIEW": "info",
        "NOT_EVIDENCED": "warn", "NOT_PERMITTED": "bad", "UNRESOLVED": "warn", "REVISED_FOR_REVIEW": "info",
        "PARTIAL_BLOCKED": "warn", "PREPARED_NOT_FROZEN": "warn", "MISSING_EVIDENCE": "bad", "NOT_SELECTED": "neutral",
        "INSPECTED": "ok", "HISTORICAL": "neutral", "CURRENT": "info", "NOT_ASSESSED": "neutral",
        "EVIDENCED": "ok", "IMPLEMENTED": "info", "INSPECTED_FOR_CONSISTENCY_ONLY": "info"}
SEVERITY = ["BLOCKER", "HIGH", "MEDIUM", "LOW"]
esc = lambda s: html.escape("" if s is None else str(s), quote=True)
sha = lambda b: hashlib.sha256(b).hexdigest()


class Sources:
    def __init__(self, root):
        self.root = Path(root)
        r = lambda p: (self.root / p).read_text(encoding="utf-8")
        self.copy = json.loads(r("docs/ux/UI_COPY.json"))
        self.C = {e["id"]: e for e in self.copy["entries"]}
        self.steps = json.loads(r("docs/demo/demo_steps.json"))
        self.ev = json.loads(r("docs/demo/EVIDENCE_INDEX.json"))
        self.status = json.loads(r("docs/reviews/cowork/DELIVERY_STATUS.json"))
        self.findings = list(csv.DictReader(io.StringIO(r("docs/reviews/cowork/FINDINGS.csv"))))
        self.claims = parse_claims(r("docs/demo/CLAIMS_REGISTER.md"))
        self.css = r("docs/reviews/cowork/tools/pack.css")

    def text(self, i):
        return self.C[i]["text"] if i in self.C else f"[missing copy id {i}]"

    def current_inspection(self):
        cur = self.ev["current_source_inspection_id"]
        return next(s for s in self.ev["source_inspections"] if s["evidence_id"] == cur)


def parse_claims(md):
    out = []
    for line in md.splitlines():
        m = re.match(r"^\| (CL-\d\d) \| (.*) \|$", line)
        if m:
            c = [x.strip() for x in m.group(2).split(" | ")]
            if len(c) >= 7:
                out.append(dict(id=m.group(1), area=c[0], wording=c[1], scope=c[2], tests=c[3], status=c[4], limitation=c[5], avoid=c[6]))
    return out


def md_cell(s):
    return str(s).replace("|", "\\|").replace("\n", " ")


def splice(src, marker, body, path):
    pat = re.compile(rf"(<!-- BEGIN GENERATED: {marker} -->\n).*?(<!-- END GENERATED: {marker} -->)", re.S)
    if not pat.search(src):
        raise SystemExit(f"marker {marker} not found in {path}")
    return pat.sub(lambda m: m.group(1) + body + m.group(2), src)


def summary_counts(ev):
    """Counts derived from the underlying records (the validator compares them with ev['summary'])."""
    te = ev["test_evidence"]
    cand = ev.get("frozen_candidate", {}).get("commit")
    recs = [r for t in te for r in t.get("records", [])]
    media = ev.get("media", [])
    eng = ev.get("engineering_reports", {}).get("records", [])
    return {
        "p0_total": sum(t["priority"] == "P0" for t in te),
        "p0_with_records": sum(1 for t in te if t["priority"] == "P0" and t.get("records")),
        "p0_with_inspected_pass_on_candidate": sum(1 for t in te if t["priority"] == "P0" and any(
            r.get("review_status") == "INSPECTED" and r.get("observed_result") == "PASS" and cand and r.get("code_under_test_commit") == cand
            for r in t.get("records", []))),
        "p1_selected": sum(1 for t in te if t["priority"] == "P1" and t.get("selected")),
        "records": len(recs),
        "screenshots": sum(m.get("kind") == "SCREENSHOT" for m in media),
        "recordings": sum(m.get("kind") == "RECORDING" for m in media),
        "browser_traces": sum(m.get("kind") == "BROWSER_TRACE" for m in media),
        "rehearsals_completed": len(ev.get("rehearsals", [])),
        "engineering_reports": len(eng),
        "engineering_reports_nonzero_exit": sum(1 for r in eng if r.get("exit_code") not in (0, None)),
    }


# ---------------- Markdown sections ----------------
def ux_status_copy(S):
    out = []
    for title, key, vals, basis in AXES:
        out += [f"### {title}", "", "| Stored value | Badge | Detail | Copy IDs | Binding |", "|---|---|---|---|---|"]
        for v in vals:
            lab = f"state.{key}.{v}.label"
            det = f"state.{key}.{v}.detail" if f"state.{key}.{v}.detail" in S.C else f"state.{key}.{v}.portal"
            ub = sorted({S.C[x]["finding_ref"] for x in (lab, det) if x in S.C and S.C[x]["binding_status"] == "UNRESOLVED"})
            b = ("UNRESOLVED " + ", ".join(ub)) if ub else basis
            out.append(f"| `{v}` | {ICON.get(v, '')} {md_cell(S.text(lab))} | {md_cell(S.text(det))} | `{lab}`, `{det}` | {b} |")
        out.append("")
    out += ["### Principal consent lines", "", "| Stored value | Privacy Centre text | Copy ID |", "|---|---|---|"]
    for v in ["NOT_GIVEN", "GRANTED", "WITHDRAWN"]:
        out.append(f"| `{v}` | {md_cell(S.text(f'state.consent.{v}.portal'))} | `state.consent.{v}.portal` |")
    out += ["", "### Supplementary status lines", "", "| Copy ID | Text | Binding |", "|---|---|---|"]
    for e in S.copy["entries"]:
        if e["screen"] == "STATUS" and not re.match(r"state\.[a-z]+\.[A-Z_]+\.(label|detail|portal)$", e["id"]):
            b = f"UNRESOLVED {e['finding_ref']}" if e["binding_status"] == "UNRESOLVED" else "design 0.1.0"
            out.append(f"| `{e['id']}` | {md_cell(e['text'])} | {b} |")
    out.append("")
    return "\n".join(out) + "\n"


def ux_state_copy(S):
    out = ["| Copy ID | Audience | Semantic state | Text | Binding |", "|---|---|---|---|---|"]
    for e in S.copy["entries"]:
        if e["id"].startswith(("error.", "permission.", "recovery.", "global.loading", "global.count")) or e["element"] == "empty":
            b = f"UNRESOLVED {e['finding_ref']}" if e["binding_status"] == "UNRESOLVED" else "design 0.1.0"
            if (e.get("unresolved_binding") or "").startswith("CONDITIONAL"):
                b = f"CONDITIONAL — do not display ({e['finding_ref']})"
            st = e["semantic_state"] or ("EMPTY" if e["element"] == "empty" else "")
            out.append(f"| `{e['id']}` | {e['audience']} | {st} | {md_cell(e['text'])} | {b} |")
    return "\n".join(out) + "\n"


def script_steps(S):
    out = []
    for s in S.steps["steps"]:
        out += [f"### Step {s['step']}. {s['title']}", "", "| Field | Content |", "|---|---|",
                f"| Actor | {md_cell(s['actor'])} |",
                f"| Precondition | {md_cell(s['precondition'])} |",
                f"| Screen / action | {md_cell(s['screen'])} — **{s['screen_status']}** · {md_cell(s['action'])} |",
                f"| Expected observable fact | {md_cell(s['expected_fact'])} |",
                f"| Evidence needed (mandatory tests) | {', '.join(s['tests'])}: {md_cell(s['evidence_needed'])} — **{s['evidence_status']}** |",
                f"| Presenter words | “{md_cell(s['presenter_words'])}” |",
                f"| Honest fallback | {md_cell(s['fallback'])} |",
                f"| Limitation to state | {md_cell(s['limitation'])} |", ""]
    return "\n".join(out)


def handover_readiness(S):
    st, ci, cnt = S.status, S.current_inspection(), summary_counts(S.ev)
    cr, pr, cand = st["canonical_readiness"], st["production_readiness"], st["candidate"]
    rows = [
        ("Documentation base", f"`{st['documentation_base_commit'][:7]}` (current source inspection {ci['evidence_id']}, {ci['performed_at']})"),
        ("Application at that base", ci["observed"].get("application_scope_note", "—")),
        ("Internal-demo readiness", f"**{cr['value']}**. Source: `{cr['source_path']}` @ `{cr['source_commit'][:7]}`, quoted: “{cr['quoted_text']}”. Owner: {cr['owner']}."),
        ("Production readiness", f"**{pr['value']}**. Source: `{pr['source_path']}`, quoted: “{pr['quoted_text']}”."),
        ("Frozen candidate", f"{cand['status']}" + (f" `{cand['commit']}`" if cand.get("commit") else "")),
        ("P0 scenarios with an inspected PASS on the candidate", f"{cnt['p0_with_inspected_pass_on_candidate']} of {cnt['p0_total']} (records indexed: {cnt['records']})"),
        ("Engineering reports indexed (not acceptance)", f"{cnt['engineering_reports']} ({cnt['engineering_reports_nonzero_exit']} with non-zero exit, retained)"),
        ("Presentation deadline", "See F-015 in FINDINGS.csv"),
    ]
    out = [f"As of {st['as_of']} (DELIVERY_STATUS.json).", "", "| Question | Answer |", "|---|---|"]
    out += [f"| {a} | {md_cell(b)} |" for a, b in rows]
    return "\n".join(out) + "\n"


GROUPS = [("Start, bootstrap, isolation, roles", 1, 5), ("Configuration and consent", 6, 10),
          ("Workflow, commands, CRM, admission, policy", 11, 16), ("Uncertainty, failure, manual", 17, 20),
          ("Evidence and export", 21, 22), ("Regression and recovery", 23, 25), ("Egress, hygiene, reset", 26, 28),
          ("Browser flow and repeatability", 29, 30)]


def handover_evidence(S):
    cand = S.ev.get("frozen_candidate", {}).get("commit")
    te = {t["test_id"]: t for t in S.ev["test_evidence"]}
    out = ["| Area | Tests | Canonical status (Work) | With records | Inspected PASS on candidate |", "|---|---|---|---|---|"]
    tot = [0, 0, 0]
    for name, a, b in GROUPS:
        ids = [f"T{i:02d}" for i in range(a, b + 1)]
        canon = sorted({te[i]["canonical_status"]["value"] for i in ids})
        wr = sum(1 for i in ids if te[i].get("records"))
        ip = sum(1 for i in ids if any(r.get("review_status") == "INSPECTED" and r.get("observed_result") == "PASS" and cand and r.get("code_under_test_commit") == cand for r in te[i].get("records", [])))
        tot[0] += len(ids); tot[1] += wr; tot[2] += ip
        out.append(f"| {name} | {ids[0]}–{ids[-1]} | {', '.join(canon)} | {wr} / {len(ids)} | {ip} / {len(ids)} |")
    out.append(f"| **Total P0** | **T01–T30** | — | **{tot[1]} / {tot[0]}** | **{tot[2]} / {tot[0]}** |")
    out += ["", "All T01–T30 are mandatory for the completed internal demo, including tests whose live narration is optional."]
    return "\n".join(out) + "\n"


def handover_media(S):
    cnt, media, reh = summary_counts(S.ev), S.ev.get("media", []), S.ev.get("rehearsals", [])
    out = [f"Indexed: {cnt['screenshots']} screenshots, {cnt['recordings']} recordings, {cnt['browser_traces']} browser traces, {cnt['rehearsals_completed']} completed rehearsals (EVIDENCE_INDEX.json)."]
    if media:
        out += ["", "| Media | Kind | Build | Captured | Live or recorded | Shows | Does not show |", "|---|---|---|---|---|---|---|"]
        out += [f"| `{m['path']}` | {m['kind']} | {m['build_id']} | {m['captured_at']} | {m['live_or_recorded']} | {md_cell(m['shows'])} | {md_cell(m['does_not_show'])} |" for m in media]
    if reh:
        out += ["", "| Rehearsal | Build | Started | Finished | Log |", "|---|---|---|---|---|"]
        out += [f"| {r['rehearsal_id']} | {r['build_id']} | {r['started_at']} | {r['finished_at']} | `{r['log_path']}` |" for r in reh]
    return "\n".join(out) + "\n"


# ---------------- HTML ----------------
def badge(v, label=None):
    return f'<span class="badge t-{TONE.get(v, "neutral")}"><span class="glyph" aria-hidden="true">{esc(ICON.get(v, "•"))}</span>{esc(label or v)}</span>'


def pill(s):
    key = re.split(r"[\s:(—]", s.replace("*", ""), maxsplit=1)[0] if s else ""
    return f'<span class="pill t-{PILL.get(key, "neutral")}">{esc(s.replace("**", ""))}</span>'


def table(head, rows, attrs=""):
    h = "".join(f'<th scope="col">{esc(x)}</th>' for x in head)
    return f'<div class="tablewrap"><table{attrs}><thead><tr>{h}</tr></thead><tbody>' + "".join(rows) + "</tbody></table></div>"


def build_html(S, source_hashes):
    st, ev, cnt, ci = S.status, S.ev, summary_counts(S.ev), S.current_inspection()
    of = [f for f in S.findings if f["status"] in ("OPEN", "PARTIALLY_RESOLVED")]
    screens = st["screens"]
    impl = sum(s["implementation"] == "IMPLEMENTED" for s in screens)
    unresolved = [e for e in S.copy["entries"] if e["binding_status"] == "UNRESOLVED"]
    H = []
    a = H.append
    a('<!doctype html>\n<html lang="en-GB">\n<head>\n<meta charset="utf-8">\n'
      '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
      '<meta name="referrer" content="no-referrer">\n'
      "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:\">\n"
      "<title>ORVIA Delivery Pack</title>\n<style>\n" + S.css + "</style>\n</head>\n<body>\n"
      '<a class="skip" href="#main">Skip to content</a>')
    a(f'<div class="docbar" role="note"><strong>Documentation only</strong>{esc(S.text("global.banner.documentation_only"))}</div>')
    toc = [("status", "Status at a glance"), ("provenance", "Base and provenance"), ("scenario", "Demo scenario"),
           ("readings", "Status copy"), ("bindings", "Open copy bindings"), ("screens", "Screens"), ("states", "Screen states"),
           ("evidence", "Acceptance evidence"), ("engineering", "Engineering reports"), ("claims", "Claims register"),
           ("findings", "Findings"), ("limits", "Limitations"), ("sources", "Sources")]
    a('<div class="shell"><nav class="toc" aria-label="Contents"><ol>' + "".join(f'<li><a href="#{i}">{esc(t)}</a></li>' for i, t in toc) + '</ol></nav><main id="main">')
    a(f'<header class="top"><p class="eyebrow">Cyberfyx · ORVIA Version 1 · internal prototype · Cowork lane C00–C02</p>'
      f'<h1>ORVIA prototype delivery pack</h1><p class="lede">Demo scenario, interface copy, claims, findings and evidence status for the ORVIA outcome-assurance prototype, compiled from the repository\'s Cowork documents. Nothing on this page is live: every figure is a count of documentation records, and readiness is quoted from its owner\'s file.</p>'
      f'<div class="meta"><span>Documentation base <code>{esc(st["documentation_base_commit"][:12])}</code></span><span>As of {esc(st["as_of"])}</span>'
      f'<span>Copy revision {esc(S.copy.get("revision"))}</span><span>Review status: {pill(S.copy.get("status", ""))}</span></div></header>')
    # status
    cr, pr, pub = st["canonical_readiness"], st["production_readiness"], st.get("publication", {})
    a('<section id="status" aria-labelledby="h-status"><h2 id="h-status">Status at a glance</h2><p class="intro">Readiness values are quoted from the file that owns them; counts are derived from indexed records.</p><div class="glance">')
    a(f'<div class="fact{" alert" if cr["value"] != "READY" else ""}"><div class="k">Internal demo readiness</div><div class="v">{esc(cr["value"])}</div><div class="n">Quoted from <code>{esc(cr["source_path"])}</code> @ {esc(cr["source_commit"][:7])}: <span class="quote">“{esc(cr["quoted_text"])}”</span></div></div>')
    a(f'<div class="fact{" alert" if cnt["p0_with_inspected_pass_on_candidate"] < cnt["p0_total"] else ""}"><div class="k">P0 with inspected PASS on candidate</div><div class="v">{cnt["p0_with_inspected_pass_on_candidate"]} of {cnt["p0_total"]}</div><div class="n">Candidate: {esc(st["candidate"]["status"])}. Test records indexed: {cnt["records"]}.</div></div>')
    a(f'<div class="fact"><div class="k">Open findings</div><div class="v">{len(of)}</div><div class="n">' + " · ".join(f"{sum(f['severity'] == s for f in of)} {s.lower()}" for s in SEVERITY) + f' · {len(S.findings) - len(of)} resolved or pending review</div></div>')
    a(f'<div class="fact"><div class="k">Screens specified / implemented</div><div class="v">{len(screens)} / {impl}</div><div class="n">From DELIVERY_STATUS.json (evidence {esc(screens[0]["evidence"] if screens else "—")}).</div></div>')
    a(f'<div class="fact"><div class="k">Screenshots · recordings · rehearsals</div><div class="v">{cnt["screenshots"]} · {cnt["recordings"]} · {cnt["rehearsals_completed"]}</div><div class="n">Indexed in EVIDENCE_INDEX.json. T30 needs two candidate rehearsals.</div></div>')
    a(f'<div class="fact"><div class="k">Production readiness</div><div class="v">{esc(pr["value"])}</div><div class="n">Quoted: <span class="quote">“{esc(pr["quoted_text"])}”</span></div></div>')
    a("</div><h3>Cowork tickets</h3>")
    a(table(["Ticket", "Canonical (Work)", "Cowork proposal", "Delivered", "Acceptance dependency"],
            [f"<tr><th scope='row'>{esc(t['id'])}</th><td>{pill(t['canonical_status'])}<br><span class='small'>{esc(t['canonical_source'])}</span></td><td>{pill(t['proposed_status'])}</td><td>{esc(t['delivered'])}</td><td>{esc(t['acceptance_dependency'])}</td></tr>" for t in st["tickets"]]))
    if pub:
        a(f'<p><strong>Publication:</strong> {pill(pub.get("status", ""))} {esc(pub.get("reason", ""))} ({esc(pub.get("finding", ""))})</p>')
    a("</section>")
    # provenance
    a('<section id="provenance" aria-labelledby="h-prov"><h2 id="h-prov">Base and provenance</h2><p class="intro">The current observation is marked; earlier observations stay visible as history.</p>')
    rows = []
    for s in ev["source_inspections"]:
        cur = s["evidence_id"] == ev["current_source_inspection_id"]
        kind = s.get("kind", "")
        tgt = s.get("commit") or (s.get("observed", {}).get("sha256", "")[:16] + "…")
        rows.append(f'<tr class="{"" if s.get("status") == "CURRENT" else "hist"}"><td><code>{esc(s["evidence_id"])}</code>{" <span class=current-tag>current base</span>" if cur else ""}</td><td>{esc(kind)}</td><td><code>{esc(tgt[:16])}</code></td><td>{esc(s["performed_at"])}</td><td>{pill(s.get("status", ""))}</td><td>{esc(s.get("limitations", ""))}</td></tr>')
    a(table(["Evidence", "Kind", "Commit / hash", "Performed", "Status", "Limits"], rows))
    ob = ci["observed"]
    a(f'<p>Current base <code>{esc(ci["commit"])}</code>: {ob.get("tracked_file_count")} tracked files. {esc(ob.get("application_scope_note", ""))} '
      f'Approved master in repository: <strong>{"yes" if ob.get("docs_source_master_present") else "no"}</strong>; capability register present: <strong>{"yes" if ob.get("tracking_capabilities_present") else "no"}</strong>; executable contract {esc(ob.get("executable_contract_version"))} ({esc(ob.get("executable_contract_review_status"))}).</p>')
    reg = st["capability_register"]
    a(f'<p><strong>Capability register:</strong> {"present" if reg["present"] else "absent"} at <code>{esc(reg["path"])}</code> ({esc(reg["finding"])}). {esc(reg.get("master_crosscheck", ""))}</p></section>')
    # scenario
    a('<section id="scenario" aria-labelledby="h-scn"><h2 id="h-scn">Demo scenario</h2><p class="intro">Fictional Aster Demo and Birch Demo. Every listed test is mandatory P0 evidence even where a beat is optional to show live.</p>')
    for s in S.steps["steps"]:
        a(f'<details class="step"{" open" if s["step"] == 4 else ""}><summary><span class="num">{s["step"]:02d}</span><span class="ttl">{esc(s["title"])}</span>{pill(s["screen_status"] + " screen")} {pill(s["evidence_status"] + " evidence")}</summary><dl>')
        for k, v in [("Actor", s["actor"]), ("Precondition", s["precondition"]), ("Screen", s["screen"]), ("Action", s["action"]),
                     ("Expected observable fact", s["expected_fact"]), ("Mandatory tests", ", ".join(s["tests"])), ("Evidence needed", s["evidence_needed"])]:
            a(f"<dt>{esc(k)}</dt><dd>{esc(v)}</dd>")
        a(f'<dt>Presenter words</dt><dd><blockquote>{esc(s["presenter_words"])}</blockquote></dd><dt>Honest fallback</dt><dd>{esc(s["fallback"])}</dd><dt>Limitation to state</dt><dd>{esc(s["limitation"])}</dd></dl></details>')
    a("</section>")
    # readings
    a(f'<section id="readings" aria-labelledby="h-read"><h2 id="h-read">Status copy</h2><p class="intro">{esc(S.text("workflow.explainer"))}</p><div class="tworead">')
    a(f'<div><h3>{esc(S.text("workflow.col.action"))}</h3><p class="small">{esc(S.text("workflow.col.action.tooltip"))}</p>{badge("ACKNOWLEDGED", S.text("state.action.ACKNOWLEDGED.label"))}<p>{esc(S.text("state.action.ACKNOWLEDGED.detail"))}</p></div>')
    a(f'<div><h3>{esc(S.text("workflow.col.observation"))}</h3><p class="small">{esc(S.text("workflow.col.observation.tooltip"))}</p>{badge("OBSERVED_SATISFIED", S.text("state.observation.OBSERVED_SATISFIED.label"))}<p>{esc(S.text("state.observation.OBSERVED_SATISFIED.detail"))}</p></div></div>')
    for title, key, vals, basis in AXES:
        rows = []
        for v in vals:
            lab = f"state.{key}.{v}.label"
            det = f"state.{key}.{v}.detail" if f"state.{key}.{v}.detail" in S.C else f"state.{key}.{v}.portal"
            un = sorted({S.C[x]["finding_ref"] for x in (lab, det) if x in S.C and S.C[x]["binding_status"] == "UNRESOLVED"})
            b = pill("UNRESOLVED " + ", ".join(un)) if un else f'<span class="small">{esc(basis)}</span>'
            rows.append(f"<tr><td><code>{esc(v)}</code></td><td>{badge(v, S.text(lab))}</td><td>{esc(S.text(det))}</td><td>{b}</td></tr>")
        a(f"<h3>{esc(title)}</h3>" + table(["Stored value", "Badge", "Detail text", "Binding"], rows))
    a("</section>")
    # bindings
    a(f'<section id="bindings" aria-labelledby="h-bind"><h2 id="h-bind">Open copy bindings</h2><p class="intro">{len(unresolved)} of {len(S.copy["entries"])} copy entries are UNRESOLVED. Each names an open finding; none is shown as settled.</p>')
    by = {}
    for e in unresolved:
        by.setdefault(e["finding_ref"], []).append(e)
    ftitle = {f["finding_id"]: f for f in S.findings}
    for fid in sorted(by):
        f = ftitle.get(fid, {})
        rows = [f'<tr><td><code>{esc(e["id"])}</code></td><td>{esc(e["screen"])}</td><td>{esc(e["text"])}</td><td>{esc(e["unresolved_binding"])}</td></tr>' for e in by[fid]]
        a(f'<details class="group"><summary><code>{esc(fid)}</code> {pill(f.get("status", "UNKNOWN"))} <span>{esc(f.get("affected", ""))}</span> <span class="small">{len(by[fid])} entries · owner {esc(f.get("responsible_lane", ""))}</span></summary>'
          + table(["Copy ID", "Screen", "Text", "Open decision"], rows) + "</details>")
    a("</section>")
    # screens
    a('<section id="screens" aria-labelledby="h-scr"><h2 id="h-scr">Screens</h2><p class="intro">Specified in <code>docs/prototype/UX_BRIEF.md</code>. Implementation and test status come from DELIVERY_STATUS.json and its cited evidence.</p>')
    rows = []
    for s in screens:
        n = [e for e in S.copy["entries"] if e["screen"] == s["id"]]
        u = sorted({e["finding_ref"] for e in n if e["binding_status"] == "UNRESOLVED"})
        rows.append(f"<tr><td><code>{esc(s['id'])}</code></td><td>{esc(S.text(s['heading_copy_id']))}</td><td>{esc(s['audience'])}</td><td>{len(n)}</td><td>{esc(', '.join(u)) or '—'}</td><td>{esc(s['journeys'])}</td><td>{pill(s['implementation'])}</td><td>{pill(s['tested'])}</td><td><code>{esc(s['evidence'])}</code></td></tr>")
    a(table(["Screen", "Heading", "Audience", "Copy entries", "Open bindings", "Journeys", "Implementation", "Tested", "Evidence"], rows) + "</section>")
    # states
    a('<section id="states" aria-labelledby="h-st"><h2 id="h-st">Screen states</h2><p class="intro">Loading, empty, error, recovery and permission copy. A timeout or generic service error is never shown as “nothing changed”.</p>'
      '<div class="filter"><label for="aud">Audience</label><select id="aud"><option value="all">All</option><option value="STAFF">Staff</option><option value="PRINCIPAL">Principal</option></select></div>')
    rows = []
    for e in S.copy["entries"]:
        if e["id"].startswith(("error.", "permission.", "recovery.", "global.loading", "global.count")) or e["element"] == "empty":
            cond = (e.get("unresolved_binding") or "").startswith("CONDITIONAL")
            bind = pill("CONDITIONAL — do not display " + e["finding_ref"]) if cond else (pill("UNRESOLVED " + e["finding_ref"]) if e["binding_status"] == "UNRESOLVED" else '<span class="small">design 0.1.0</span>')
            rows.append(f'<tr data-aud="{esc(e["audience"])}"><td><code>{esc(e["id"])}</code></td><td>{esc(e["audience"])}</td><td>{esc(e["semantic_state"] or "EMPTY")}</td><td>{esc(e["text"])}</td><td>{bind}</td></tr>')
    a(table(["Copy ID", "Audience", "State", "Text", "Binding"], rows, ' id="statetable"') + "</section>")
    # evidence
    a('<section id="evidence" aria-labelledby="h-ev"><h2 id="h-ev">Acceptance evidence</h2><p class="intro">Canonical status is Work\'s. Records, inspection, observed PASS and acceptance are separate facts.</p>')
    rows = []
    for t in ev["test_evidence"]:
        recs = t.get("records", [])
        res = ", ".join(sorted({f"{r.get('observed_result')} ({r.get('run_role')})" for r in recs})) or "—"
        rev = ", ".join(sorted({r.get("review_status", "") for r in recs})) or ("NOT_SELECTED" if t["priority"] == "P1" and not t.get("selected") else "MISSING_EVIDENCE")
        mand = "mandatory" if t.get("mandatory_for_internal_demo") else "unpromoted P1"
        cs = t["canonical_status"]["value"]
        rows.append(f"<tr><td><code>{esc(t['test_id'])}</code></td><td>{esc(t['priority'])} · {mand}</td><td>{esc(t['scenario'])}</td><td>{esc(', '.join(t['journeys']))}</td><td>{badge(cs, cs)}</td><td>{len(recs)}</td><td>{esc(res)}</td><td>{pill(rev)}</td></tr>")
    a(table(["Test", "Priority", "Scenario", "Journeys", "Canonical (Work)", "Records", "Observed results", "Review"], rows) + "</section>")
    # engineering
    er = ev.get("engineering_reports", {})
    a(f'<section id="engineering" aria-labelledby="h-eng"><h2 id="h-eng">Engineering reports</h2><p class="intro">{esc(er.get("scope", ""))}</p>')
    a(f'<p>{cnt["engineering_reports"]} recorded runs from <code>{esc(er.get("command_index", ""))}</code>; {cnt["engineering_reports_nonzero_exit"]} exited non-zero and are retained. Review: {pill(er.get("review_status", ""))}. {esc(er.get("limitations", ""))}</p>')
    rows = [f"<tr><td><code>{esc(r['report_id'])}</code></td><td><code>{esc(r['command'])}</code></td><td>{esc(r['exit_code'])}</td><td>{esc(r['started_at'])}</td><td>{esc(r.get('profile'))}</td></tr>" for r in er.get("records", [])]
    a('<details class="group"><summary>Show all engineering runs</summary>' + table(["Report", "Command", "Exit", "Started", "Profile"], rows) + "</details></section>")
    # claims
    a('<section id="claims" aria-labelledby="h-cl"><h2 id="h-cl">Claims register</h2><p class="intro">A claim is presented only when its status is EVIDENCED and the validator confirms candidate-matched, inspected PASS evidence.</p>')
    rows = [f"<tr><td><code>{c['id']}</code></td><td>{esc(c['area'])}</td><td>{esc(c['wording'].strip('*'))}</td><td>{esc(c['tests'])}</td><td>{pill(c['status'])}</td><td>{esc(c['limitation'])}</td><td>{esc(c['avoid'])}</td></tr>" for c in S.claims]
    a(table(["ID", "Area", "Permitted wording (once evidenced)", "Evidence", "Status", "Limitation", "Must not say"], rows) + "</section>")
    # findings
    a('<section id="findings" aria-labelledby="h-fi"><h2 id="h-fi">Findings</h2><p class="intro">Forwarding a finding does not close it. History is kept in FINDINGS.csv.</p>'
      '<div class="filter"><label for="sev">Severity</label><select id="sev"><option value="all">All</option>' + "".join(f'<option value="{s}">{s.title()}</option>' for s in SEVERITY) + "</select></div>")
    rows = []
    for f in S.findings:
        tone = {"BLOCKER": "bad", "HIGH": "warn", "MEDIUM": "info", "LOW": "neutral"}[f["severity"]]
        rows.append(f'<tr data-sev="{f["severity"]}"><td><code>{f["finding_id"]}</code></td><td><span class="pill t-{tone}">{f["severity"]}</span></td><td>{esc(f["affected"])}</td><td>{esc(f["observed"])}</td><td>{esc(f["responsible_lane"])}</td><td>{esc(f["acceptance_condition"])}</td><td>{pill(f["status"])}<br><span class="small">@{esc(f["last_observed_base"])}</span></td></tr>')
    a(table(["ID", "Severity", "Affected", "Observed", "Owner", "Closes when", "Status"], rows, ' id="findtable"') + "</section>")
    # limits
    lim = ["This pack is documentation. It does not show that any ORVIA feature runs.",
           "Fictional data and local synthetic systems only; no commercial-vendor integrations.",
           "Only the local supported send-admission point is in scope; no global interception and no recall of sent messages.",
           "Marketing withdrawal is not erasure. Rights, retention and guardian flows are not built.",
           "Evidence digests detect changes relative to a trusted copy; they are not legal certificates.",
           "No production security, high availability, disaster recovery, SSO, licensing or update infrastructure.",
           f"Capability register {'present' if reg['present'] else 'absent'} ({reg['finding']}); only master module IDs 19–25 are Version 2, and no replacement list is shown.",
           "Contract 0.2.0 is a proposal pending Work review; copy bound to it stays UNRESOLVED.",
           "No legal-compliance claim is made."]
    a('<section id="limits" aria-labelledby="h-li"><h2 id="h-li">Limitations</h2><ul class="plain">' + "".join(f"<li>{esc(x)}</li>" for x in lim) + "</ul></section>")
    # sources
    rows = [f"<tr><td><code>{esc(p)}</code></td><td><code>{d}</code></td></tr>" for p, d in source_hashes]
    a('<section id="sources" aria-labelledby="h-so"><h2 id="h-so">Sources</h2><p class="intro">SHA-256 of each input at build time. <code>python3 docs/reviews/cowork/tools/build_pack.py --check</code> reports drift.</p>' + table(["File", "SHA-256"], rows) + "</section>")
    a(f'<footer>Prepared by the Cowork lane. Not the ORVIA application. Built from sources dated {esc(st["as_of"])}.</footer></main></div>')
    a("""<script>
(function(){
  function wire(selId, tableId, attr){
    var sel=document.getElementById(selId), rows=document.querySelectorAll('#'+tableId+' tbody tr');
    if(!sel) return;
    sel.addEventListener('change', function(){
      for (var i=0;i<rows.length;i++){ var v=rows[i].getAttribute(attr); rows[i].hidden = !(sel.value==='all' || v===sel.value || v==='ALL'); }
    });
  }
  wire('aud','statetable','data-aud'); wire('sev','findtable','data-sev');
})();
</script>
</body>
</html>
""")
    return "\n".join(H)


def build(root):
    """Return {relative path: expected content} for every generated output."""
    root = Path(root)
    S = Sources(root)
    out = {}
    ux = (root / OUT_UX).read_text(encoding="utf-8")
    ux = splice(ux, "status-copy", ux_status_copy(S), OUT_UX)
    out[OUT_UX] = splice(ux, "state-copy", ux_state_copy(S), OUT_UX)
    out[OUT_SCRIPT] = splice((root / OUT_SCRIPT).read_text(encoding="utf-8"), "demo-steps", script_steps(S), OUT_SCRIPT)
    ho = (root / OUT_HANDOVER).read_text(encoding="utf-8")
    ho = splice(ho, "handover-readiness", handover_readiness(S), OUT_HANDOVER)
    ho = splice(ho, "handover-evidence", handover_evidence(S), OUT_HANDOVER)
    out[OUT_HANDOVER] = splice(ho, "handover-media", handover_media(S), OUT_HANDOVER)
    hashes = []
    for p in INPUTS + CONTEXT_SOURCES + [OUT_UX, OUT_SCRIPT, OUT_HANDOVER]:
        data = out[p].encode("utf-8") if p in out else ((root / p).read_bytes() if (root / p).exists() else None)
        hashes.append((p, sha(data) if data is not None else "ABSENT"))
    out[OUT_HTML] = build_html(S, hashes)
    manifest = {"document": "Cowork generated-output manifest", "as_of": S.status["as_of"],
                "generator": "docs/reviews/cowork/tools/build_pack.py",
                "inputs": {p: d for p, d in hashes if p in INPUTS + CONTEXT_SOURCES},
                "outputs": {p: sha(out[p].encode("utf-8")) for p in (OUT_UX, OUT_SCRIPT, OUT_HANDOVER, OUT_HTML)}}
    out[OUT_MANIFEST] = json.dumps(manifest, indent=2) + "\n"
    return out


def stale(root):
    root = Path(root)
    return [p for p, c in build(root).items() if not (root / p).exists() or (root / p).read_text(encoding="utf-8") != c]


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--root", default=str(TOOLS.parents[3]))
    ap.add_argument("--check", action="store_true", help="compare only; exit 1 if any generated output is stale")
    a = ap.parse_args(argv)
    root = Path(a.root)
    if a.check:
        s = stale(root)
        for p in s:
            print(f"STALE {p}")
        print("generated outputs are current" if not s else f"{len(s)} generated output(s) stale; run build_pack.py")
        return 1 if s else 0
    for p, c in build(root).items():
        (root / p).write_text(c, encoding="utf-8")
        print(f"wrote {p}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
