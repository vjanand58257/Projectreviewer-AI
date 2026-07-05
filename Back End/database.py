import sqlite3
import os
from config import Config

def get_db_connection():
    """Establishes and returns a database connection for SQLite."""
    # Ensure instance folder exists
    db_path = Config.SQLALCHEMY_DATABASE_URI.replace("sqlite:///", "")
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row  # Enables access by column name
    return conn

def init_db():
    """Initializes the database schema if it doesn't already exist."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            analysis_id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            project_name TEXT NOT NULL,
            overall_score INTEGER,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            results TEXT
        )
    """)
    conn.commit()
    conn.close()

def save_report(analysis_id, project_id, project_name, overall_score, status, created_at, results_json):
    """Saves or updates an analysis report in the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO reports (analysis_id, project_id, project_name, overall_score, status, created_at, results)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(analysis_id) DO UPDATE SET
            status=excluded.status,
            overall_score=excluded.overall_score,
            results=excluded.results
    """, (analysis_id, project_id, project_name, overall_score, status, created_at, results_json))
    conn.commit()
    conn.close()

def get_report(analysis_id):
    """Fetches a specific report by its analysis ID."""
    conn = get_db_connection()
    row = conn.execute("SELECT * FROM reports WHERE analysis_id = ?", (analysis_id,)).fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def list_reports(limit=10, offset=0):
    """Lists past reports with pagination."""
    conn = get_db_connection()
    rows = conn.execute(
        "SELECT analysis_id, project_id, project_name, overall_score, status, created_at FROM reports ORDER BY created_at DESC LIMIT ? OFFSET ?",
        (limit, offset)
    ).fetchall()
    total = conn.execute("SELECT COUNT(*) FROM reports").fetchone()[0]
    conn.close()
    return [dict(r) for r in rows], total

