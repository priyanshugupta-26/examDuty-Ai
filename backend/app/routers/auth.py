from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..schemas import UserLogin, Token, UserOut
from ..auth import verify_password, create_access_token
from ..deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    email = login_data.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "InvalidCredentials", "message": "Invalid email or password", "details": None}
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "AccountDisabled", "message": "This account is inactive", "details": None}
        )
    
    token = create_access_token(subject=user.id, role=user.role)
    return Token(access_token=token, token_type="bearer", user=UserOut.model_validate(user))

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)

@router.get("/demo-users")
def get_demo_users():
    """Returns sample login credentials for quick evaluation during demo."""
    return [
        {
            "role": "admin",
            "name": "VFSTR Exam Cell Controller",
            "email": "admin@vfstr.ac.in",
            "password": "admin123",
            "badge": "Admin / Exam Cell"
        },
        {
            "role": "faculty",
            "name": "Dr. K. Rao (CSE)",
            "email": "k.rao@vfstr.ac.in",
            "password": "faculty123",
            "badge": "Faculty (Demo Sick Leave)"
        },
        {
            "role": "faculty",
            "name": "Dr. P. Sharma (ECE)",
            "email": "p.sharma@vfstr.ac.in",
            "password": "faculty123",
            "badge": "Faculty"
        }
    ]

