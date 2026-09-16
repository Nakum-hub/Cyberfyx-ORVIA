#!/usr/bin/env python3
"""Cowork document validation (Python standard library only).

This checks documents and their provenance. It is NOT an ORVIA application test, security audit
or acceptance decision, and it never writes Work's canonical tracking files.

Usage, from the repository root:
    python3 docs/reviews/cowork/tools/validate_docs.py                       # current lifecycle checks
    python3 docs/reviews/cowork/tools/validate_docs.py --mode historical-no-evidence
    python3 docs/reviews/cowork/tools/validate_docs.py --root DIR --json     # used by the regression tests

Modes:
  current                 Accepts real, provenance-backed progress (records, FAIL/ERROR results,
                          media, rehearsals, EVIDENCED claims) and rejects unsupported assertions.
  historical-no-evidence  Additionally requires the no-evidence snapshot state (every canonical
                          result NOT_RUN, no records, no media, no EVIDENCED claims). Use it only
                          to validate a snapshot that is meant to contain no application evidence.
Exit code 0 = every check passed; 1 = at least one failed.
"""
import argparse, csv, hashlib, io, json, re, subprocess, sys
from html.parser import HTMLParser
from pathlib import Path

TOOLS = Path(__file__).resolve().parent
sys.path.insert(0, str(TOOLS))
import build_pack  # noqa: E402
import evidence_rules as rules  # noqa: E402

HEX40 = re.compile(r"^[0-9a-f]{40}$")
FINDING_STATUS = {"OPEN", "PARTIALLY_RESOLVED", "RESOLVED", "RESOLVED_PENDING_REVIEW"}
OPEN_STATUS = {"OPEN", "PARTIALLY_RESOLVED"}
CLAIM_STATUS = {"NOT_EVIDENCED", "EVIDENCED", "BLOCKED", "NOT_PERMITTED"}
PROPOSED_STATUS = {"REVISED_FOR_REVIEW", "PARTIAL_BLOCKED", "PREPARED_NOT_FROZEN", "SUBMITTED_FOR_REVIEW", "BLOCKED"}
SCREEN_IMPL = {"UNKNOWN", "NOT_IMPLEMENTED", "IMPLEMENTED"}
TEST_RESULTS = {"NOT_RUN", "RUNNING", "PASS", "FAIL", "ERROR", "SKIPPED"}
OWNED_MD = ["docs/prototype/UX_BRIEF.md", "docs/prototype/DEMO_SCRIPT.md", "docs/prototype/RELEASE_CHECKLIST.md",
            "docs/ux/ACCEPTANCE_JOURNEYS.md", "docs/demo/CLAIMS_REGISTER.md", "docs/demo/LEADERSHIP_HANDOVER.md",
            "docs/runbooks/OPERATOR.md", "docs/reviews/cowork/VALIDATION.md"]


class Result:
    def __init__(self):
        self.items = []

    def check(self, name, ok, detail=""):
        self.items.append({"check": name, "ok": bool(ok), "detail": str(detail)[:600]})
        return bool(ok)

    @property
    def failed(self):
        return [i for i in self.items if not i["ok"]]


def load_json(R, root, rel):
    try:
        d = json.loads((root / rel).read_text(encoding="utf-8"))
        R.check(f"JSON parses: {rel}", True)
        return d
    except Exception as e:  # noqa: BLE001 - report, do not crash
        R.check(f"JSON parses: {rel}", False, f"{type(e).__name__}: {e}")
        return None


def require_keys(R, name, obj, keys):
    missing = [k for k in keys if not isinstance(obj, dict) or k not in obj]
    return R.check(f"Required fields present: {name}", not missing, ", ".join(missing))


def contract_enums(root):
    """Design enums (CONTRACT.md §3) and executable-proposal enums (packages/contracts, if present)."""
    design = {}
    c = (root / "docs/prototype/CONTRACT.md").read_text(encoding="utf-8")
    axis = {"Consent": "consent", "Workflow": "workflow", "Action execution": "action", "Observation": "observation",
            "Processing decision": "decision", "Test result": "test"}
    for k, v in re.findall(r"^\| (Consent|Workflow|Action execution|Observation|Processing decision|Test result) \| (.+) \|$", c, re.M):
        design[axis[k]] = set(re.findall(r"`([A-Z_]+)`", v))
    proposal = {}
    p = root / "packages/contracts/src/index.ts"
    if p.exists():
        src = p.read_text(encoding="utf-8")
        names = {"ConsentState": "consent", "WorkflowState": "workflow", "ExecutionState": "action", "ObservationState": "observation",
                 "DecisionState": "decision", "TestState": "test", "ReconciliationState": "reconciliation"}
        for n, ax in names.items():
            m = re.search(rf"export const {n} = z\.enum\(\[([^\]]*)\]\)", src)
            if m:
                proposal[ax] = set(re.findall(r"'([A-Z_]+)'", m.group(1)))
    return design, proposal


def validate(root, mode="current"):
    root = Path(root)
    R = Result()
    copy = load_json(R, root, "docs/ux/UI_COPY.json")
    steps = load_json(R, root, "docs/demo/demo_steps.json")
    ev = load_json(R, root, "docs/demo/EVIDENCE_INDEX.json")
    status = load_json(R, root, "docs/reviews/cowork/DELIVERY_STATUS.json")
    tasks = load_json(R, root, "tracking/tasks.json")
    acceptance = load_json(R, root, "tracking/acceptance.json")

    # ---- findings
    findings = {}
    try:
        rows = list(csv.DictReader(io.StringIO((root / "docs/reviews/cowork/FINDINGS.csv").read_text(encoding="utf-8"))))
        cols = ["finding_id", "severity", "ticket", "affected", "source_or_reproduction", "expected", "observed", "responsible_lane",
                "acceptance_condition", "evidence_to_close", "status", "raised_at", "last_observed_base", "linked", "history"]
        R.check("FINDINGS.csv has the required columns", rows and list(rows[0].keys()) == cols, rows and list(rows[0].keys()))
        req = [c for c in cols if c != "linked"]
        R.check("Every finding row is complete", all(all(r.get(c) for c in req) for r in rows),
                [r.get("finding_id") for r in rows if not all(r.get(c) for c in req)])
        R.check("Finding severities valid", all(r["severity"] in {"BLOCKER", "HIGH", "MEDIUM", "LOW"} for r in rows))
        R.check("Finding statuses valid", all(r["status"] in FINDING_STATUS for r in rows), [r["status"] for r in rows if r["status"] not in FINDING_STATUS])
        ids = [r["finding_id"] for r in rows]
        R.check("Finding IDs unique", len(ids) == len(set(ids)))
        R.check("Finding history is preserved (dated entries)", all(re.search(r"\d{4}-\d{2}-\d{2} @", r["history"]) for r in rows))
        findings = {r["finding_id"]: r for r in rows}
    except Exception as e:  # noqa: BLE001
        R.check("FINDINGS.csv parses", False, e)

    design, proposal = contract_enums(root)
    # ---- UI copy
    if copy is not None and require_keys(R, "UI_COPY.json", copy, ["entries", "rules", "base_commit", "status"]):
        E = copy["entries"]
        need = ["id", "screen", "element", "semantic_state", "audience", "text", "placeholders", "source_ref", "binding_status",
                "unresolved_binding", "finding_ref", "contract_proposal_ref", "error_code"]
        bad = [e.get("id") for e in E if not all(k in e for k in need)]
        R.check("UI_COPY entries have all fields", not bad, bad[:10])
        ids = [e.get("id") for e in E]
        C = {e.get("id"): e for e in E}
        R.check("UI_COPY ids unique", len(ids) == len(set(ids)))
        R.check("UI_COPY placeholders match text", all(sorted(set(re.findall(r"\{([a-z_]+)\}", e.get("text", "")))) == e.get("placeholders") for e in E))
        R.check("UI_COPY binding_status values valid", all(e.get("binding_status") in {"UNRESOLVED", "CONTRACT_DESIGN_0.1.0", "ACCEPTED_CONTRACT"} for e in E))
        R.check("UNRESOLVED entries state the open decision", all((e.get("binding_status") == "UNRESOLVED") == bool(e.get("unresolved_binding")) for e in E))
        noref = [e["id"] for e in E if e.get("binding_status") == "UNRESOLVED" and not e.get("finding_ref")]
        R.check("Every UNRESOLVED entry names a finding", not noref, noref)
        dang = [f"{e['id']}→{e['finding_ref']}" for e in E if e.get("finding_ref") and e["finding_ref"] not in findings]
        R.check("Every copy finding_ref exists in FINDINGS.csv", not dang, dang)
        closed = [f"{e['id']}→{e['finding_ref']}" for e in E if e.get("binding_status") == "UNRESOLVED" and e.get("finding_ref") in findings
                  and findings[e["finding_ref"]]["status"] not in OPEN_STATUS]
        R.check("UNRESOLVED entries point to open findings", not closed, closed)
        R.check("Every CONTRACT §3 state has a label", len(design) == 6 and all(f"state.{a}.{v}.label" in C for a, vs in design.items() for v in vs))
        invented = []
        for i in ids:
            m = re.match(r"state\.(consent|workflow|action|observation|decision|test|reconciliation)\.([A-Z_]+)\.", i)
            if m:
                ax, v = m.groups()
                if v in design.get(ax, set()):
                    continue
                if v in proposal.get(ax, set()) and C[i].get("contract_proposal_ref"):
                    continue
                invented.append(i)
        R.check("No state value outside the design contract or the cited executable proposal", not invented, invented)
        approval_problems = rules.approval_errors(root, copy)
        R.check("All accepted bindings have exact source-backed scoped approval", not approval_problems, approval_problems)
        copy_problems = rules.copy_safety_errors(root, copy)
        R.check("Copy recovery, reason mappings and count units match their source guards", not copy_problems, copy_problems)
        secretish = re.compile(r"(password\s*[:=]|api[_-]?key|secret\s*[:=]|BEGIN [A-Z ]*PRIVATE KEY|@(?!aster\.example|birch\.example)[a-z0-9-]+\.(com|net|in|org|io))", re.I)
        R.check("UI_COPY contains no credentials or real email addresses", not secretish.search(json.dumps(copy)))
        assigned = {"state.workflow.ACCEPTED.detail": "Withdrawal recorded. Downstream actions are still being checked.",
                    "state.action.ACKNOWLEDGED.detail": "Command acknowledged. Outcome not yet independently observed.",
                    "state.action.EFFECT_UNKNOWN.detail": "Outcome unknown. Reconciliation is required.",
                    "state.action.MANUAL_REQUIRED.detail": "Manual action required. Automated outcome not verified.",
                    "state.workflow.NEEDS_ATTENTION.detail": "Required actions remain unresolved."}
        R.check("Assigned state wording present", all(C.get(k, {}).get("text") == v for k, v in assigned.items()))
        osd = C.get("state.observation.OBSERVED_SATISFIED.detail", {})
        R.check("OBSERVED_SATISFIED detail carries scope and timestamp", {"observed_at", "scope_summary"} <= set(osd.get("placeholders", [])))
        R.check("STALE detail requires recheck", C.get("state.observation.STALE.detail", {}).get("text", "").startswith("Observation is out of date. Recheck required."))
        allow = C.get("state.decision.ALLOW.detail", {}).get("text", "")
        R.check("ALLOW copy is purpose-specific and does not require consent universally", "this purpose" in allow and "consent" not in allow.lower())
        nochange = [e["id"] for e in E if re.search(r"unchanged|nothing (was )?changed|wasn't saved|not saved", e.get("text", ""), re.I)
                    and e.get("audience") in ("PRINCIPAL", "STAFF", "ALL") and e.get("element") in ("error", "status_line")
                    and not (e.get("unresolved_binding") or "").startswith("CONDITIONAL")]
        R.check("No unconditional 'nothing changed' assurance in error copy", not nochange, nochange)
        R.check("Conditional no-commit copy is marked do-not-display",
                (C.get("error.portal.503_not_saved", {}).get("unresolved_binding") or "").startswith("CONDITIONAL — do not display"))
        rel = C.get("error.portal.409_epoch.reloaded", {})
        R.check("'Loaded your latest choice' is gated on a successful reload", rel.get("semantic_state") == "RELOAD_SUCCEEDED"
                and "loaded your latest choice" not in C.get("error.portal.409_epoch", {}).get("text", "").lower())
        R.check("Recovery copy retries the same request", "recovery.portal.retry_same" in C and "same request" in C["recovery.portal.retry_same"]["text"].lower())
        R.check("Reconcile pending text is marked transient", "Transient" in (C.get("reconcile.pending", {}).get("unresolved_binding") or ""))
        R.check("Manual completion note exists", "state.workflow.COMPLETED.manual_note" in C)
        for need_state in ["LOADING", "VALIDATION_ERROR", "UNAUTHENTICATED", "FORBIDDEN", "NOT_FOUND_OR_INACCESSIBLE", "VERSION_CONFLICT",
                           "SERVICE_UNAVAILABLE", "OUTCOME_UNCONFIRMED", "IDEMPOTENCY_CONFLICT"]:
            R.check(f"Screen-state copy exists: {need_state}", any(e.get("semantic_state") == need_state for e in E))
        R.check("Empty-state copy exists for every specified screen",
                all(any(e.get("screen") == s and e.get("element") == "empty" for e in E) for s in
                    ["W-OVERVIEW", "W-ATTENTION", "W-WORKFLOWS", "W-PURPOSES", "W-NOTICES", "W-POLICIES", "W-SYSTEMS", "W-PRINCIPALS",
                     "W-EVIDENCE", "W-TESTLAB", "W-CAPABILITIES", "P-CHOICES", "P-RECEIPTS"]))
        R.check("Successful-acceptance copy exists", "receipt.accepted.withdraw" in C and "receipt.accepted.grant" in C)
        # copy ids referenced in Markdown
        pref = "state|error|permission|global|nav|signin|overview|attention|workflows|workflow|reconcile|attest|purposes|notices|policies|systems|principals|evidence|testlab|capabilities|choices|grant|receipt|receipts|recovery"
        bad = []
        for rel_md in ["docs/prototype/UX_BRIEF.md", "docs/ux/ACCEPTANCE_JOURNEYS.md", "docs/prototype/DEMO_SCRIPT.md"]:
            t = (root / rel_md).read_text(encoding="utf-8")
            for r in set(re.findall(rf"`((?:{pref})\.[A-Za-z0-9_.*]+)`", t)):
                pre = r.split("*")[0]
                if "*" in r:
                    ok = any(i.startswith(pre) for i in ids)
                else:
                    ok = r in C or any(i.startswith(r + ".") for i in ids)
                if not ok:
                    bad.append(f"{rel_md}:{r}")
        R.check("All copy IDs referenced in Markdown exist", not bad, sorted(bad))

    # ---- acceptance / journeys
    canon = {}
    if acceptance is not None:
        canon = {t["id"]: t for t in acceptance.get("tests", [])}
        R.check("tracking/acceptance.json has 34 scenarios", len(canon) == 34)
        R.check("Canonical results use allowed values", all(t.get("status") in TEST_RESULTS for t in canon.values()))
    jr = (root / "docs/ux/ACCEPTANCE_JOURNEYS.md").read_text(encoding="utf-8")
    summary = jr.split("### What a browser cannot show")[0]
    R.check("Every T01–T34 appears in the journey summary", all(re.search(rf"\b{t}\b", summary) for t in canon))
    jrows = re.findall(r"^\| (J\d\d) \|.*\| ([A-Z_]+)(?: \(.*\))? \|$", summary, re.M)
    R.check("Journey summary rows parse", len(jrows) >= 28, len(jrows))
    if canon:
        mism = []
        for line in re.findall(r"^\| J\d\d \|.*$", summary, re.M):
            ts = re.findall(r"\bT\d\d\b", line)
            res = re.findall(r"\| ([A-Z_]+)(?: \([^)]*\))? \|$", line)
            if ts and res:
                vals = {canon[t]["status"] for t in ts if t in canon}
                if len(vals) == 1 and res[0] not in vals:
                    mism.append(line[:40])
        R.check("Journey results match Work's canonical status", not mism, mism)
    owned_text = {p: (root / p).read_text(encoding="utf-8") for p in OWNED_MD if (root / p).exists()}
    opt = [p for p, t in owned_text.items() if re.search(r"optional (variants?|tests?)\b", t, re.I)]
    R.check("No P0 test is described as optional", not opt, opt)

    # ---- tasks / delivery status
    if status is not None and require_keys(R, "DELIVERY_STATUS.json", status,
                                           ["as_of", "documentation_base_commit", "current_source_inspection_id", "canonical_readiness",
                                            "production_readiness", "tickets", "screens", "capability_register", "candidate"]):
        for k in ("canonical_readiness", "production_readiness"):
            cr = status[k]
            src = root / cr.get("source_path", "")
            R.check(f"{k} quotation appears in its source file", src.exists() and cr.get("quoted_text", "\0") in src.read_text(encoding="utf-8"),
                    cr.get("source_path"))
            problems = rules.readiness_errors(root, k, cr)
            R.check(f"{k} value and source revision agree", not problems, problems)
        if tasks is not None:
            tt = {t["id"]: t for t in tasks.get("tasks", [])}
            wrong = [t["id"] for t in status["tickets"] if tt.get(t["id"], {}).get("status") != t.get("canonical_status")]
            R.check("Ticket canonical status matches tracking/tasks.json", not wrong, wrong)
        R.check("Cowork proposed statuses use allowed values", all(t.get("proposed_status") in PROPOSED_STATUS for t in status["tickets"]))
        R.check("Cowork never proposes accepted/complete for its own tickets",
                not any(re.search(r"ACCEPT|COMPLETE|DONE", t.get("proposed_status", "")) for t in status["tickets"]))
        R.check("Screen implementation values valid", all(s.get("implementation") in SCREEN_IMPL and s.get("tested") in TEST_RESULTS for s in status["screens"]))
    # ---- evidence index
    cand = None
    if ev is not None and require_keys(R, "EVIDENCE_INDEX.json", ev, ["test_evidence", "source_inspections", "current_source_inspection_id",
                                                                      "record_schema", "summary", "frozen_candidate", "media", "rehearsals"]):
        te = ev["test_evidence"]
        R.check("EVIDENCE_INDEX covers each canonical test once", sorted(t["test_id"] for t in te) == sorted(canon))
        R.check("EVIDENCE_INDEX canonical status matches tracking/acceptance.json",
                all(t.get("canonical_status", {}).get("value") == canon.get(t["test_id"], {}).get("status") for t in te))
        cur = [s for s in ev["source_inspections"] if s.get("status") == "CURRENT" and s.get("kind") == "source_inspection"]
        R.check("Exactly one CURRENT repository inspection, matching current_source_inspection_id",
                len(cur) == 1 and cur[0]["evidence_id"] == ev["current_source_inspection_id"])
        R.check("Historical inspections are preserved", any(s["evidence_id"] == "EV-SRC-001" and s.get("status") == "HISTORICAL" for s in ev["source_inspections"]))
        if status is not None:
            R.check("DELIVERY_STATUS and EVIDENCE_INDEX name the same current inspection and base",
                    status["current_source_inspection_id"] == ev["current_source_inspection_id"]
                    and cur and cur[0]["commit"] == status["documentation_base_commit"])
        fc = ev["frozen_candidate"]
        candidate_problems = rules.candidate_errors(fc)
        R.check("Candidate identity is complete or explicitly unidentified", not candidate_problems, candidate_problems)
        cand = fc
        if status is not None:
            R.check("Candidate identities agree across status and evidence",
                    not rules.candidate_errors(status["candidate"]) and status["candidate"].get("status") == fc.get("status")
                    and rules.identity(status["candidate"], True) == rules.identity(fc, True))
            screen_problems = rules.screen_errors(root, status["screens"], ev)
            R.check("Screen implementation and browser claims have scoped evidence", not screen_problems, screen_problems)
        rs = ev["record_schema"]
        probs = []
        for t in te:
            for r in t.get("records", []):
                rid = r.get("record_id", "?")
                miss = [k for k in rs["required"] if k not in r]
                if miss:
                    probs.append(f"{rid}: missing {miss}")
                    continue
                if r["test_id"] != t["test_id"]:
                    probs.append(f"{rid}: test_id mismatch")
                if r["run_role"] not in rs["run_role"] or r["observed_result"] not in rs["observed_result"] or r["review_status"] not in rs["review_status"]:
                    probs.append(f"{rid}: value outside schema")
                if not HEX40.match(str(r["code_under_test_commit"] or "")):
                    probs.append(f"{rid}: code_under_test_commit is not a full SHA")
                for k in ("command", "started_at", "build_id", "contract_version", "profile", "fixture_id", "source_handoff", "producing_lane"):
                    if not r.get(k):
                        probs.append(f"{rid}: incomplete provenance ({k})")
                if r["observed_result"] != "RUNNING" and (r.get("finished_at") is None or r.get("exit_code") is None):
                    probs.append(f"{rid}: finished run lacks finished_at/exit_code")
                if r["review_status"].startswith("INSPECTED") and not (r.get("reviewed_by") and r.get("reviewed_at")):
                    probs.append(f"{rid}: inspected without reviewer/time")
                if not r["artifact_paths"]:
                    probs.append(f"{rid}: no artifacts")
                probs.extend(f"{rid}: {p}" for p in rules.record_errors(root, r))
        record_ids = [r.get("record_id") for t in te for r in t.get("records", [])]
        if len(set(record_ids)) != len(record_ids): probs.append("duplicate evidence record IDs")
        R.check("Evidence records are complete, provenance-backed and hash-matched", not probs, probs)
        mprobs = []
        for m in ev.get("media", []):
            miss = [k for k in ev.get("media_schema", {}).get("required", []) if not m.get(k)]
            if miss:
                mprobs.append(f"{m.get('media_id')}: missing {miss}")
            elif m.get("live_or_recorded") != "RECORDED" or m.get("kind") not in ev["media_schema"]["kind"]:
                mprobs.append(f"{m.get('media_id')}: invalid kind/label")
            else:
                mprobs.extend(rules.artifacts(root, {"artifact_paths": [m["path"]], "artifact_sha256": {m["path"]: m["sha256"]}}))
                if not rules.HEX40.fullmatch(str(m.get("code_under_test_commit", ""))) or not all(m.get(k) for k in rules.IDENTITY) or not rules.date(m.get("captured_at")):
                    mprobs.append(f"{m.get('media_id')}: incomplete candidate/media provenance")
        for h in ev.get("rehearsals", []):
            mprobs.extend(f"{h.get('rehearsal_id')}: {p}" for p in rules.rehearsal_errors(root, h))
        for field, id_key in (("rehearsals", "rehearsal_id"), ("media", "media_id")):
            ids = [r.get(id_key) for r in ev.get(field, [])]
            if len(ids) != len(set(ids)): mprobs.append(f"duplicate {id_key}")
        R.check("Media and rehearsal entries are complete", not mprobs, mprobs)
        derived = build_pack.summary_counts(ev, root)
        diff = {k: (ev["summary"].get(k), v) for k, v in derived.items() if ev["summary"].get(k) != v}
        R.check("EVIDENCE_INDEX summary equals counts derived from its records", not diff, diff)
        eng = ev.get("engineering_reports", {})
        ep = []
        for r in eng.get("records", []):
            ep.extend(f"{r.get('report_id')}: {p}" for p in rules.engineering_errors(root, r))
        R.check("Engineering reports never count as acceptance and match their artifacts", not ep, ep[:10])
        fixture_leak = "DOCUMENT-TOOL TEST DATA" in json.dumps(ev)
        R.check("No document-tool test fixture data in the real evidence index", not fixture_leak or mode == "fixture")
        if mode == "historical-no-evidence":
            R.check("[historical] every canonical result is NOT_RUN", all(t["status"] == "NOT_RUN" for t in canon.values()))
            R.check("[historical] no test records", derived["records"] == 0)
            R.check("[historical] no media or rehearsals", derived["screenshots"] + derived["recordings"] + derived["browser_traces"] + derived["rehearsals_indexed"] == 0)
            R.check("[historical] every journey result is NOT_RUN", all("NOT_RUN" in l for l in re.findall(r"^\| J\d\d \|.*$", summary, re.M)))

    # ---- claims
    claims = build_pack.parse_claims((root / "docs/demo/CLAIMS_REGISTER.md").read_text(encoding="utf-8"))
    R.check("Claims register rows present", len(claims) >= 20, len(claims))
    st_of = lambda c: re.sub(r"\*", "", c["status"]).split(":")[0].split(" ")[0]
    R.check("Claim statuses valid", all(st_of(c) in CLAIM_STATUS for c in claims), [c["status"] for c in claims if st_of(c) not in CLAIM_STATUS])
    unsupported = []
    if ev is not None:
        te = {t["test_id"]: t for t in ev.get("test_evidence", [])}
        for c in claims:
            if st_of(c) != "EVIDENCED":
                continue
            tests = re.findall(r"\bT\d\d\b", c["tests"])
            if not tests or not cand or cand.get("status") != "IDENTIFIED":
                unsupported.append(f"{c['id']}: no tests or no identified candidate")
                continue
            for t in tests:
                if not rules.test_qualifies(root, te.get(t, {}), cand, ev["test_evidence"]):
                    unsupported.append(f"{c['id']}: {t} lacks current complete candidate-qualified evidence")
    R.check("Every EVIDENCED claim is supported by candidate-matched inspected evidence", not unsupported, unsupported)
    if mode == "historical-no-evidence":
        R.check("[historical] no claim is EVIDENCED", not any(st_of(c) == "EVIDENCED" for c in claims))

    # ---- readiness overstatement in owned prose
    over = []
    for p, t in owned_text.items():
        for ln in t.splitlines():
            if re.search(r"(demo|readiness)[^|\n]{0,40}\b(READY|ready)\b", ln) and not re.search(r"NOT_READY|not ready|Readiness at a glance|readiness is|readiness:|readiness value|ready-", ln, re.I):
                over.append(f"{p}: {ln.strip()[:100]}")
    R.check("No unsupported readiness claim in owned prose", not over, over[:5])

    # ---- referenced finding IDs exist
    used = set()
    for t in owned_text.values():
        used |= set(re.findall(r"\bF-\d{3}\b", t))
    if copy is not None:
        used |= set(re.findall(r"\bF-\d{3}\b", json.dumps(copy)))
    if status is not None:
        used |= set(re.findall(r"\bF-\d{3}\b", json.dumps(status)))
    R.check("Every referenced finding ID exists", used <= set(findings), sorted(used - set(findings)))

    # ---- relative Markdown links
    broken = []
    for p, t in owned_text.items():
        for target in re.findall(r"\]\(([^)#\s]+)(?:#[^)]*)?\)", t):
            if target.startswith(("http:", "https:", "mailto:")):
                continue
            if not ((root / p).parent / target).resolve().exists():
                broken.append(f"{p} -> {target}")
    R.check("Relative Markdown links resolve", not broken, broken)

    # ---- demo steps
    if steps is not None and require_keys(R, "demo_steps.json", steps, ["steps"]):
        R.check("Demo has the 12 assigned steps", [s.get("step") for s in steps["steps"]] == list(range(1, 13)))
        sf = ["actor", "precondition", "screen", "screen_status", "action", "expected_fact", "tests", "evidence_needed", "evidence_status",
              "presenter_words", "fallback", "limitation"]
        R.check("Every demo step has all required fields", all(all(s.get(k) for k in sf) for s in steps["steps"]))
        R.check("Demo steps reference only known tests", all(t in canon for s in steps["steps"] for t in s["tests"]))
        s8 = next((s for s in steps["steps"] if s["step"] == 8), {})
        R.check("Step 8 has no server-says-otherwise escape clause", "completion rule says otherwise" not in json.dumps(s8))

    # ---- generated freshness (non-mutating)
    try:
        st = build_pack.stale(root)
        R.check("Generated sections, pack and manifest are current (build_pack --check)", not st, st)
    except SystemExit as e:
        R.check("Generated sections, pack and manifest are current (build_pack --check)", False, e)
    except Exception as e:  # noqa: BLE001
        R.check("Generated sections, pack and manifest are current (build_pack --check)", False, f"{type(e).__name__}: {e}")

    # ---- delivered files must not be git-ignored (they would silently drop out of a commit or patch)
    if (root / ".git").exists():
        owned_dirs = ["docs/ux", "docs/demo", "docs/runbooks", "docs/reviews/cowork", "handoffs/cowork"]
        files = [str(f.relative_to(root)) for d in owned_dirs if (root / d).exists() for f in (root / d).rglob("*")
                 if f.is_file() and "__pycache__" not in f.parts]
        try:
            res = subprocess.run(["git", "-C", str(root), "check-ignore", "--no-index", "--stdin"], input="\n".join(files),
                                 capture_output=True, text=True, timeout=30)
            ignored = [x for x in res.stdout.splitlines() if x]
            R.check("No Cowork-owned file is ignored by .gitignore", not ignored, ignored)
        except (OSError, subprocess.SubprocessError) as e:
            R.check("No Cowork-owned file is ignored by .gitignore", False, f"git unavailable: {e}")

    # ---- HTML pack
    hp = root / "docs/demo/index.html"
    if R.check("HTML pack exists", hp.exists()):
        src = hp.read_text(encoding="utf-8")

        class Scan(HTMLParser):
            def __init__(self):
                super().__init__()
                self.ids, self.hrefs, self.ext, self.forms = set(), [], [], 0

            def handle_starttag(self, tag, attrs):
                a = dict(attrs)
                if "id" in a:
                    self.ids.add(a["id"])
                for k in ("href", "src", "action", "poster", "data"):
                    v = a.get(k)
                    if v:
                        if k == "href" and v.startswith("#"):
                            self.hrefs.append(v[1:])
                        elif not v.startswith(("#", "data:")):
                            self.ext.append(f"{tag}[{k}]={v}")
                if tag in ("form", "input", "textarea", "iframe", "button"):
                    self.forms += 1
        s = Scan()
        s.feed(src)
        R.check("HTML internal anchors resolve", all(h in s.ids for h in s.hrefs), [h for h in s.hrefs if h not in s.ids])
        R.check("HTML loads no external resources", not s.ext and not re.search(r"url\((?!data:)|@import|https?://", src.split("<body>")[0]), s.ext)
        R.check("HTML has no forms, inputs, iframes or buttons", s.forms == 0)
        R.check("HTML has no storage, network or analytics calls", not re.search(r"fetch\(|XMLHttpRequest|localStorage|sessionStorage|sendBeacon|WebSocket|gtag|analytics", src))
        R.check("HTML labels itself as documentation", "Documentation only" in src and "not the ORVIA application" in src)
        R.check("HTML has a restrictive CSP", "default-src 'none'" in src)
        R.check("HTML declares dark and light tokens", "prefers-color-scheme: dark" in src and ':root[data-theme="dark"]' in src)
    return R


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--root", default=str(TOOLS.parents[3]))
    ap.add_argument("--mode", choices=["current", "historical-no-evidence", "fixture"], default="current")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args(argv)
    R = validate(a.root, a.mode)
    if a.json:
        print(json.dumps({"mode": a.mode, "passed": len(R.items) - len(R.failed), "total": len(R.items), "checks": R.items}, indent=2))
    else:
        w = max(len(i["check"]) for i in R.items)
        for i in R.items:
            print(f"{'PASS' if i['ok'] else 'FAIL'}  {i['check'].ljust(w)}  {'' if i['ok'] else i['detail']}")
        print(f"\n{len(R.items) - len(R.failed)}/{len(R.items)} document checks passed (mode: {a.mode})")
    return 1 if R.failed else 0


if __name__ == "__main__":
    sys.exit(main())
