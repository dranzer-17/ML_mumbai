from pydantic import BaseModel, EmailStr
from typing import Optional

# 1. Model for User Sign Up (Input)
class UserCreate(BaseModel):
    email: EmailStr
    password: str

# 2. Model for User Login (Input)
class UserLogin(BaseModel):
    email: EmailStr
    password: str

# 3. Model for User Response (Output - Hides the password)
class UserOut(BaseModel):
    id: str
    email: EmailStr
    
    class Config:
        from_attributes = True

# 4. Model for the JWT Token (Output)
class Token(BaseModel):
    access_token: str
    token_type: str