# Gasto AI — Restaurant Personal Dining & Operations

A full-stack starter project:
- Frontend: Next.js App Router + TypeScript + plain CSS
- Backend: FastAPI + SQLAlchemy
- Database: PostgreSQL
- Docker Compose for local startup

The product includes:
- A customer profile with allergies, dietary preferences, and a saved customer status
- A menu with ingredient details and allergy-aware filtering
- A simple recommendation endpoint that excludes dishes containing declared allergens
- An operations dashboard with daily orders, revenue, and a daily report endpoint
- Demo data seeded automatically on backend startup

> Safety note: this is a software demo, not a medical or food-safety guarantee. Allergy decisions must be verified by restaurant staff against supplier labels and cross-contamination procedures. The app only matches ingredient text and declared allergens; it cannot verify kitchen handling.

## Requirements

Recommended: Docker Desktop (includes Docker Compose).  
Alternative: Node.js 20+, Python 3.11+, and PostgreSQL 15+.

## Start with Docker (easiest)

1. Unzip the project.
2. Open a terminal in the `gasto-ai` folder.
3. Run:

```bash
docker compose up --build
```

4. Open:
   - Frontend: http://localhost:3000
   - API docs: http://localhost:8000/docs
   - Health check: http://localhost:8000/health

To stop: press `Ctrl+C`, then run `docker compose down`.  
To stop and delete the local database volume too: `docker compose down -v`.

## Run without Docker

### 1. PostgreSQL
Create a database named `gasto_ai`, then set `DATABASE_URL` in `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/gasto_ai
```

### 2. Backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The API creates its tables and demo data at startup.

### 3. Frontend
In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:3000. It calls the API at `http://localhost:8000` by default. To change it, create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Main API endpoints

- `GET /health`
- `GET /menu`
- `GET /menu/recommendations?allergens=peanuts,milk&diet=vegetarian`
- `GET /customers`
- `GET /customers/{customer_id}`
- `PUT /customers/{customer_id}/preferences`
- `GET /orders`
- `POST /orders`
- `GET /reports/daily?date=2026-10-14`

## Demo behavior

The UI uses a demo customer ID (`1`) and seeded sample orders. Authentication is intentionally not represented as production-ready: before real deployment, add proper password hashing, JWT/session handling, role-based access control, audit logging, migrations, rate limits, and privacy/security review. Do not store real medical or allergy data until access controls and data protection have been implemented.


git add .
git commit -m "some comment"
git push
