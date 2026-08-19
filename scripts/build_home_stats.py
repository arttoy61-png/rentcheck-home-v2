# -*- coding: utf-8 -*-
"""Build homepage live stats from the latest Rent Check MOLIT CSV.

Input:  molit_kangseo.csv
Output: data/home_stats.json

The homepage uses one source for both:
- overall latest contract date (all property/deal types)
- latest 3 apartment sale contracts
"""
import csv
import hashlib
import json
import re
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else "molit_kangseo.csv")
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else "data/home_stats.json")

NAME_FIX = {
    "우장산아이파크,이편한세상": "우장산아이파크이편한세상",
    "우장산에스케이뷰": "우장산SK뷰",
}


def norm(name: str) -> str:
    return re.sub(r"[,\s·]+", "", name or "")


def complex_id(dong: str, name: str) -> str:
    return hashlib.md5(f"{dong}|{norm(name)}".encode()).hexdigest()[:8]


def parse_int(value):
    if value is None:
        return None
    s = str(value).strip().replace(",", "")
    if not s:
        return None
    try:
        return int(float(s))
    except ValueError:
        return None


def parse_float(value):
    if value is None:
        return None
    s = str(value).strip().replace(",", "")
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def iso_date(ym: str, day) -> str | None:
    ym = str(ym or "").strip()
    d = parse_int(day)
    if len(ym) != 6 or not ym.isdigit() or not d:
        return None
    return f"{ym[:4]}-{ym[4:6]}-{d:02d}"


def display_date(iso: str) -> str:
    return iso.replace("-", ".")


def main():
    if not SRC.exists():
        raise SystemExit(f"CSV not found: {SRC}")

    latest_all = None
    apartment_sales = []
    monthly = Counter()

    with SRC.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        required = {"deal_type", "deal_ym", "deal_day", "umd_name", "building_name", "area_m2"}
        missing = required - set(reader.fieldnames or [])
        if missing:
            raise SystemExit(f"Missing CSV columns: {sorted(missing)}")

        for r in reader:
            iso = iso_date(r.get("deal_ym"), r.get("deal_day"))
            if not iso:
                continue

            if latest_all is None or iso > latest_all:
                latest_all = iso

            ym = str(r.get("deal_ym") or "").strip()
            if len(ym) == 6 and ym.isdigit():
                monthly[f"{ym[:4]}-{ym[4:6]}"] += 1

            deal_type = str(r.get("deal_type") or "")
            if "아파트" not in deal_type or "매매" not in deal_type:
                continue

            dong = str(r.get("umd_name") or "").strip()
            name = str(r.get("building_name") or "").strip()
            name = NAME_FIX.get(name, name)
            area = parse_float(r.get("area_m2"))
            amount_man = parse_float(r.get("deal_amount"))
            if not dong or not name or area is None or amount_man is None:
                continue

            apartment_sales.append({
                "_iso": iso,
                "_floor": parse_int(r.get("floor")),
                "dong": dong,
                "name": name,
                "area_m2": round(area, 2),
                "amount_eok": round(amount_man / 10000, 2),
                "date": display_date(iso),
                "complex_id": complex_id(dong, name),
            })

    if latest_all is None:
        raise SystemExit("No valid contract dates found")

    apartment_sales.sort(
        key=lambda x: (x["_iso"], x["_floor"] if x["_floor"] is not None else -999),
        reverse=True,
    )

    # Avoid visually repeating an identical ticker row while retaining
    # same-day contracts when price/area/building differs.
    recent = []
    seen = set()
    for r in apartment_sales:
        key = (r["date"], r["dong"], r["name"], r["area_m2"], r["amount_eok"])
        if key in seen:
            continue
        seen.add(key)
        r.pop("_iso", None)
        r.pop("_floor", None)
        recent.append(r)
        if len(recent) == 3:
            break

    months = sorted(monthly)[-6:]
    payload = {
        "schema_version": 2,
        "generated_at": datetime.now(ZoneInfo("Asia/Seoul")).isoformat(timespec="seconds"),
        "data_until": latest_all,
        "source": "국토교통부 실거래가 공개시스템",
        "scope": "서울특별시 강서구",
        "jeonse_ratio": None,
        "recent_deals": recent,
        "monthly_trend": [{"month": m, "count": monthly[m]} for m in months],
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"data_until={payload['data_until']}")
    print(f"recent_deals={len(recent)}")
    for d in recent:
        print(f"  {d['date']} {d['dong']} {d['name']} {d['area_m2']}㎡ {d['amount_eok']}억")


if __name__ == "__main__":
    main()
