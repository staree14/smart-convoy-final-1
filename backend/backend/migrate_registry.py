import psycopg2
from db_connection import get_connection

def migrate_registry_schema():
    conn = get_connection()
    if not conn:
        return

    cur = conn.cursor()
    try:
        print("⚠️  Starting Service Registry Migration...")
        print("    This will add 'password_hash' to 'service_registry' table.")

        # 1. Add column if not exists
        cur.execute("""
            ALTER TABLE service_registry 
            ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) 
            DEFAULT '$2b$12$Q6dhmKFF1EkrGSdz9ul7U.96o8xaRy1xyX9CIZSbx6WjUT80TCizO';
        """)
        print("✅ Added password_hash column to service_registry.")
        
        conn.commit()
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Migration failed: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate_registry_schema()
