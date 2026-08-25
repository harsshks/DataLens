# Dataset Quality Monitoring API

REST API for uploading CSV files, analyzing data quality with Python (Pandas/NumPy), and storing versioned quality reports in MySQL.

This is a backend portfolio project. It is designed to be readable and technically honest, not a production-scale platform.

## Problem statement

Messy CSVs are common in internships and data products: missing values, duplicates, mixed types, outliers, and inconsistent labels. This API gives authenticated users a structured quality report and a transparent 0–100 score after each upload, plus version history so they can see whether a later file improved.

The backend does not depend on any specific public dataset. Any valid CSV can be uploaded.

## Features

- User registration and JWT login (`USER` / `ADMIN` roles)
- CSV upload with extension, MIME, and size checks
- Safe stored filenames (UUID), original name kept only as metadata
- Python analysis for missing values, duplicates, types, outliers (IQR), dates, empty/constant columns, and inconsistent categories
- Transparent quality score stored with each dataset version
- Quality report, issue filters, and column statistics
- Version upload and comparison (score change, new vs resolved issues)
- Small admin statistics endpoint
- Swagger UI at `/api/docs`
- Jest/Supertest tests
- Docker Compose for the API + MySQL

## Architecture

```
Client / Swagger UI
        |
        v
Express REST API
        |
        +-- Auth (JWT, bcrypt)
        +-- Dataset management
        +-- File upload
        +-- Quality reports / versions
        |
        v
     MySQL

After upload, Node starts analysis/analyze_dataset.py, reads JSON from stdout,
computes the quality score, and writes results to MySQL.
There is no job queue in this version; analysis runs in-process and the HTTP
request waits for it to finish.
```

Layering:

`routes → controllers → services → models`

## Tech stack

| Area | Choice |
| --- | --- |
| API | Node.js, Express, JavaScript |
| Database | MySQL, Sequelize |
| Auth | JWT, bcryptjs |
| Analysis | Python, Pandas, NumPy |
| Docs | OpenAPI / Swagger UI |
| Tests | Jest, Supertest (SQLite in-memory) |
| Run locally / demo | Docker Compose |

## Database schema

Canonical SQL is in `docs/schema.sql`. Tables are created at API startup with `sequelize.sync()`.

- `users` — account, hashed password, role
- `datasets` — latest file metadata, status, score, row/column counts
- `dataset_versions` — one row per upload (`version_number` starts at 1)
- `dataset_columns` — per-version column stats
- `quality_issues` — per-version issues (`version_id` is required for comparison)

Statuses: `UPLOADED`, `PROCESSING`, `COMPLETED`, `FAILED`.

## API endpoints

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/health` | no | Liveness |
| POST | `/api/auth/register` | no | Create user |
| POST | `/api/auth/login` | no | JWT |
| GET | `/api/auth/me` | yes | Current user |
| POST | `/api/datasets` | yes | Upload CSV and analyze |
| GET | `/api/datasets` | yes | List own datasets (`page`, `limit`, `status`, `sort`, `order`) |
| GET | `/api/datasets/:id` | yes | Metadata |
| GET | `/api/datasets/:id/quality` | yes | Full quality report |
| GET | `/api/datasets/:id/issues` | yes | Filter `severity`, `issue_type`, `column` |
| GET | `/api/datasets/:id/columns` | yes | Column statistics |
| DELETE | `/api/datasets/:id` | yes | Delete dataset + analysis + files |
| POST | `/api/datasets/:id/versions` | yes | Upload a new version |
| GET | `/api/datasets/:id/versions` | yes | Version list |
| GET | `/api/datasets/:id/versions/:version` | yes | One version |
| GET | `/api/datasets/:id/compare/:version1/:version2` | yes | Compare versions |
| GET | `/api/admin/statistics` | admin | Counts and average score |
| GET | `/api/admin/datasets` | admin | All datasets |

Users can only read/write their own datasets. Admins use `/api/admin/*`.

## Quality scoring methodology

Implemented in `src/services/scoringService.js` (Node is the source of truth stored in MySQL).

Start at **100**, subtract, then clamp to **[0, 100]**.

| Signal | Deduction | Cap |
| --- | --- | --- |
| Missing cells | 0.4 points per 1% of all cells | 20 |
| Duplicate rows | 0.5 points per 1% of rows | 15 |
| IQR outliers | 0.4 points per 1% of cells | 10 |
| Empty columns | 8 points each | 16 |
| Constant columns | 3 points each | 9 |
| Invalid types/dates | 5 if any, +1 per extra incident | 10 |
| Inconsistent categories | 2 points per affected column | 10 |

This is a heuristic for a portfolio demo, not a statistical quality standard.

## Dataset analysis methodology

`analysis/analyze_dataset.py` reads the CSV (UTF-8, then latin-1 fallback), treats blank/`NA`/`null` as missing, then:

1. **Missing values** — null count and percentage per column
2. **Duplicate rows** — `DataFrame.duplicated()`
3. **Types** — boolean tokens, numeric parse rate ≥ 90% (integer vs float), else datetime parse rate (lower threshold if the name looks like a date), else string
4. **Numeric stats** — min, max, mean, median, std
5. **Outliers** — Tukey IQR (`1.5 * IQR`); skipped for near-unique identifier columns
6. **Categorical inconsistency** — same value after lowercasing/whitespace collapse (`Delhi` / `delhi` / `DELHI`); ignored when cardinality is very high
7. **Empty columns** — every value missing
8. **Constant columns** — one unique non-null value
9. **Invalid dates/types** — values that fail to parse once the column type is inferred

## Setup instructions

### Prerequisites

- Node.js 18+
- Python 3.10+ with Pandas and NumPy
- MySQL 8 (or use Docker Compose and skip local MySQL)

### Local (without Docker)

```bash
copy .env.example .env
```

Edit `.env` with your MySQL credentials. Create the database:

```sql
CREATE DATABASE dataset_quality;
```

```bash
npm install
pip install -r analysis/requirements.txt
npm run dev
```

API: `http://localhost:3000`  
Swagger: `http://localhost:3000/api/docs`

On some systems the Python executable is `python3`. Set `PYTHON_BIN=python3` in `.env` if uploads fail with an analysis error.

## Environment variables

See `.env.example`.

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port |
| `DB_*` | MySQL connection |
| `JWT_SECRET` | Signing key (change this) |
| `UPLOAD_DIR` | Where CSVs are stored |
| `MAX_FILE_SIZE_MB` | Upload cap (default 10) |
| `PYTHON_BIN` | Python executable |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Optional admin seeded on startup |

## Docker instructions

```bash
docker compose up --build
```

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/api/docs`
- MySQL: `localhost:3306` (user `root`, password `changeme`)

Demo admin (from compose env): `admin@example.com` / `AdminPass123`

Stop:

```bash
docker compose down
```

## Running tests

Tests use an in-memory SQLite database. Dataset HTTP tests mock the Python process; `tests/analysis.test.js` runs the real script.

```bash
pip install -r analysis/requirements.txt
npm test
```

## Swagger documentation

Open `/api/docs` after the server starts. Click **Authorize** and paste `Bearer <token>` after login.

## Example API requests

Register:

```bash
curl -X POST http://localhost:3000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Harsh\",\"email\":\"harsh@example.com\",\"password\":\"password123\"}"
```

Login:

```bash
curl -X POST http://localhost:3000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"harsh@example.com\",\"password\":\"password123\"}"
```

Upload (PowerShell):

```powershell
$token = "<paste JWT>"
curl.exe -X POST http://localhost:3000/api/datasets `
  -H "Authorization: Bearer $token" `
  -F "name=sample-cities" `
  -F "file=@docs/sample-dataset.csv"
```

Quality report:

```powershell
curl.exe http://localhost:3000/api/datasets/1/quality -H "Authorization: Bearer $token"
```

Example success body:

```json
{
  "success": true,
  "data": {
    "dataset_id": 1,
    "quality_score": 87,
    "summary": {
      "rows": 10,
      "columns": 7,
      "missing_cells": 12,
      "duplicate_rows": 1,
      "outlier_values": 1
    },
    "issues": [
      {
        "type": "MISSING_VALUES",
        "severity": "MEDIUM",
        "column": "income",
        "count": 1,
        "description": "1 values are missing in 'income' (10.0%)"
      }
    ]
  }
}
```

Example error:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_FILE",
    "message": "Only CSV files are supported"
  }
}
```

Upload a cleaner second version, then compare:

```powershell
curl.exe -X POST http://localhost:3000/api/datasets/1/versions `
  -H "Authorization: Bearer $token" `
  -F "file=@docs/sample-dataset-v2.csv"

curl.exe http://localhost:3000/api/datasets/1/compare/1/2 -H "Authorization: Bearer $token"
```

## Future improvements

- Asynchronous analysis (queue + status polling) for large files
- Column-level quality trends across many versions
- Configurable scoring weights per project
- Parquet/JSON upload in addition to CSV
- Stronger integration tests against a real MySQL instance in CI

These are optional follow-ups, not claims about the current system.
