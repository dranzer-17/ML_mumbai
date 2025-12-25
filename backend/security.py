from datetime import datetime, timedelta
from typing import Union, Any
from jose import jwt
from passlib.context import CryptContext
from config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

# Password Hashing Context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check if the plain password matches the hashed password."""
    # Truncate to 72 bytes for bcrypt compatibility
    return pwd_context.verify(plain_password[:72], hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password before storing it."""
    # Truncate to 72 bytes for bcrypt compatibility
    return pwd_context.hash(password[:72])

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    """Generate a JWT token using the SECRET_KEY."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt