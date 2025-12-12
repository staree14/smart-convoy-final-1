#!/usr/bin/env python3
"""
Migration script to create checkpoint tables and insert mock data.
Run this once to set up the checkpoint system.
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
    """Execute the checkpoint schema SQL"""
    try:
        conn = psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)
        cur = conn.cursor()

        print("🚀 Running checkpoint migration...")

        # Read and execute the SQL file
        with open('schema_checkpoints.sql', 'r') as f:
            sql_script = f.read()

        cur.execute(sql_script)
        conn.commit()

        # Count inserted checkpoints
        cur.execute("SELECT COUNT(*) as count FROM checkpoints;")
        result = cur.fetchone()
        checkpoint_count = result['count']

        print(f"✅ Migration completed successfully!")
        print(f"📍 Created {checkpoint_count} military checkpoints across India")
        print("✓ checkpoints table created")
        print("✓ checkpoint_events table created")
        print("✓ merge_history table created")

        cur.close()
        conn.close()

    except psycopg2.Error as e:
        print(f"❌ Database error: {e}")
        return False
    except FileNotFoundError:
        print("❌ schema_checkpoints.sql file not found")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

    return True

if __name__ == "__main__":
    success = run_migration()
    exit(0 if success else 1)
