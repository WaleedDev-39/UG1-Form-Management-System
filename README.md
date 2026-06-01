# UG-1 Form Management System
**University of Agriculture Faisalabad**

An automated web-based system for managing UG-1 enrollment forms using barcode scanning, fee status tracking, and Excel report generation.

---

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Backend | Python 3.10+ · FastAPI · SQLAlchemy |
| Database | MySQL 8.0+ |
| Frontend | HTML5 · Vanilla CSS · Vanilla JavaScript |
| Barcode | `python-barcode` (generate) · `pyzbar` (decode images) |
| Reports | `openpyxl` · `pandas` |
| Auth | JWT (python-jose) · bcrypt (passlib) |

---

## Prerequisites

1. **Python 3.10+** – https://www.python.org/downloads/
2. **MySQL 8.0+** – https://dev.mysql.com/downloads/mysql/
3. **pip** (comes with Python)
4. **pyzbar system dependency** (for image barcode decoding):
   - Windows: Download and install [ZBar binaries](https://sourceforge.net/projects/zbar/files/zbar/0.10/zbar-0.10-setup.exe/download)
   - Or: `winget install zbar` (if available)

---

## Step-by-Step Setup

### Step 1 – Create the MySQL Database

Open MySQL Workbench or MySQL CLI and run:

```sql
CREATE DATABASE ug1_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'ug1_user'@'localhost' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON ug1_management.* TO 'ug1_user'@'localhost';
FLUSH PRIVILEGES;
```

> You can also use `root` user for development – just update `.env` accordingly.

---

### Step 2 – Configure Environment Variables

Inside the `backend/` folder, copy the example file:

```powershell
cd "e:\my coding stuff\gujjar fyp\backend"
Copy-Item .env.example .env
```

Then open `backend/.env` and update:

```env
DATABASE_URL=mysql+pymysql://root:YOUR_PASSWORD@localhost:3306/ug1_management
SECRET_KEY=pick-any-long-random-string-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
```

---

### Step 3 – Install Python Dependencies

```powershell
cd "e:\my coding stuff\gujjar fyp\backend"
pip install -r requirements.txt
```

> If you get an error with `pyzbar` on Windows, install ZBar first (see Prerequisites).

---

### Step 4 – Run the Backend Server

```powershell
cd "e:\my coding stuff\gujjar fyp\backend"
uvicorn main:app --reload --port 8000
```

On first run, the system will:
- Automatically create all database tables
- Create a **default admin account**:
  - Username: `admin`
  - Password: `admin123`

> ⚠️ **Change the admin password immediately after first login!**

---

### Step 5 – Access the Application

Open your browser and go to:

```
http://127.0.0.1:8000
```

Log in with:
- **Username:** `admin`
- **Password:** `admin123`

The API documentation (Swagger UI) is available at:
```
http://127.0.0.1:8000/docs
```

---

## User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access – manage users, students, forms, reports |
| **Staff** | Process forms, manage students, view reports |
| **Faculty** | View students and reports only (read-only) |

---

## How to Use the System

### Processing a UG-1 Form (Main Workflow)

1. Log in as **Admin** or **Staff**
2. Click **"Process UG-1 Form"** in the sidebar
3. **Step 1 – Identify Student:**
   - **Barcode Scanner (default):** Connect a USB barcode scanner. Click the barcode field and scan the barcode on the student's UG-1 form. The scanner will automatically populate the field.
   - **Manual Entry (1st semester / no barcode):** Click "Manual Entry" tab and type the student's AG number (format: `2022-AG-8036`), then click "Fetch Student".
4. **Step 2 – Confirm Details:** Verify the student information shown.
5. **Step 3 – Voucher & Fee:** Enter the Voucher ID, select fee status (Paid / Installment / Deferred), and optionally add notes.
6. Click **"Submit UG-1 Form"** ✅

### Adding Students

**Option A – Manual:**
1. Go to **Students** → click **"+ Add Student"**
2. Fill in AG number, CNIC, name, father's name, boarder status, semester

**Option B – Excel/CSV Import:**
1. Go to **Students** → click **"Import Excel/CSV"**
2. Prepare your file with these columns:
   ```
   ag_number | cnic | name | father_name | boarder_status | semester | department | program
   ```
   - `boarder_status` values: `Boarder` or `Non-Boarder`
   - `semester` values: 1–8
3. Upload the file

### Generating Student Barcodes

1. Go to **Students**
2. Click **"🔳 View"** next to any student
3. The barcode is generated from the student's AG number
4. Click **"🖨️ Print"** to print and attach to the physical UG-1 form

### Generating Reports

1. Go to **Reports**
2. Filter by fee status and/or date range (optional)
3. Click **"📊 Export to Excel"** to download a formatted Excel file

---

## AG Number Format

AG numbers must follow this format:
```
yyyy-AG-nnnn
```
Examples:
- `2022-AG-8036`
- `2023-AG-0142`

---

## Project Structure

```
gujjar fyp/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # Environment configuration
│   ├── database.py          # SQLAlchemy DB connection
│   ├── models.py            # ORM models (User, Student, UG1Form)
│   ├── schemas.py           # Pydantic validation schemas
│   ├── requirements.txt     # Python dependencies
│   ├── .env                 # ⚠️ Your local config (do NOT commit)
│   ├── .env.example         # Template for .env
│   ├── routers/
│   │   ├── auth.py          # Login endpoint
│   │   ├── users.py         # User CRUD (admin only)
│   │   ├── students.py      # Student CRUD + import + barcode
│   │   ├── forms.py         # UG1 form processing
│   │   └── reports.py       # Dashboard stats + Excel export
│   └── utils/
│       ├── auth_utils.py    # JWT + password hashing
│       ├── barcode_utils.py # Barcode generation (python-barcode) & decode (pyzbar)
│       └── excel_utils.py   # Excel report generation (openpyxl)
│
├── frontend/
│   ├── index.html           # Login page
│   ├── dashboard.html       # Main dashboard
│   ├── process_form.html    # UG-1 form processing workflow
│   ├── students.html        # Student management
│   ├── reports.html         # Reports & export
│   ├── manage_users.html    # User management (admin only)
│   ├── sidebar.html         # Shared sidebar component
│   ├── css/
│   │   └── style.css        # Global stylesheet (UAF brand colors)
│   └── js/
│       ├── api.js           # API utility, auth helpers, toast
│       ├── dashboard.js
│       ├── process_form.js
│       ├── students.js
│       ├── reports.js
│       └── users.js
│
└── assets/
    └── uaf logo.png         # UAF logo
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `Access denied for user` MySQL error | Check username/password in `.env` |
| `pyzbar` import error | Install ZBar binaries on Windows |
| Barcode scanner not detected | Make sure the barcode input field has focus before scanning |
| `ModuleNotFoundError` | Run `pip install -r requirements.txt` again |
| Port 8000 already in use | Use `uvicorn main:app --reload --port 8001` |
| Tables not created | Check `DATABASE_URL` in `.env` is correct |

---

## Security Notes

- Change the default admin password after first login
- Set a strong `SECRET_KEY` in `.env` for production
- Do not commit `.env` to version control
- Use HTTPS in production

---

*Developed for University of Agriculture Faisalabad – UG-1 Form Management System*
