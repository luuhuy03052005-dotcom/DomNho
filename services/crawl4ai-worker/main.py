from __future__ import annotations

import argparse
import json
import os
import sys

from crawler_engine import run_crawl_sync, run_scrape_sync

RESULT_PREFIX = "__CRAWL4AI_RESULT__"


def emit(payload: dict) -> None:
    print(f"{RESULT_PREFIX}{json.dumps(payload, ensure_ascii=False, separators=(',', ':'))}")


def main() -> int:
    os.environ.setdefault("PYTHONUTF8", "1")
    os.environ.setdefault("CRAWL4AI_NO_CLOUD_NOTICE", "1")
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(description="Đốm Nhỏ Crawl4AI worker")
    parser.add_argument("--mode", choices=["crawl", "scrape"], default="crawl")
    parser.add_argument("--stdin-json", action="store_true")
    args = parser.parse_args()

    try:
        payload = json.loads(sys.stdin.read() or "{}") if args.stdin_json else {}
        if args.mode == "scrape":
            result = run_scrape_sync(str(payload.get("url") or ""), str(payload.get("note") or ""))
            emit({"ok": True, "spot": result})
        else:
            emit({"ok": True, **run_crawl_sync(payload)})
        return 0
    except Exception as error:
        print(f"Crawl4AI worker failed: {error}", file=sys.stderr)
        emit({"ok": False, "error": str(error)})
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
