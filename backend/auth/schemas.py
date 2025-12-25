from pydantic import BaseModel, EmailStr, Field, BeforeValidator
from typing import Optional, Annotated

# Helper to convert MongoDB _id to string
PyObjectId = Annotated[str, BeforeValidator(str)]

# Base Schema (Shared properties)
class UserBase(BaseModel):
    email: EmailStr
    full_name: str | None = None  # <--- THIS IS CRITICAL. It must be here.

# Schema for Signup (Frontend sends this)
class UserCreate(UserBase):
    password: str
    # full_name is inherited from UserBase, so it is accepted here automatically.

# Schema for Reading Data (What we send back to Frontend)
class UserResponse(UserBase):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: Optional[int] = Field(default=None, alias="user_id")
    
    class Config:
        populate_by_name = True

# Schema for JWT Token
class Token(BaseModel):
    access_token: str
    token_type: str

# Schema for Clerk OAuth Callback
class ClerkCallback(BaseModel):
    email: EmailStr
    full_name: str | None = None

# Schema for User Profile
class UserProfileUpdate(BaseModel):
    learner_type: str | None = None  # researcher, student, professional, teacher, hobbyist, etc.
    age_group: str | None = None  # child, teen, young_adult, adult, senior
    learning_goals: list[str] | None = None
    preferred_learning_style: str | None = None  # visual, auditory, kinesthetic, reading
    interests: list[str] | None = None
    education_level: str | None = None  # high_school, undergraduate, graduate, professional

# Schema for Reading User Profile
class UserProfileResponse(UserBase):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: Optional[int] = Field(default=None, alias="user_id")
    learner_type: Optional[str] = None
    age_group: Optional[str] = None
    learning_goals: Optional[list[str]] = None
    preferred_learning_style: Optional[str] = None
    interests: Optional[list[str]] = None
    education_level: Optional[str] = None
    profile_complete: Optional[bool] = False
    
    class Config:
        populate_by_name = True
