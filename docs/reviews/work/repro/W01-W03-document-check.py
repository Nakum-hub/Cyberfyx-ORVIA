"""Verify this Work preparation packet; never execute or promote application tests."""
from collections import Counter
from pathlib import Path
import hashlib
import json
import re
import subprocess


ROOT = Path(__file__).resolve().parents[4]
BASE = "4eb346f0974bb38abcc541744cc57bdf87428f1a"
checks = []


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT, text=True)


def read(path):
    return (ROOT / path).read_text()


def check(label, condition):
    if not condition:
        raise AssertionError(label)
    checks.append(label)


tasks = json.loads(read("tracking/tasks.json"))
acceptance = json.loads(read("tracking/acceptance.json"))
base_tasks = json.loads(git("show", f"{BASE}:tracking/tasks.json"))
base_acceptance = json.loads(git("show", f"{BASE}:tracking/acceptance.json"))
packet = json.loads(read("docs/reviews/work/W01_W03_PREPARATION.json"))
by_id = {t["id"]: t for t in tasks["tasks"]}
check("23 original tasks and all canonical definitions/dependencies preserved", len(by_id) == 23)
for old, new in zip(base_tasks["tasks"], tasks["tasks"], strict=True):
    if old["id"] in {"W01", "W02", "W03"}:
        stable = set(old) - {"planned_paths", "evidence", "status"}
        check(f"{old['id']} graph, owner, scope and accepted commit unchanged",
              all(old[k] == new[k] for k in stable) and new["status"] == "BLOCKED")
        check(f"{old['id']} retained earlier planned files and evidence",
              set(old["planned_paths"]) <= set(new["planned_paths"])
              and set(old["evidence"]) <= set(new["evidence"]))
    else:
        check(f"{old['id']} canonical task untouched", old == new)
check("task-level rules and plan unchanged",
      {k: v for k, v in tasks.items() if k != "tasks"}
      == {k: v for k, v in base_tasks.items() if k != "tasks"})
check("all 34 canonical test definitions, evidence and results unchanged",
      acceptance["tests"] == base_acceptance["tests"])
check("30 P0 and four P1, all NOT_RUN",
      Counter(t["priority"] for t in acceptance["tests"]) == {"P0": 30, "P1": 4}
      and all(t["status"] == "NOT_RUN" for t in acceptance["tests"]))
check("preparation is documentary and not a release or application result",
      packet["kind"] == "WORK_PREPARATION" and packet["coverage"] == "DOCUMENT_ONLY"
      and packet["runtime_candidate_commit"] is None
      and packet["new_application_test_execution"] is False
      and packet["internal_demo_recommendation"] == "NOT_READY"
      and packet["production_security_legal_assessment"] == "NOT_ASSESSED"
      and packet["human_release_decision"] == "NOT_SIGNED"
      and packet["promoted_p1_test_ids"] == [])
check("preparation scenario snapshot matches canonical statuses",
      packet["scenario_snapshot"] == [
          {k: t[k] for k in ["id", "priority", "status"]} for t in acceptance["tests"]])
for ticket in packet["work_tickets"]:
    t = by_id[ticket["id"]]
    check(f"{ticket['id']} prepared deliverable with open acceptance",
          ticket["document_preparation"] == "COMPLETE"
          and ticket["acceptance_status"] == "BLOCKED" and ticket["accepted_commit"] is None
          and ticket["start_dependencies"] == t["start_dependencies"]
          and ticket["acceptance_dependencies"] == t["acceptance_dependencies"])

master = ROOT / "docs/source/ORVIA_Version_1_Unified_Master_with_Version_2_AI_Roadmap.md"
check("approved master bytes unchanged",
      master.stat().st_size == 850752
      and hashlib.sha256(master.read_bytes()).hexdigest() == packet["master_sha256"]
      == "527daa1d6a2a7564a61d0375e540ca66b1bc8f33f4e71d327b0f6cb0bf6dbef6")
check("single adopted profile ADR retained",
      [p.name for p in (ROOT / "docs/decisions").glob("ADR-*.md")]
      == ["ADR-001-prototype-profile.md"])

template_sections = re.findall(r"^## (.+)$", read("handoffs/TEMPLATE.md"), re.M)
for path in packet["required_documents"]:
    text = read(path)
    check(f"substantive deliverable exists: {path}", len(text) > 1000)
    check(f"no unfilled template or scenario marker: {path}",
          not any(s in text for s in ["<task_id>", "<actual>", "<!-- WORK_SCENARIO_TABLE -->"]))
    for target in re.findall(r"\[[^\]]+\]\(([^)]+)\)", text):
        if target.startswith(("http:", "https:", "#")):
            continue
        check(f"local document link resolves: {path} -> {target}",
              ((ROOT / path).parent / target.split("#")[0]).exists())
    if path.startswith("handoffs/work/"):
        check(f"handoff follows shared template: {path}",
              re.findall(r"^## (.+)$", text, re.M) == template_sections)

w02 = read("docs/reviews/work/INTEGRATION_AND_SECURITY.md")
check("sixteen unique W02 prepared checks", len(packet["w02_prepared_checks"]) == 16
      and len({c["id"] for c in packet["w02_prepared_checks"]}) == 16)
known_ids = {t["id"] for t in acceptance["tests"]}
for c in packet["w02_prepared_checks"]:
    check(f"{c['id']} documented, uses canonical tests, not executed",
          f"| {c['id']} " in w02 and set(c["test_ids"]) <= known_ids
          and c["runtime_result"] == "NOT_RUN" and c["review_status"] == "AWAITING_CANDIDATE")
covered = {i for c in packet["w02_prepared_checks"] for i in c["test_ids"]}
check("all W02 assigned tests covered", set(by_id["W02"]["test_ids"]) <= covered)
w03 = read("docs/reviews/work/FINAL_GATE_REPORT.md")
check("final report has exactly 34 actual canonical scenario rows",
      re.findall(r"^\| (T\d{2}) \|", w03, re.M) == [t["id"] for t in acceptance["tests"]])
for t in acceptance["tests"]:
    check(f"{t['id']} final report agrees with canonical result",
          f"| {t['id']} | {t['priority']} — {t['title']} | {t['status']} |" in w03)

changed = set(git("diff", "--name-only", BASE).splitlines())
changed.update(git("ls-files", "--others", "--exclude-standard").splitlines())
allowed_exact = {"CURRENT_STATE.md", "tracking/tasks.json", "tracking/acceptance.json",
                 "docs/prototype/TASK_BOARD.md", "docs/prototype/ACCEPTANCE.md"}
check("all changes confined to Work-owned preparation paths",
      all(p in allowed_exact or p.startswith(("docs/reviews/work/", "handoffs/work/")) for p in changed))
check("only W00 A00 A01 are accepted", {t["id"] for t in tasks["tasks"] if t["status"] == "COMPLETED"}
      == {"W00", "A00", "A01"})
print(json.dumps({"kind": "WORK_DOCUMENT_CHECK", "coverage": "DOCUMENT_ONLY", "result": "PASS",
                  "baseline_commit": BASE, "checks_passed": len(checks), "checks": checks,
                  "task_status_counts": dict(Counter(t["status"] for t in tasks["tasks"])),
                  "full_scenarios": {"P0": 30, "P1_unpromoted": 4, "NOT_RUN": 34},
                  "application_tests_executed": False}, indent=2))
