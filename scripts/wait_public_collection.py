"""Wait for the public collection to finish; pin both downloads to one commit.

No collection dispatch, cancellation or data writes. On timeout the caller skips
home regeneration and keeps the existing homepage data. Contract dates are not
used as a failure signal (a successful API response can contain no new trades).
"""
from __future__ import annotations

import json
import os
import subprocess
import time
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

REPO = "arttoy61-png/rent-check"
KST = ZoneInfo("Asia/Seoul")


def ready(runs: list[dict], day: str) -> bool:
    runs = [r for r in runs if r.get("head_branch") == "main"]
    if any(r.get("status") != "completed" for r in runs):
        return False
    for r in sorted(runs, key=lambda item: item.get("created_at", ""), reverse=True):
        try:
            date = datetime.fromisoformat(r["created_at"].replace("Z", "+00:00")).astimezone(KST).date().isoformat()
        except (KeyError, ValueError, TypeError):
            continue
        if date == day:
            return r.get("conclusion") == "success"
    return False


def get(path: str) -> dict:
    result = subprocess.run(["gh", "api", f"repos/{REPO}/{path}"], capture_output=True,
                            text=True, timeout=45, check=False)
    if result.returncode:
        raise RuntimeError("Public repository state could not be read")
    return json.loads(result.stdout)


def main() -> int:
    deadline = time.monotonic() + 1200
    day = datetime.now(KST).date().isoformat()
    sha = ""
    while time.monotonic() < deadline:
        try:
            runs = get("actions/workflows/update-data.yml/runs?branch=main&per_page=100")["workflow_runs"]
            if ready(runs, day):
                sha = get("commits/main")["sha"]
                break
        except (RuntimeError, KeyError, ValueError, subprocess.TimeoutExpired):
            pass
        print("Public collection is pending/running or not yet verified; waiting 30 seconds.", flush=True)
        time.sleep(30)
    with Path(os.environ["GITHUB_OUTPUT"]).open("a", encoding="utf-8") as output:
        output.write(f"ready={'true' if sha else 'false'}\nsource_sha={sha}\n")
    with Path(os.environ["GITHUB_STEP_SUMMARY"]).open("a", encoding="utf-8") as summary:
        if sha:
            summary.write(f"Public data snapshot: `{sha}`. CSV and apartment data will use the same commit.\n")
        else:
            summary.write("Public collection has not completed successfully within the wait window. Existing home data is retained.\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
