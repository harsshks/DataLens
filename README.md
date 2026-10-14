# DataLens

**DataLens** is a full-stack data quality analysis platform. Upload a CSV, Excel, or JSON dataset and get an instant, transparent quality score with a detailed breakdown of every issue found — missing values, duplicates, outliers, type errors, inconsistent categories, and more. Track improvements across dataset versions with side-by-side comparisons.

**Live Demo:** [https://frontend-dun-two-74.vercel.app](https://frontend-dun-two-74.vercel.app)  
**API Docs:** [https://datalens-api-rate.onrender.com/api/docs](https://datalens-api-rate.onrender.com/api/docs)

---

## What it does

Most data quality tools give you a number. DataLens shows you *why*.

Every upload produces a 0–100 quality score with a fully transparent breakdown — you can see exactly how many points were deducted for missing values, how many for outliers, and why. Upload a cleaner version of the same dataset and the comparison view shows exactly what improved and what's still broken.

---

## Features

- **Multi-format upload** — CSV, Excel (.xlsx / .xls), and JSON
- **Automated quality analysis** — 9 checks powered by Python (Pandas + NumPy)
- **Transparent scoring** — 0–100 score with a per-signal deduction breakdown
- **Version history** — upload multiple versions of the same dataset
- **Version comparison** — side-by-side diff of scores, new issues, and resolved issues
- **Column statistics** — type detection, null counts, min/max/mean/median per column
- **Issue filtering** — filter by severity (CRITICAL / HIGH / MEDIUM / LOW) and issue type
- **Charts** — issues by severity pie chart, missing values by column bar chart, score trend across versions
- **Role-based auth** — JWT authentication with USER and ADMIN roles
- **Admin panel** — system-wide stats and full dataset visibility
- **Swagger UI** — fully documented REST API at `/api/docs`

---

## Quality analysis

`analysis/analyze_dataset.py` runs the following checks on every upload:

| Check | Description |
|---|---|
| Missing values | Null count and percentage per column |
| Duplicate rows | Exact row duplicates across the whole dataset |
| Type detection | Boolean, integer, float, datetime, string — inferred per column |
| Numeric stats | Min, max, mean, median, std dev for numeric columns |
| IQR outliers | Tukey fence (1.5 × IQR) for numeric columns |
| Invalid types / dates | Values that fail to parse once the column type is inferred |
| Empty columns | Columns where every value is null |
| Constant columns | Columns with exactly one unique non-null value |
| Inconsistent categories | Case/whitespace variants of the same value (e.g. `Delhi` / `delhi` / `DELHI`) |

---

## Scoring methodology

Start at **100**, deduct independently capped penalties, clamp to **[0, 100]**.

| Signal | Deduction | Cap |
|---|---|---|
| Missing cells | 0.4 pts per 1% of all cells | 20 |
| Duplicate rows | 0.5 pts per 1% of rows | 15 |
| IQR outliers | 0.4 pts per 1% of cells | 10 |
| Empty columns | 8 pts each | 20 |
| Constant columns | 3 pts each | 12 |
| Invalid types / dates | 5 pts if any, +1 per extra incident | 15 |
| Inconsistent categories | 2 pts per affected column | 10 |

The full breakdown is stored with every dataset version and returned by the API, so users can see exactly how the score was calculated.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, React Router, Recharts, Axios |
| Backend | Node.js, Express |
| Database | PostgreSQL (Neon), Sequelize ORM |
| Auth | JWT, bcryptjs |
| Analysis | Python 3, Pandas, NumPy, openpyxl |
| API Docs | OpenAPI 3 / Swagger UI |
| Tests | Jest, Supertest (SQLite in-memory) |
| Deployment | Render (API, Docker), Vercel (frontend) |

---

## Architecture

```
React Frontend (Vercel)
        │
        ▼
Express REST API (Render / Docker)
        │
        ├── Auth (JWT + bcrypt)
        ├── File upload (multer — CSV, Excel, JSON)
        ├── Python subprocess → analyze_dataset.py
        ├── Scoring engine (Node.js)
        └── Sequelize ORM
        │
        ▼
PostgreSQL (Neon)
```

After upload, Node spawns `analyze_dataset.py`, reads the JSON result from stdout, runs the scoring formula, and writes everything to the database in a single transaction. The HTTP request waits for analysis to complete and returns the full report.

---

## API endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | — | Liveness check |
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | JWT login |
| GET | `/api/auth/me` | ✓ | Current user |
| POST | `/api/datasets` | ✓ | Upload file and analyze |
| GET | `/api/datasets` | ✓ | List datasets (paginated, filterable) |
| GET | `/api/datasets/:id` | ✓ | Dataset metadata |
| GET | `/api/datasets/:id/quality` | ✓ | Full quality report + score breakdown |
| GET | `/api/datasets/:id/issues` | ✓ | Issues (filter by severity / type / column) |
| GET | `/api/datasets/:id/columns` | ✓ | Column statistics |
| DELETE | `/api/datasets/:id` | ✓ | Delete dataset and files |
| POST | `/api/datasets/:id/versions` | ✓ | Upload a new version |
| GET | `/api/datasets/:id/versions` | ✓ | Version list |
| GET | `/api/datasets/:id/versions/:v` | ✓ | Single version |
| GET | `/api/datasets/:id/compare/:v1/:v2` | ✓ | Compare two versions |
| GET | `/api/admin/statistics` | admin | System-wide stats |
| GET | `/api/admin/datasets` | admin | All datasets |

---

## Database schema

Five tables managed by Sequelize sync:

- `users` — account, hashed password, role (USER / ADMIN)
- `datasets` — latest metadata, status, quality score
- `dataset_versions` — one row per upload, stores score breakdown as JSON
- `dataset_columns` — per-version column statistics
- `quality_issues` — per-version issues with type, severity, column, and count

Dataset statuses: `UPLOADED` → `PROCESSING` → `COMPLETED` / `FAILED`

---

## Running locally

### Prerequisites

- Node.js 18+
- Python 3.10+ with pip
- PostgreSQL (or use Docker Compose which includes it)

### Without Docker

```bash
# Clone and install
git clone https://github.com/harsshks/DataLens.git
cd DataLens
cp .env.example .env        # fill in DB credentials
npm install
pip install -r analysis/requirements.txt

# Run
npm run dev
```

API: `http://localhost:3000`  
Swagger: `http://localhost:3000/api/docs`

### With Docker Compose

```bash
docker compose up --build
```

API: `http://localhost:3000` — Demo admin: `admin@example.com` / `AdminPass123`

### Frontend

```bash
cd frontend
cp .env.example .env        # set VITE_API_URL
npm install
npm run dev
```

---

## Running tests

Tests use an in-memory SQLite database — no external dependencies needed.

```bash
pip install -r analysis/requirements.txt
npm test
```

---

## Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Token signing key |
| `PORT` | HTTP port (default 3000) |
| `UPLOAD_DIR` | File storage directory |
| `MAX_FILE_SIZE_MB` | Upload size limit (default 10) |
| `PYTHON_BIN` | Python executable (`python` or `python3`) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Optional admin seeded on startup |
| `CORS_ORIGIN` | Allowed frontend origin(s), comma-separated |

See `.env.example` for a full template.
