from fastapi import APIRouter, HTTPException
from db_connection import get_connection
from utils.hashing import verify_password
from utils.auth_utils import create_access_token
from datetime import timedelta
import logging

# Set up logging to see errors in the console
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.options("/login")
async def login_options():
    """Handle OPTIONS preflight request for login endpoint"""
    return {"status": "ok"}

@router.post("/login")
def login_user(data: dict):
    # 1. READ INPUT
    service_no = data.get("service_no")
    password = data.get("password")

    if not service_no or not password:
        raise HTTPException(status_code=400, detail="Service number and password required")

    # Clean input (Remove spaces, force Uppercase)
    service_no_clean = service_no.strip().upper()

    conn = get_connection()
    cur = conn.cursor()

    try:
        # ---------------------------------------------------------
        # STEP 1: VERIFY IN SERVICE REGISTRY & CHECK PASSWORD
        # ---------------------------------------------------------
        logger.info(f"Verifying service number in registry: {service_no_clean}")
        cur.execute(
            "SELECT service_no, password_hash, name FROM service_registry WHERE service_no = %s",
            (service_no_clean,)
        )
        registry_user = cur.fetchone()
        
        if not registry_user:
             logger.warning(f"Login attempt failed: Service Number {service_no_clean} not found in registry.")
             raise HTTPException(status_code=401, detail="Invalid Service Number (Not in Registry)")

        # Verify Password against Registry Hash
        registry_hash = registry_user["password_hash"]
        if not verify_password(password, registry_hash):
             logger.warning(f"Invalid password for user {service_no_clean}")
             raise HTTPException(status_code=401, detail="Incorrect password")

        # ---------------------------------------------------------
        # STEP 2: ENSURE USER EXISTS IN 'USERS' TABLE (AUTO-CREATE / SYNC)
        # ---------------------------------------------------------
        # Since the user is valid in registry + password is correct, we ensure they have a 'users' row for foreign keys
        
        cur.execute("SELECT id FROM users WHERE service_no = %s", (service_no_clean,))
        existing_user = cur.fetchone()

        if existing_user:
            user_id = existing_user["id"]
        else:
            # User is in registry (valid personnel) but not in users table (not active/onboarded)
            logger.warning(f"User {service_no_clean} verified in registry but not present in users table.")
            raise HTTPException(status_code=403, detail="Account not activated. Please contact administrator.")

        # ---------------------------------------------------------
        # STEP 3: GENERATE TOKEN
        # ---------------------------------------------------------
        token = create_access_token(
            data={"user_id": user_id, "service_no": service_no_clean},
            expires_delta=timedelta(hours=12)
        )

        return {
            "status": "success",
            "message": "Login successful",
            "access_token": token,
            "token_type": "bearer",
            "user_id": user_id
        }

    except HTTPException as he:
        raise he

    except Exception as e:
        logger.error(f"CRITICAL SYSTEM ERROR: {str(e)}")
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=f"System Error: {str(e)}")

    finally:
        if cur: cur.close()
        if conn: conn.close()
