import sys
import sqlite3
import json

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'nodes': 0, 'edges': 0, 'embeddings': 0}))
        return
    
    db_path = sys.argv[1]
    try:
        conn = sqlite3.connect(db_path)
        tables = [t[0] for t in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
        
        nodes = conn.execute("SELECT COUNT(*) FROM nodes").fetchone()[0] if 'nodes' in tables else 0
        edges = conn.execute("SELECT COUNT(*) FROM edges").fetchone()[0] if 'edges' in tables else 0
        
        embeddings = 0
        if 'embeddings' in tables:
            embeddings = conn.execute("SELECT COUNT(*) FROM embeddings").fetchone()[0]
        elif 'node_embeddings' in tables:
            embeddings = conn.execute("SELECT COUNT(*) FROM node_embeddings").fetchone()[0]
        
        print(json.dumps({'nodes': nodes, 'edges': edges, 'embeddings': embeddings}))
    except Exception:
        print(json.dumps({'nodes': 0, 'edges': 0, 'embeddings': 0}))

if __name__ == '__main__':
    main()
