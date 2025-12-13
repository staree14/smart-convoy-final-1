#!/usr/bin/env python3
"""
Migration script to add status column to convoys table.
Run this once to enable convoy status tracking.
"""
import psycopg2
from psycopg2.extras import RealDictCursor

# Database connection parameters (same as db_connection.py)
DB_CONFIG = {
    "dbname": "convoy_ai",
    "user": "postgres",
    "password": "prapti",
    "host": "localhost",
    "port": 5432
}

def run_migration():
    """Execute the convoy status migration SQL"""
    try:
        conn = psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)
        cur = conn.cursor()

        print("Running convoy status migration...")

        # Read and execute the SQL file
        with open('add_convoy_status.sql', 'r') as f:
            sql = f.read()

        cur.execute(sql)
        conn.commit()

        print("✓ Successfully added status column to convoys table")

        # Verify the column was added
        cur.execute("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name='convoys' AND column_name='status';
        """)
        result = cur.fetchone()

        if result:
            print(f"✓ Status column verified: {result['column_name']} ({result['data_type']}, default: {result['column_default']})")
        else:
            print("⚠ Warning: Could not verify status column")

        cur.close()
        conn.close()

    except Exception as e:
        print(f"✗ Migration failed: {e}")
        if conn:
            conn.rollback()
            conn.close()
        raise

if __name__ == "__main__":
    run_migration()
