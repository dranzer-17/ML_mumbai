from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt

from database import db, get_next_sequence
from auth.schemas import UserCreate, Token, UserResponse, ClerkCallback, UserProfileUpdate, UserProfileResponse
from auth.security import get_password_hash, verify_password, create_access_token
from config import SECRET_KEY, ALGORITHM
from logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/auth", tags=["Auth"])

# Dependency setup for protecting routes
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme)):
    logger.info("=" * 80)
    logger.info(f"[GET_CURRENT_USER START] Token validation requested")
    logger.info(f"[GET_CURRENT_USER] Token length: {len(token)}")
    logger.info(f"[GET_CURRENT_USER] Token preview: {token[:20]}...")
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        logger.info(f"[GET_CURRENT_USER] Decoding JWT token")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        logger.info(f"[GET_CURRENT_USER] Token decoded successfully")
        logger.info(f"[GET_CURRENT_USER] Payload keys: {list(payload.keys())}")
        
        email: str = payload.get("sub")
        if email is None:
            logger.warning("[GET_CURRENT_USER FAILED] Token validation failed: Missing email in payload")
            logger.info("=" * 80)
            raise credentials_exception
        
        logger.info(f"[GET_CURRENT_USER] Email from token: {email}")
        logger.info(f"[GET_CURRENT_USER] Token expiry: {payload.get('exp')}")
        
    except JWTError as e:
        logger.warning(f"[GET_CURRENT_USER FAILED] JWT decode error: {type(e).__name__} - {e}")
        logger.info("=" * 80)
        raise credentials_exception
    
    logger.info(f"[GET_CURRENT_USER] Querying MongoDB for user: {email}")
    user = db["users"].find_one({"email": email})
    if user is None:
        logger.warning(f"[GET_CURRENT_USER FAILED] User not found in database: {email}")
        logger.info("=" * 80)
        raise credentials_exception
    
    logger.info(f"[GET_CURRENT_USER SUCCESS] User found: {email}, user_id: {user.get('user_id')}")
    logger.info("=" * 80)
    return user

# --- ROUTES ---

@router.post("/signup", response_model=Token)
def signup(user: UserCreate):
    logger.info("=" * 80)
    logger.info(f"[SIGNUP START] Email: {user.email}")
    logger.info(f"[SIGNUP] Full name provided: {user.full_name if user.full_name else 'None'}")
    
    # Check if user already exists
    logger.info(f"[SIGNUP] Checking if email already exists: {user.email}")
    existing_user = db["users"].find_one({"email": user.email})
    if existing_user:
        # Check if user signed up with Google
        if "hashed_password" not in existing_user or not existing_user.get("hashed_password"):
            logger.warning(f"[SIGNUP FAILED] Email already registered with Google: {user.email}")
            logger.info("=" * 80)
            raise HTTPException(status_code=400, detail="Email already registered with Google. Please sign in with Google.")
        else:
            logger.warning(f"[SIGNUP FAILED] Email already registered: {user.email}")
            logger.info("=" * 80)
            raise HTTPException(status_code=400, detail="Email already registered")
    logger.info(f"[SIGNUP] Email is available: {user.email}")
    
    # Validate password length
    logger.info(f"[SIGNUP] Validating password length (provided: {len(user.password)} chars)")
    if len(user.password) > 72:
        logger.warning(f"[SIGNUP FAILED] Password too long ({len(user.password)} chars) for email: {user.email}")
        logger.info("=" * 80)
        raise HTTPException(
            status_code=400, 
            detail="Password is too long (maximum 72 characters)"
        )
    logger.info(f"[SIGNUP] Password length valid")
    
    # Hash password and save
    try:
        logger.info(f"[SIGNUP] Converting user data to dict")
        user_dict = user.model_dump()
        
        logger.info(f"[SIGNUP] Generating user_id sequence")
        user_dict["user_id"] = get_next_sequence("users")
        logger.info(f"[SIGNUP] Generated user_id: {user_dict['user_id']}")
        
        logger.info(f"[SIGNUP] Hashing password using bcrypt")
        user_dict["hashed_password"] = get_password_hash(user.password)
        logger.info(f"[SIGNUP] Password hashed successfully (length: {len(user_dict['hashed_password'])})")
        
        del user_dict["password"]
        logger.info(f"[SIGNUP] Removed plain password from user data")
        
        logger.info(f"[SIGNUP] Inserting user into MongoDB")
        result = db["users"].insert_one(user_dict)
        logger.info(f"[SIGNUP] User inserted successfully with _id: {result.inserted_id}")
        
        # Auto-login (Generate Token)
        logger.info(f"[SIGNUP] Generating JWT access token for: {user.email}")
        access_token = create_access_token(data={"sub": user.email})
        logger.info(f"[SIGNUP] Access token generated (length: {len(access_token)})")
        
        logger.info(f"[SIGNUP SUCCESS] User {user.email} registered and logged in (user_id: {user_dict['user_id']})")
        logger.info("=" * 80)
        return {"access_token": access_token, "token_type": "bearer"}
    except ValueError as e:
        logger.error(f"[SIGNUP ERROR] ValueError for {user.email}: {e}")
        logger.info("=" * 80)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"[SIGNUP ERROR] Unexpected error for {user.email}: {type(e).__name__} - {e}")
        logger.info("=" * 80)
        raise HTTPException(status_code=500, detail="Internal server error during signup")

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    logger.info("=" * 80)
    logger.info(f"[LOGIN START] Username (email): {form_data.username}")
    logger.info(f"[LOGIN] Password length: {len(form_data.password)} chars")
    logger.info(f"[LOGIN] OAuth2 scopes requested: {form_data.scopes}")
    
    # OAuth2PasswordRequestForm expects 'username' and 'password'
    logger.info(f"[LOGIN] Querying MongoDB for user with email: {form_data.username}")
    user = db["users"].find_one({"email": form_data.username})
    
    if not user:
        logger.warning(f"[LOGIN FAILED] User not found in database: {form_data.username}")
        logger.info("=" * 80)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    logger.info(f"[LOGIN] User found in database: {form_data.username}")
    logger.info(f"[LOGIN] User _id: {user.get('_id')}, user_id: {user.get('user_id')}")
    logger.info(f"[LOGIN] User has hashed_password: {'Yes' if 'hashed_password' in user else 'NO - MISSING!'}")
    
    if "hashed_password" not in user:
        logger.error(f"[LOGIN FAILED] User {form_data.username} has no hashed_password field!")
        logger.info("=" * 80)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    logger.info(f"[LOGIN] Verifying password with bcrypt")
    try:
        password_valid = verify_password(form_data.password, user["hashed_password"])
        logger.info(f"[LOGIN] Password verification result: {'VALID' if password_valid else 'INVALID'}")
    except Exception as e:
        logger.error(f"[LOGIN ERROR] Password verification exception: {type(e).__name__} - {e}")
        logger.info("=" * 80)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not password_valid:
        logger.warning(f"[LOGIN FAILED] Invalid password for email: {form_data.username}")
        logger.info("=" * 80)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    logger.info(f"[LOGIN] Password verified successfully")
    logger.info(f"[LOGIN] Generating JWT access token for: {user['email']}")
    access_token = create_access_token(data={"sub": user["email"]})
    logger.info(f"[LOGIN] Access token generated (length: {len(access_token)})")
    
    logger.info(f"[LOGIN SUCCESS] User {form_data.username} logged in successfully")
    logger.info("=" * 80)
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/clerk-callback", response_model=Token)
def clerk_callback(callback_data: ClerkCallback):
    logger.info("=" * 80)
    logger.info(f"[CLERK_CALLBACK START] Email: {callback_data.email}")
    logger.info(f"[CLERK_CALLBACK] Full name: {callback_data.full_name if callback_data.full_name else 'None'}")
    
    # Check if user already exists
    logger.info(f"[CLERK_CALLBACK] Checking if email already exists: {callback_data.email}")
    existing_user = db["users"].find_one({"email": callback_data.email})
    
    if existing_user:
        # User exists - check if they have a password (email/password signup)
        if "hashed_password" in existing_user and existing_user["hashed_password"]:
            logger.warning(f"[CLERK_CALLBACK FAILED] Email already registered with password: {callback_data.email}")
            logger.info("=" * 80)
            raise HTTPException(
                status_code=400, 
                detail="Email already registered. Please use email/password login."
            )
        else:
            # User exists but signed up with Google before - just generate token
            logger.info(f"[CLERK_CALLBACK] User exists (OAuth user), generating token: {callback_data.email}")
            access_token = create_access_token(data={"sub": callback_data.email})
            logger.info(f"[CLERK_CALLBACK SUCCESS] User {callback_data.email} logged in via Google")
            logger.info("=" * 80)
            return {"access_token": access_token, "token_type": "bearer"}
    
    # New user - create account
    logger.info(f"[CLERK_CALLBACK] Creating new user for: {callback_data.email}")
    try:
        user_dict = {
            "email": callback_data.email,
            "full_name": callback_data.full_name,
            "user_id": get_next_sequence("users"),
            "auth_provider": "google"
        }
        
        logger.info(f"[CLERK_CALLBACK] Generated user_id: {user_dict['user_id']}")
        logger.info(f"[CLERK_CALLBACK] Inserting user into MongoDB")
        result = db["users"].insert_one(user_dict)
        logger.info(f"[CLERK_CALLBACK] User inserted successfully with _id: {result.inserted_id}")
        
        # Generate token
        logger.info(f"[CLERK_CALLBACK] Generating JWT access token for: {callback_data.email}")
        access_token = create_access_token(data={"sub": callback_data.email})
        logger.info(f"[CLERK_CALLBACK] Access token generated (length: {len(access_token)})")
        
        logger.info(f"[CLERK_CALLBACK SUCCESS] User {callback_data.email} registered and logged in via Google (user_id: {user_dict['user_id']})")
        logger.info("=" * 80)
        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        logger.error(f"[CLERK_CALLBACK ERROR] Unexpected error for {callback_data.email}: {type(e).__name__} - {e}")
        logger.info("=" * 80)
        raise HTTPException(status_code=500, detail="Internal server error during Clerk callback")

@router.get("/me", response_model=UserProfileResponse)
def read_users_me(current_user: dict = Depends(get_current_user)):
    logger.info("=" * 80)
    logger.info(f"[GET /me] Request received for user: {current_user.get('email')}")
    
    # Check if profile is complete
    profile_complete = bool(
        current_user.get('learner_type') and
        current_user.get('age_group')
    )
    current_user['profile_complete'] = profile_complete
    
    logger.info(f"[GET /me] Returning user data: user_id={current_user.get('user_id')}, full_name={current_user.get('full_name')}, profile_complete={profile_complete}")
    logger.info("=" * 80)
    return current_user

@router.put("/profile", response_model=UserProfileResponse)
def update_profile(
    profile_data: UserProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    logger.info("=" * 80)
    logger.info(f"[UPDATE_PROFILE START] User: {current_user.get('email')}")
    logger.info(f"[UPDATE_PROFILE] Profile data: {profile_data.model_dump(exclude_none=True)}")
    
    try:
        # Prepare update data (only include non-None values)
        update_data = profile_data.model_dump(exclude_none=True)
        
        if not update_data:
            logger.warning("[UPDATE_PROFILE] No data to update")
            logger.info("=" * 80)
            raise HTTPException(status_code=400, detail="No profile data provided")
        
        # Update user in database
        result = db["users"].update_one(
            {"email": current_user.get("email")},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            logger.error(f"[UPDATE_PROFILE ERROR] User not found: {current_user.get('email')}")
            logger.info("=" * 80)
            raise HTTPException(status_code=404, detail="User not found")
        
        # Fetch updated user
        updated_user = db["users"].find_one({"email": current_user.get("email")})
        
        # Check if profile is complete
        profile_complete = bool(
            updated_user.get('learner_type') and
            updated_user.get('age_group')
        )
        updated_user['profile_complete'] = profile_complete
        
        logger.info(f"[UPDATE_PROFILE SUCCESS] Profile updated for {current_user.get('email')}")
        logger.info(f"[UPDATE_PROFILE] Profile complete: {profile_complete}")
        logger.info("=" * 80)
        
        return updated_user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[UPDATE_PROFILE ERROR] Unexpected error: {type(e).__name__} - {e}")
        logger.info("=" * 80)
        raise HTTPException(status_code=500, detail="Internal server error during profile update")
