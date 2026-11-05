from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..database import get_db
from ..models import User, Hall
from ..deps import require_admin

router = APIRouter(prefix="/halls", tags=["halls"])


class HallCreate(BaseModel):
    name: str
    block: str
    floor: int = 1
    capacity: int = 40
    is_active: bool = True


class HallUpdate(BaseModel):
    name: Optional[str] = None
    block: Optional[str] = None
    floor: Optional[int] = None
    capacity: Optional[int] = None
    is_active: Optional[bool] = None


@router.get("")
def list_halls(db: Session = Depends(get_db)):
    halls = db.query(Hall).order_by(Hall.block, Hall.floor, Hall.name).all()
    return [
        {
            "id": h.id,
            "name": h.name,
            "block": h.block,
            "floor": h.floor,
            "capacity": h.capacity,
            "is_active": h.is_active,
        }
        for h in halls
    ]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_hall(data: HallCreate, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    if db.query(Hall).filter(Hall.name == data.name.strip()).first():
        raise HTTPException(status_code=400, detail="Hall with this name already exists")

    hall = Hall(
        name=data.name.strip(),
        block=data.block.strip(),
        floor=data.floor,
        capacity=data.capacity,
        is_active=data.is_active,
    )
    db.add(hall)
    db.commit()
    db.refresh(hall)
    return {"success": True, "id": hall.id, "message": f"Hall {hall.name} created."}


@router.put("/{hall_id}")
def update_hall(hall_id: int, data: HallUpdate, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    hall = db.query(Hall).filter(Hall.id == hall_id).first()
    if not hall:
        raise HTTPException(status_code=404, detail="Hall not found")

    if data.name is not None:
        hall.name = data.name.strip()
    if data.block is not None:
        hall.block = data.block.strip()
    if data.floor is not None:
        hall.floor = data.floor
    if data.capacity is not None:
        hall.capacity = data.capacity
    if data.is_active is not None:
        hall.is_active = data.is_active

    db.commit()
    return {"success": True, "message": "Hall updated."}


@router.patch("/{hall_id}/toggle-active")
def toggle_hall_active(hall_id: int, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    hall = db.query(Hall).filter(Hall.id == hall_id).first()
    if not hall:
        raise HTTPException(status_code=404, detail="Hall not found")

    hall.is_active = not hall.is_active
    db.commit()
    return {"success": True, "is_active": hall.is_active, "message": f"Hall {hall.name} is now {'Active' if hall.is_active else 'Inactive'}."}


@router.delete("/{hall_id}")
def delete_hall(hall_id: int, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    hall = db.query(Hall).filter(Hall.id == hall_id).first()
    if not hall:
        raise HTTPException(status_code=404, detail="Hall not found")

    db.delete(hall)
    db.commit()
    return {"success": True, "message": "Hall deleted."}

