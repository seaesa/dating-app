#!/usr/bin/env python3
"""
===================================================================
SQLITE VECTOR DB QUERY & INSPECTION UTILITY SCRIPT (Phase 3 Base Kit)
File: .agents/scripts/inspect_vector_db.py
Database Target: .agents/indexes/vector-store.sqlite
Engine: Cosine Similarity over 256-Dim L2-Normalized Vector Embeddings
===================================================================
"""

import os
import re
import sys
import math
import sqlite3
import json
import argparse

# Set UTF-8 Output Encoding for Windows PowerShell Compatibility
sys.stdout.reconfigure(encoding='utf-8')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
INDEX_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "indexes"))
DB_PATH = os.path.join(INDEX_DIR, "vector-store.sqlite")
EMBEDDING_DIM = 256


def compute_vector_embedding(text: str, dim: int = EMBEDDING_DIM) -> list[float]:
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


def cosine_similarity(v1: list[float], v2: list[float]) -> float:
    if len(v1) != len(v2):
        return 0.0
    return sum(a * b for a, b in zip(v1, v2))


def query_vector_db(search_term=None, top_k=5):
    if not os.path.exists(DB_PATH):
        print(f"[ERROR] SQLite Vector DB not found at: {DB_PATH}")
        print("Please run `.agents/scripts/build-index.ps1` to initialize the database.")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("====================================================")
    print("🔍 SQLITE VECTOR STORE DB INSPECTOR & VECTOR SEARCH ENGINE")
    print(f"Target DB File: {DB_PATH}")
    print(f"Database Size : {os.path.getsize(DB_PATH)} bytes")

    # Read Metadata
    try:
        meta_rows = cursor.execute("SELECT key, value FROM provenance_metadata").fetchall()
        meta = dict(meta_rows)
        engine_name = meta.get("engine", "sqlite3-vector-store")
        v_dim = meta.get("vector_dimension", "256")
        n_chunks = meta.get("indexed_chunks", "N/A")
        print(f"Engine        : {engine_name} ({v_dim}-dim)")
        print(f"Indexed Chunks: {n_chunks}")
    except Exception:
        pass
    print("====================================================")

    if search_term:
        print(f"[VECTOR QUERY] Computing 256-dim embedding & Cosine Similarity for: '{search_term}'\n")

        q_vec = compute_vector_embedding(search_term, dim=EMBEDDING_DIM)

        # 1. Search Vector Embeddings Table with Cosine Similarity
        cursor.execute("SELECT id, path, symbol, artifact_type, content_chunk, embedding_vector, commit_sha FROM vector_embeddings")
        all_vec_rows = cursor.fetchall()

        ranked_results = []
        for r in all_vec_rows:
            row_id, path, symbol, art_type, chunk, vec_str, sha = r
            try:
                doc_vec = json.loads(vec_str)
                score = cosine_similarity(q_vec, doc_vec)
            except Exception:
                score = 0.0

            ranked_results.append((score, row_id, path, symbol, art_type, chunk, sha))

        # Sort by similarity score descending
        ranked_results.sort(key=lambda x: x[0], reverse=True)

        print(f"1. Top Vector Embeddings Matches (Cosine Similarity Ranking, Top {top_k}):")
        for idx, (score, row_id, path, symbol, art_type, chunk, sha) in enumerate(ranked_results[:top_k], 1):
            snippet = chunk.replace("\n", " ")[:150]
            print(f"   - [Rank #{idx} | Score: {score:.4f}] Path: {path}")
            print(f"     Symbol: {symbol} | Type: {art_type} | ID: {row_id}")
            print(f"     Snippet: {snippet}...\n")

        # 2. Search Daily Session Memory Table
        cursor.execute("SELECT id, date, session_id, summary, digest_file, indexed_at FROM daily_session_memory")
        mem_rows = cursor.fetchall()

        ranked_memories = []
        for r in mem_rows:
            mem_id, date, sess_id, summary, digest, idx_at = r
            mem_vec = compute_vector_embedding(f"{summary} {sess_id} {date}", dim=EMBEDDING_DIM)
            score = cosine_similarity(q_vec, mem_vec)
            ranked_memories.append((score, mem_id, date, sess_id, summary, digest))

        ranked_memories.sort(key=lambda x: x[0], reverse=True)

        print(f"2. Daily Session Memory Matches (Top {top_k}):")
        if ranked_memories and ranked_memories[0][0] > 0.05:
            for score, mem_id, date, sess_id, summary, digest in ranked_memories[:top_k]:
                if score > 0.05:
                    print(f"   - [Score: {score:.4f} | ID {mem_id}] Date: {date} | Session: {sess_id}")
                    print(f"     Summary: {summary[:120]}")
                    print(f"     Digest : {digest}\n")
        else:
            print("   (No high-confidence memory matches found)\n")

    else:
        # Overview mode
        tables = cursor.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
        print(f"1. Registered Tables ({len(tables)} tables):")
        for t in tables:
            print(f"   - {t[0]}")

        memory_count = cursor.execute("SELECT COUNT(*) FROM daily_session_memory").fetchone()[0]
        vector_count = cursor.execute("SELECT COUNT(*) FROM vector_embeddings").fetchone()[0]

        print(f"\n2. Database Row Summary:")
        print(f"   - Daily Session Memories : {memory_count} rows")
        print(f"   - Vector Embeddings Chunks: {vector_count} rows (256-dim L2-normalized vectors)")

        if memory_count > 0:
            latest_mem = cursor.execute("SELECT date, session_id, summary, digest_file FROM daily_session_memory ORDER BY id DESC LIMIT 1").fetchone()
            print(f"\n3. Latest Memory Session ({latest_mem[0]}):")
            print(f"   - Session ID: {latest_mem[1]}")
            print(f"   - Summary   : {latest_mem[2][:120]}")
            print(f"   - Digest    : {latest_mem[3]}")

    print("====================================================")
    conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Query and inspect SQLite Vector Store DB using Cosine Similarity Vector Search")
    parser.add_argument("query", nargs="?", default=None, help="Search query string")
    parser.add_argument("--top", "-k", type=int, default=5, help="Number of top matches to display (default: 5)")
    args = parser.parse_args()

    query_vector_db(args.query, top_k=args.top)
