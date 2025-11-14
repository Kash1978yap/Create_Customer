"""
High School Management System API

A super simple FastAPI application that allows students to view and sign up
for extracurricular activities at Mergington High School.
"""

from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
import os
from pathlib import Path

app = FastAPI(title="Mergington High School API",
              description="API for viewing and signing up for extracurricular activities")

# Mount the static files directory
current_dir = Path(__file__).parent
app.mount("/static", StaticFiles(directory=os.path.join(Path(__file__).parent,
          "static")), name="static")

# In-memory activity database
activities = {
    "Chess Club": {
        "description": "Learn strategies and compete in chess tournaments",
        "schedule": "Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 12,
        "participants": ["michael@mergington.edu", "daniel@mergington.edu"]
    },
    "Programming Class": {
        "description": "Learn programming fundamentals and build software projects",
        "schedule": "Tuesdays and Thursdays, 3:30 PM - 4:30 PM",
        "max_participants": 20,
        "participants": ["emma@mergington.edu", "sophia@mergington.edu"]
    },
    "Gym Class": {
        "description": "Physical education and sports activities",
        "schedule": "Mondays, Wednesdays, Fridays, 2:00 PM - 3:00 PM",
        "max_participants": 30,
        "participants": ["john@mergington.edu", "olivia@mergington.edu"]
    }
}


# SQLite + SQLAlchemy setup for customers persistence
DATABASE_URL = "sqlite:///./customers.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class CustomerORM(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    middle_name = Column(String, nullable=True)
    last_name = Column(String, nullable=False)
    dob = Column(String, nullable=False)
    address_line_1 = Column(String, nullable=False)
    zip_code = Column(String, nullable=False)
    city = Column(String, nullable=False)
    state = Column(String, nullable=False)
    country = Column(String, nullable=False)


class Customer(BaseModel):
    first_name: str = Field(..., example="Jane")
    middle_name: str | None = Field(None, example="A.")
    last_name: str = Field(..., example="Doe")
    dob: str = Field(..., example="2000-01-01")
    address_line_1: str = Field(..., example="123 Main St")
    zip_code: str = Field(..., example="12345")
    city: str = Field(..., example="Anytown")
    state: str = Field(..., example="CA")
    country: str = Field(..., example="USA")

    class Config:
        orm_mode = True


# Create tables
Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")


@app.get("/activities")
def get_activities():
    return activities


@app.get("/customers")
def get_customers(db: Session = Depends(get_db)):
    """Return list of customers from SQLite"""
    customers_db = db.query(CustomerORM).all()
    return [Customer.from_orm(c) for c in customers_db]


@app.post("/customers")
def create_customer(customer: Customer, db: Session = Depends(get_db)):
    """Create a new customer and persist to SQLite. Validate DOB ensures age >= 18."""
    # Validate DOB format and age (expecting YYYY-MM-DD)
    from datetime import date
    try:
        dob_date = date.fromisoformat(customer.dob)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid DOB format. Use YYYY-MM-DD")

    today = date.today()
    if dob_date > today:
        raise HTTPException(status_code=400, detail="DOB cannot be in the future")

    # Calculate age
    age = today.year - dob_date.year - ((today.month, today.day) < (dob_date.month, dob_date.day))
    if age < 18:
        raise HTTPException(status_code=400, detail="Customer must be at least 18 years old")

    db_customer = CustomerORM(**customer.dict())
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return {"message": "New Customer created", "customer": Customer.from_orm(db_customer)}


@app.post("/activities/{activity_name}/signup")
def signup_for_activity(activity_name: str, email: str):
    """Sign up a student for an activity"""
    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Add student
    activity["participants"].append(email)
    return {"message": f"Signed up {email} for {activity_name}"}
