#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build the small homepage statistics payload consumed by Rent Check V2.

Source files are downloaded from the public rent-check data repository by the
GitHub Actions workflow. This script only reads those copies and writes
`data/home_stats.json` inside V2.
"""
from __future__ import annotations

import csv
import heapq
import json
import re
from collections import Counter
from datetime import date, datetime
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / ".cache-home-stats"
CSV_PATH = SOURCE_DIR / "molit_kangseo.csv"
DETAIL_PATH = SOURCE_DIR / "gangseo_apt_detail.json"
OUT_PATH = ROOT / "data" / "home_stats.json"

# Keep this aligned with rent-check/gangseo_apt_builder.py.
NAME_FIX = {
    "우장산아이파크,이편한세상": "우장산아이파크이편한세상",
    "우장산에스케이뷰": "우장산SK뷰",
}


def fixed_name(value: object) -> str:
    name = str(value or "").strip()
    return NAME_FIX.get(name, name)


def norm(value: object) -> str:
    # gangseo_apt_builder.py removes commas, whitespace and middle dots.
    # Lower-casing makes Latin-letter case differences harmless for matching.
    return re.sub(r"[,\s·]+", "", fixed_name(value)).lower()


def parse_date(row: dict[str, str]) -> date | None:
    ym = re.sub(r"\D", "", str(row.get("deal_ym") or ""))
    day = re.sub(r"\D", "", str(row.get("deal_day") or ""))
    if len(ym) != 6 or not day:
        return None
    try:
        return date(int(ym[:4]), int(ym[4:6]), int(day))
    except ValueError:
        return None


def decimal_value(value: object) -> Decimal | None:
    raw = str(value or "").replace(",", "").strip()
    if not raw:
        return None
    try:
        return Decimal(raw)
    except InvalidOperation:
        return None


def rounded_int(value: object) -> int | None:
    number = decimal_value(value)
    if number is None:
        return None
    return int(number.quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def amount_eok(value: object) -> float | None:
    number = decimal_value(value)
    if number is None:
        return None
    return float((number / Decimal("10000")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def load_id_lookup() -> dict[tuple[str, str], str]:
    with DETAIL_PATH.open("r", encoding="utf-8") as handle:
        data = json.load(handle)

    lookup: dict[tuple[str, str], str] = {}
    if isinstance(data, dict):
        for complex_id, item in data.items():
            if not isinstance(item, dict):
                continue
            dong = str(item.get("dong") or "").strip()
            name = item.get("nm")
            if complex_id and dong and name:
                lookup[(dong, norm(name))] = str(complex_id)
    return lookup


def month_key(day: date) -> str:
    return f"{day.year:04d}-{day.month:02d}"


def add_months(year: int, month: int, delta: int) -> tuple[int, int]:
    index = year * 12 + month - 1 + delta
    return index // 12, index % 12 + 1


def main() -> None:
    if not CSV_PATH.exists():
        raise FileNotFoundError(f"Missing source CSV: {CSV_PATH}")
    if not DETAIL_PATH.exists():
        raise FileNotFoundError(f"Missing apartment detail data: {DETAIL_PATH}")

    data_until: date | None = None
    sale_months: Counter[str] = Counter()
    recent_heap: list[tuple[int, int, dict[str, object]]] = []
    sequence = 0

    with CSV_PATH.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        required = {
            "deal_type", "deal_ym", "deal_day", "deal_amount", "area_m2",
            "building_name", "umd_name", "dealing_gbn", "cdeal_type",
        }
        missing = required.difference(reader.fieldnames or [])
        if missing:
            raise RuntimeError("Missing CSV columns: " + ", ".join(sorted(missing)))

        for row in reader:
            deal_date = parse_date(row)
            if deal_date is None:
                continue
            if data_until is None or deal_date > data_until:
                data_until = deal_date

            if str(row.get("deal_type") or "").strip() != "아파트_매매":
                continue
            if str(row.get("cdeal_type") or "").strip() == "O":
                continue
            if decimal_value(row.get("deal_amount")) is None:
                continue

            # Monthly trend includes direct transactions, but not cancelled deals.
            sale_months[month_key(deal_date)] += 1

            # Homepage recent-deal ticker excludes direct transactions.
            if str(row.get("dealing_gbn") or "").strip() == "직거래":
                continue

            dong = str(row.get("umd_name") or "").strip()
            name = fixed_name(row.get("building_name"))
            record: dict[str, object] = {
                "dong": dong,
                "name": name,
                "area_m2": rounded_int(row.get("area_m2")),
                "amount_eok": amount_eok(row.get("deal_amount")),
                "date": deal_date.strftime("%Y.%m.%d"),
            }
            sequence += 1
            candidate = (deal_date.toordinal(), sequence, record)
            if len(recent_heap) < 3:
                heapq.heappush(recent_heap, candidate)
            elif candidate[:2] > recent_heap[0][:2]:
                heapq.heapreplace(recent_heap, candidate)

    if data_until is None:
        raise RuntimeError("No valid transaction dates in molit_kangseo.csv")

    id_lookup = load_id_lookup()
    recent_deals: list[dict[str, object]] = []
    for _, _, record in sorted(recent_heap, reverse=True):
        dong = str(record.get("dong") or "").strip()
        name = str(record.get("name") or "").strip()
        record["complex_id"] = id_lookup.get((dong, norm(name)))
        recent_deals.append(record)

    months: list[str] = []
    for delta in range(-5, 1):
        year, month = add_months(data_until.year, data_until.month, delta)
        months.append(f"{year:04d}-{month:02d}")

    payload = {
        "schema_version": 2,
        "generated_at": datetime.now(ZoneInfo("Asia/Seoul")).isoformat(timespec="seconds"),
        "data_until": data_until.isoformat(),
        "source": "국토교통부 실거래가 공개시스템",
        "scope": "서울특별시 강서구",
        "jeonse_ratio": None,
        "recent_deals": recent_deals,
        "monthly_trend": [
            {"month": month, "count": int(sale_months.get(month, 0))}
            for month in months
        ],
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUT_PATH.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    print(f"Built {OUT_PATH}: {len(recent_deals)} recent deals, data through {data_until}")


if __name__ == "__main__":
    main()
