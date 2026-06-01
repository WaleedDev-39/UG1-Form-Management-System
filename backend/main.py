"""
UG-1 Form Management System – FastAPI Backend
Run with:  uvicorn main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from database import Base, engine
import models  # noqa – ensure models are registered before create_all
from routers import auth, users, students, forms, reports
from utils.auth_utils import get_password_hash
from database import SessionLocal

# ── Create tables ─────────────────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)

# ── Seed default admin user if not present ────────────────────────────────────
def seed_admin():
    db = SessionLocal()
    try:
        existing = db.query(models.User).filter(models.User.username == "admin").first()
        if not existing:
            admin = models.User(
                username="admin",
                email="admin@uaf.edu.pk",
                full_name="System Administrator",
                password_hash=get_password_hash("admin123"),
                role=models.UserRole.admin,
            )
            db.add(admin)
            db.commit()
            print("✅  Default admin created  →  username: admin | password: admin123")
    finally:
        db.close()

seed_admin()

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="UG-1 Form Management System",
    description="University of Agriculture Faisalabad – UG-1 Enrollment Form Automation",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register routers ──────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(students.router)
app.include_router(forms.router)
app.include_router(reports.router)

# ── Serve frontend static files ───────────────────────────────────────────────
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")
ASSETS_DIR   = os.path.join(os.path.dirname(__file__), "..", "assets")

if os.path.isdir(FRONTEND_DIR):
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

@app.get("/health")
def health():
    return {"status": "ok", "system": "UG-1 Form Management System"}
