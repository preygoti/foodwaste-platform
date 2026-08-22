# Harvest Ledger — AI-Powered Food Waste Management Platform

Built from the project spec: **Inventory Management & Expiry Tracking**,
**AI-Based Waste Prediction Engine**, and **Redistribution Marketplace &
Analytics Dashboard**, as a dual-sided web platform for food businesses and
recipient organizations (NGOs / food banks).

```
foodwaste-platform/
├── backend/     FastAPI + SQLite API (auth, inventory, risk engine, listings, pickups, analytics)
└── frontend/    React + Vite + Tailwind dashboard (business + NGO views)
```

## What's implemented

| Module (from the doc) | Status |
|---|---|
| 1. Inventory Management & Expiry Tracking | ✅ manual entry, CSV bulk endpoint, per-item days-to-expiry |
| 2. AI-Based Waste Prediction Engine | ✅ heuristic risk score (0–100) + reorder recommendation — see `backend/risk_engine.py` for how to swap in a trained Prophet/LSTM model later |
| 3. Redistribution Marketplace & Analytics | ✅ surplus listings, urgency-sorted NGO browsing, pickup scheduling/confirmation, business + NGO impact dashboards (CO2e avoided, meals redistributed) |
| 4. Integration & Testing | ✅ full flow tested: register → inventory → risk score → list → claim → pickup → analytics |

Barcode/QR scanning and POS integration are stubbed as future work (see
"Extending this" below) — they need real hardware/POS access to implement
meaningfully.

## Run it locally

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # optional but recommended
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
API docs (auto-generated): http://localhost:8000/docs

### Frontend
```bash
cd frontend
npm install
npm run dev
```
App: http://localhost:5173 — it talks to the backend at `http://localhost:8000`
by default (set in `frontend/.env`, copy from `.env.example` if missing).

Register two accounts to try the full flow: one as a **Food business**, one
as an **NGO / Food bank**, in two browser tabs (or one normal + one incognito).

## Push this to GitHub

From the `foodwaste-platform` folder:
```bash
git init
git add .
git commit -m "Initial commit: food waste management platform"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```
If you don't have a repo yet: create one at https://github.com/new (don't
initialize it with a README, or you'll need to `git pull --rebase` first).

## Deploy it live (free tiers, ~10 minutes total)

**Backend → Render**
1. Push the code to GitHub (above).
2. Go to https://render.com → New → Web Service → connect your repo.
3. Root directory: `backend`. Render will detect `render.yaml` and set the
   build/start commands automatically (or set manually: build
   `pip install -r requirements.txt`, start
   `uvicorn main:app --host 0.0.0.0 --port $PORT`).
4. Deploy. Copy the resulting URL (e.g. `https://foodwaste-backend.onrender.com`).

   ⚠️ Render's free tier uses an ephemeral filesystem, so the SQLite file
   resets on redeploy. For a persistent demo, add a free Render PostgreSQL
   instance and set `DATABASE_URL` to its connection string — no code
   changes needed, SQLAlchemy handles both.

**Frontend → Vercel**
1. Go to https://vercel.com → Add New → Project → import the same repo.
2. Root directory: `frontend`.
3. Add environment variable `VITE_API_URL` = your Render backend URL from above.
4. Deploy. Vercel gives you a live URL (e.g. `https://harvest-ledger.vercel.app`).

That's it — the frontend and backend are now both live and talking to each other.

## Extending this toward the full original spec

- **Real ML forecasting**: log daily usage into a new `usage_history` table,
  then train Prophet/LSTM per category and swap the prediction into
  `risk_engine.predicted_days_of_stock()` — the API contract stays identical.
- **Barcode/QR scanning**: add a camera-based scanner (e.g. `html5-qrcode`)
  in the frontend that fills the "Add item" form.
- **POS integration**: add a `POST /inventory/pos-webhook` endpoint that
  accepts your POS provider's payload format.
- **CSV upload UI**: the backend endpoint (`/inventory/bulk-csv`) exists;
  wire up a file input + `papaparse` on the frontend to call it.
