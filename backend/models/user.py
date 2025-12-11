from pydantic import BaseModel, EmailStr
from typing import Optional
from enum import Enum
from datetime import datetime

class UserRole(str, Enum):
    ADMIN = "admin"              # Full system access
    LOGISTICS_OFFICER = "logistics_officer"  # Can create/manage convoys
    COMMANDER = "commander"       # Can view and approve
    VIEWER = "viewer"            # Read-only access

class User(BaseModel):
    id: Optional[int] = None
    email: EmailStr
    full_name: str
    role: UserRole
    contact_number: Optional[str] = None
    created_at: Optional[datetime] = None

class UserCreate(BaseModel):
    """For user registration."""
    username: str
    email: EmailStr
    password: str
    full_name: str
    role: UserRole
    
class UserLogin(BaseModel):
    """For login requests."""
    full_name: str
    password: str
