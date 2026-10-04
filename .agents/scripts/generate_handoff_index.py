#!/usr/bin/env python3
"""
generate_handoff_index.py
Quét toàn bộ .agents/handoffs/*/*.md, đọc YAML frontmatter,
tổng hợp và sinh ra HANDOFF_INDEX.md — bảng điều phối tập trung.
"""

import os
import re
from datetime import datetime, timezone
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
AGENTS_DIR = SCRIPT_DIR.parent
HANDOFFS_DIR = AGENTS_DIR / "handoffs"
OUTPUT_FILE = HANDOFFS_DIR / "HANDOFF_INDEX.md"

# Status icons
STATUS_ICONS = {
    "in-progress": "🔄",
    "done": "✅",
    "blocked": "⚠️",
    "pending": "🟡",
    "review": "👁️",
    "abandoned": "❌",
}


def parse_frontmatter(filepath: Path) -> dict:
    """Đọc và parse YAML frontmatter từ file markdown."""
    text = filepath.read_text(encoding="utf-8", errors="ignore")
    match = re.match(r"^---\s*\n(.*?)\n---", text, re.DOTALL)
    if not match:
        return {}

    meta = {}
    for line in match.group(1).splitlines():
        if ":" in line:
            key, _, val = line.partition(":")
            meta[key.strip()] = val.strip()
    return meta


def scan_handoffs() -> tuple[list, list, list]:
    """
    Quét tất cả handoff files.
    Trả về (in_progress, pending, done) — mỗi item là dict metadata.
    """
    in_progress, pending, done = [], [], []

    for folder in sorted(HANDOFFS_DIR.iterdir()):
        if not folder.is_dir():
            continue

        for md_file in sorted(folder.glob("*.md")):
            # Bỏ qua US master tracker (chứa us_id) và README
            meta = parse_frontmatter(md_file)
            if not meta or "task_id" not in meta:
                continue

            # Resolve relative path từ project root
            try:
                rel_path = md_file.relative_to(AGENTS_DIR.parent)
            except ValueError:
                rel_path = md_file

            entry = {
                "task_id": meta.get("task_id", "—"),
                "parent_us": meta.get("parent_us", "—"),
                "title": _extract_title(md_file),
                "owner": meta.get("owner", "unassigned"),
                "next_owner": meta.get("next_owner", "—"),
                "branch": meta.get("branch", "—"),
                "head_sha": meta.get("head_sha", "—")[:8] if meta.get("head_sha") else "—",
                "status": meta.get("status", "pending"),
                "updated_at": meta.get("updated_at", "—"),
                "path": str(rel_path).replace("\\", "/"),
            }

            status = entry["status"]
            if status == "done":
                done.append(entry)
            elif status in ("in-progress", "review", "blocked"):
                in_progress.append(entry)
            else:
                pending.append(entry)

    return in_progress, pending, done


def _extract_title(filepath: Path) -> str:
    """Lấy dòng tiêu đề H1 từ file markdown."""
    for line in filepath.read_text(encoding="utf-8", errors="ignore").splitlines():
        stripped = line.strip()
        if stripped.startswith("# ") and "---" not in stripped:
            # Bỏ ký tự # và phần ID ở đầu (VD: # US-01 — ..., # TASK-1 - ...)
            title = re.sub(r"^#+\s*([A-Za-z0-9_-]+)\s*[—–-]+\s*", "", stripped)
            # Nếu regex trên bóc cả chuỗi mà không còn lại gì, fallback bóc chỉ #
            if not title.strip():
                title = re.sub(r"^#+\s*", "", stripped)
            return title.strip() or filepath.stem
    return filepath.stem


def _status_label(status: str) -> str:
    icon = STATUS_ICONS.get(status, "❓")
    return f"{icon} {status}"


def _row_in_progress(e: dict) -> str:
    task_link = f"[{e['task_id']}](./{e['path']})"
    return (
        f"| {task_link} | {e['parent_us']} | {e['title']} "
        f"| `{e['owner']}` | `{e['branch']}` "
        f"| {_status_label(e['status'])} |"
    )


def _row_pending(e: dict) -> str:
    task_link = f"[{e['task_id']}](./{e['path']})"
    return (
        f"| {task_link} | {e['parent_us']} | {e['title']} "
        f"| `{e['next_owner']}` | {e['updated_at']} |"
    )


def _row_done(e: dict) -> str:
    task_link = f"[{e['task_id']}](./{e['path']})"
    sha = f"`{e['head_sha']}`" if e["head_sha"] != "—" else "—"
    return (
        f"| {task_link} | {e['parent_us']} | {e['title']} "
        f"| {sha} | {e['updated_at']} |"
    )


def scan_handoffs_by_us() -> dict:
    """
    Quét toàn bộ handoff files, nhóm theo parent_us.
    Trả về dict: { us_id -> { "title": str, "folder": str, "tasks": [entry] } }
    """
    us_map: dict = {}

    for folder in sorted(HANDOFFS_DIR.iterdir()):
        if not folder.is_dir():
            continue

        # Đọc US master tracker để lấy title (file có us_id trong frontmatter)
        us_title = folder.name  # fallback
        for md_file in folder.glob("*.md"):
            meta = parse_frontmatter(md_file)
            if meta.get("us_id"):
                us_title = _extract_title(md_file) or folder.name
                break

        for md_file in sorted(folder.glob("*.md")):
            meta = parse_frontmatter(md_file)
            if not meta or "task_id" not in meta:
                continue

            try:
                rel_path = md_file.relative_to(AGENTS_DIR.parent)
            except ValueError:
                rel_path = md_file

            entry = {
                "task_id": meta.get("task_id", "—"),
                "title": _extract_title(md_file),
                "owner": meta.get("owner", "unassigned"),
                "branch": meta.get("branch", "—"),
                "head_sha": meta.get("head_sha", "—")[:8] if meta.get("head_sha") else "—",
                "status": meta.get("status", "pending"),
                "updated_at": meta.get("updated_at", "—"),
                "path": str(rel_path).replace("\\", "/"),
            }

            us_id = meta.get("parent_us", folder.name)
            if us_id not in us_map:
                us_map[us_id] = {
                    "title": us_title,
                    "folder": folder.name,
                    "tasks": [],
                }
            us_map[us_id]["tasks"].append(entry)

    return us_map


def _us_overall_status(tasks: list) -> str:
    """Tính trạng thái tổng hợp của một US từ danh sách tasks."""
    statuses = {t["status"] for t in tasks}
    if "in-progress" in statuses or "review" in statuses or "blocked" in statuses:
        return "🔄 active"
    if all(s == "done" for s in statuses):
        return "✅ done"
    return "🟡 pending"


def generate_index(in_progress: list, pending: list, done: list) -> str:
    """Wrapper kept for backward compat — calls grouped version."""
    us_map = scan_handoffs_by_us()
    return generate_index_by_us(us_map)


def generate_index_by_us(us_map: dict) -> str:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    total_tasks = sum(len(v["tasks"]) for v in us_map.values())
    active_us   = sum(1 for v in us_map.values() if _us_overall_status(v["tasks"]) == "🔄 active")
    done_us     = sum(1 for v in us_map.values() if _us_overall_status(v["tasks"]) == "✅ done")
    pending_us  = len(us_map) - active_us - done_us

    lines = [
        "# 📋 Handoff Index — Bảng Điều phối Tập trung",
        "",
        "> **Auto-generated** bởi `generate_handoff_index.py`. Cập nhật tự động khi chạy `build-index.ps1`.",
        f"> **Last Updated:** `{now}` | **US:** `{len(us_map)}` | **Tasks:** `{total_tasks}` "
        f"(🔄 {active_us} active | 🟡 {pending_us} pending | ✅ {done_us} done)",
        "",
        "---",
        "",
    ]

    if not us_map:
        lines.append("_Chưa có User Story nào._")
        lines.append("")
    else:
        lines.append("| US | Tên User Story | Tasks | 🔄 | 🟡 | ✅ | Status | Owner |")
        lines.append("|---|---|:---:|:---:|:---:|:---:|---|---|")
        for us_id, us in sorted(us_map.items()):
            tasks      = us["tasks"]
            n_active   = sum(1 for t in tasks if t["status"] in ("in-progress", "review", "blocked"))
            n_pending  = sum(1 for t in tasks if t["status"] == "pending")
            n_done     = sum(1 for t in tasks if t["status"] == "done")
            owners     = sorted({t["owner"] for t in tasks if t["owner"] != "unassigned"})
            owner_str  = ", ".join(f"`{o}`" for o in owners) if owners else "—"
            status_str = _us_overall_status(tasks)
            # Link to US folder
            us_link    = f"[{us_id}](./{us['folder']}/)"
            lines.append(
                f"| {us_link} | {us['title']} | {len(tasks)} "
                f"| {n_active or '—'} | {n_pending or '—'} | {n_done or '—'} "
                f"| {status_str} | {owner_str} |"
            )
        lines.append("")

    lines.append("---")
    lines.append("")
    lines.append(
        "_Để xem chi tiết task của US: mở thư mục `.agents/handoffs/<US-ID>_<slug>/`. "
        "Để cập nhật: sửa frontmatter `status` trong file task `.md`, "
        "sau đó chạy `build-index.ps1` hoặc `py .agents/scripts/generate_handoff_index.py`._"
    )

    return "\n".join(lines) + "\n"


def main():
    if not HANDOFFS_DIR.exists():
        print(f"[WARN] Handoffs directory not found: {HANDOFFS_DIR}")
        return

    us_map = scan_handoffs_by_us()
    content = generate_index_by_us(us_map)

    OUTPUT_FILE.write_text(content, encoding="utf-8")
    total = sum(len(v["tasks"]) for v in us_map.values())
    active = sum(1 for v in us_map.values() if _us_overall_status(v["tasks"]) == "🔄 active")
    done   = sum(1 for v in us_map.values() if _us_overall_status(v["tasks"]) == "✅ done")
    print(f"[OK] Generated HANDOFF_INDEX.md — {len(us_map)} US, {total} tasks "
          f"({active} active, {done} done)")


if __name__ == "__main__":
    main()
