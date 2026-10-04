#!/usr/bin/env python3
"""
===================================================================
SQLITE VECTOR DB ENGINE & BUILDER SCRIPT (Phase 3 Base Kit)
File: .agents/scripts/build_vector_db.py
Database: .agents/indexes/vector-store.sqlite
Features: Subword N-Gram Feature Hashing (256-Dim L2-Normalized Vector Embeddings)
===================================================================
"""

import os
import re
import math
import glob
import sqlite3
import json
import datetime
import sys
import subprocess

# Set encoding
sys.stdout.reconfigure(encoding='utf-8')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
AGENTS_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
PROJECT_ROOT = os.path.abspath(os.path.join(AGENTS_DIR, ".."))
INDEX_DIR = os.path.abspath(os.path.join(AGENTS_DIR, "indexes"))
DB_PATH = os.path.join(INDEX_DIR, "vector-store.sqlite")
EMBEDDING_DIM = 256


def compute_vector_embedding(text: str, dim: int = EMBEDDING_DIM) -> list[float]:
    """
    Generate a 256-dimensional L2-normalized vector embedding for text
    using subword n-grams and feature hashing (hashing trick).
    """
    words = re.findall(r'\w+', text.lower())
    if not words:
        return [0.0] * dim

    vec = [0.0] * dim

    features = []
    for word in words:
        features.append(f"w:{word}")
        if len(word) >= 3:
            for n in (3, 4):
                for i in range(len(word) - n + 1):
                    features.append(f"sub:{word[i:i+n]}")

    for feat in features:
        h = hash(feat)
        idx = abs(h) % dim
        sign = 1.0 if (h > 0) else -1.0
        vec[idx] += sign

    norm = math.sqrt(sum(v * v for v in vec))
    if norm > 0:
        return [round(v / norm, 6) for v in vec]
    return [0.0] * dim


def chunk_markdown_file(filepath: str) -> list[tuple[str, str, str]]:
    """
    Split markdown file into chunks by section headers.
    Returns list of (symbol/header, artifact_type, content_chunk).
    """
    rel_path = os.path.relpath(filepath, PROJECT_ROOT).replace("\\", "/")

    # Determine artifact type
    if "/rules/" in rel_path:
        art_type = "governance-rule"
    elif "/skills/" in rel_path:
        art_type = "agent-skill"
    elif "/workflows/" in rel_path:
        art_type = "workflow-command"
    elif "/agent/" in rel_path:
        art_type = "agent-persona"
    elif "/handoffs/" in rel_path:
        art_type = "handoff-record"
    elif "/memory/" in rel_path:
        art_type = "persistent-memory"
    else:
        art_type = "project-doc"

    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
    except Exception:
        return []

    lines = content.splitlines()
    chunks = []
    current_header = os.path.basename(filepath)
    current_lines = []

    for line in lines:
        if line.startswith("#"):
            if current_lines:
                chunk_text = "\n".join(current_lines).strip()
                if len(chunk_text) > 30:
                    chunks.append((current_header, art_type, chunk_text))
                current_lines = []
            current_header = line.lstrip("#").strip()
        current_lines.append(line)

    if current_lines:
        chunk_text = "\n".join(current_lines).strip()
        if len(chunk_text) > 30:
            chunks.append((current_header, art_type, chunk_text))

    return chunks


def get_current_git_sha() -> str:
    try:
        sha = subprocess.check_output(["git", "rev-parse", "HEAD"], stderr=subprocess.DEVNULL, cwd=PROJECT_ROOT).decode().strip()
        return sha[:8]
    except Exception:
        return "local-dev-commit"


def init_sqlite_vector_db():
    if not os.path.exists(INDEX_DIR):
        os.makedirs(INDEX_DIR, exist_ok=True)

    print(f"[START] Initializing SQLite Vector Database at: {DB_PATH}")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS vector_embeddings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT NOT NULL,
            symbol TEXT,
            artifact_type TEXT NOT NULL,
            content_chunk TEXT NOT NULL,
            embedding_vector TEXT NOT NULL, -- JSON array of 256 L2-normalized floats
            commit_sha TEXT NOT NULL,
            indexed_at TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS daily_session_memory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            session_id TEXT NOT NULL,
            summary TEXT NOT NULL,
            commit_shas TEXT,
            digest_file TEXT,
            indexed_at TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS provenance_metadata (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    # Clean old rows on rebuild
    cursor.execute("DELETE FROM vector_embeddings")
    cursor.execute("DELETE FROM daily_session_memory")

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    commit_sha = get_current_git_sha()

    # Collect all .md files to index
    target_files = []

    # 1. Project root MD files
    for root_md in ["GEMINI.md", "README.md"]:
        p = os.path.join(PROJECT_ROOT, root_md)
        if os.path.exists(p):
            target_files.append(p)

    # 2. .agents MD files (excluding .venv)
    for root, dirs, files in os.walk(AGENTS_DIR):
        if ".venv" in root or "__pycache__" in root:
            continue
        for file in files:
            if file.endswith(".md"):
                target_files.append(os.path.join(root, file))

    total_chunks = 0
    for filepath in target_files:
        rel_path = os.path.relpath(filepath, PROJECT_ROOT).replace("\\", "/")
        chunks = chunk_markdown_file(filepath)

        for symbol, art_type, chunk_text in chunks:
            # Generate REAL 256-dim embedding vector
            vec = compute_vector_embedding(chunk_text, dim=EMBEDDING_DIM)
            vec_json = json.dumps(vec)

            cursor.execute("""
                INSERT INTO vector_embeddings (path, symbol, artifact_type, content_chunk, embedding_vector, commit_sha, indexed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (rel_path, symbol, art_type, chunk_text, vec_json, commit_sha, now_iso))
            total_chunks += 1

    # Index handoffs and memory files into daily_session_memory
    handoff_dir = os.path.join(AGENTS_DIR, "handoffs")
    if os.path.exists(handoff_dir):
        for folder in sorted(os.listdir(handoff_dir)):
            folder_path = os.path.join(handoff_dir, folder)
            if os.path.isdir(folder_path):
                for md_file in sorted(glob.glob(os.path.join(folder_path, "*.md"))):
                    rel_md = os.path.relpath(md_file, PROJECT_ROOT).replace("\\", "/")
                    try:
                        with open(md_file, "r", encoding="utf-8", errors="ignore") as f:
                            text = f.read()
                        lines = [l.strip() for l in text.splitlines() if l.strip() and not l.startswith("---")]
                        summary = " ".join(lines[:5]) if lines else os.path.basename(md_file)
                        cursor.execute("""
                            INSERT INTO daily_session_memory (date, session_id, summary, commit_shas, digest_file, indexed_at)
                            VALUES (?, ?, ?, ?, ?, ?)
                        """, (datetime.date.today().isoformat(), os.path.basename(md_file), summary[:300], commit_sha, rel_md, now_iso))
                    except Exception:
                        pass

    # Update Provenance Metadata
    cursor.execute("INSERT OR REPLACE INTO provenance_metadata (key, value, updated_at) VALUES ('schema_version', '2', ?)", (now_iso,))
    cursor.execute("INSERT OR REPLACE INTO provenance_metadata (key, value, updated_at) VALUES ('engine', 'subword-ngram-vector-store-256d', ?)", (now_iso,))
    cursor.execute("INSERT OR REPLACE INTO provenance_metadata (key, value, updated_at) VALUES ('vector_dimension', '256', ?)", (now_iso,))
    cursor.execute("INSERT OR REPLACE INTO provenance_metadata (key, value, updated_at) VALUES ('indexed_chunks', ?, ?)", (str(total_chunks), now_iso))

    conn.commit()
    conn.close()

    print(f"[SUCCESS] SQLite Vector DB built successfully! Database File: {DB_PATH}")
    print(f"[INFO] Indexed {len(target_files)} Markdown files into {total_chunks} 256-dim Vector Embeddings chunks.")


if __name__ == "__main__":
    init_sqlite_vector_db()
