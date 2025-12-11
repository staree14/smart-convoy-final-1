from fastapi import APIRouter, HTTPException
from db_connection import get_connection
from utils.hashing import hash_password, verify_password
from utils.auth_utils import create_access_token
from pydantic import BaseModel
from datetime import timedelta

router = APIRouter()

# Request models
class RegisterRequest(BaseModel):
    name: str
    email: str
    phone_number: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

# ------------------ REGISTER ------------------

@router.post("/register")
def register_user(data: RegisterRequest):
    name = data.name
    email = data.email
    phone_number = data.phone_number
    password = data.password

    if not all([name, email, phone_number, password]):
        raise HTTPException(status_code=400, detail="All fields required")

    hashed = hash_password(password)

    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            INSERT INTO users (name, email, phone_number, password_hash, role)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING user_id;
        """, (name, email, phone_number, hashed, "officer"))

        user_id = cur.fetchone()["user_id"]
        conn.commit()

        # Create JWT token for new user
        token = create_access_token(
            data={"user_id": user_id, "email": email},
            expires_delta=timedelta(days=1)
        )

        return {
            "message": "Registration successful",
            "user_id": user_id,
            "access_token": token,
            "token_type": "bearer"
        }

    except Exception as e:
        print(f"[REGISTRATION ERROR] {type(e).__name__}: {str(e)}")
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))

    finally:
        conn.close()


# ------------------ LOGIN ------------------

@router.post("/login")
def login_user(data: LoginRequest):
    email = data.email
    password = data.password

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required")

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT user_id, password_hash FROM users WHERE email=%s;", (email,))
    user = cur.fetchone()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user_id = user["user_id"]
    hashed_pw = user["password_hash"]

    if not verify_password(password, hashed_pw):
        raise HTTPException(status_code=401, detail="Incorrect password")

    # Generate JWT Token
    token = create_access_token(
        data={"user_id": user_id, "email": email},
        expires_delta=timedelta(days=1)
    )

    return {
        "message": "Login successful",
        "user_id": user_id,
        "access_token": token,
        "token_type": "bearer"
    }