# 10. Deployment Guide (Local vs Cloud)

CancerScan can be run in two different modes: completely offline on your local laptop, or fully deployed to the cloud for global access.

## 1. Local Development Mode

Running locally is useful when writing code or when you have no internet access.

1. **Database:** SQLite (Saved locally to `C:\Users\YourName\.cancerscan\cancerscan.db`)
2. **Backend:** Runs on `http://localhost:5099`
3. **ML Engine:** Runs on `http://localhost:5001`
4. **Frontend:** Runs as an Electron window pointing to localhost.

**How to start local mode:**
Simply double-click the **`start_all.bat`** file in the project folder. It will open 3 terminal windows automatically.

## 2. Cloud Production Mode

This is how the application runs for the final presentation.

| Component | Cloud Provider | URL |
|-----------|---------------|-----|
| **Landing Page** | Netlify | [https://cancerscan-ai.netlify.app/](https://cancerscan-ai.netlify.app/) |
| **Backend API** | Render | [https://dashboard.render.com/project/prj-d7q9l0q8qa3s73fs0kq0](https://dashboard.render.com/project/prj-d7q9l0q8qa3s73fs0kq0) |
| **ML Engine** | Render | *(Runs on the exact same Render instance as the Backend)* |
| **Database** | Neon.tech | [https://console.neon.tech/app/projects/shy-salad-08176877](https://console.neon.tech/app/projects/shy-salad-08176877) |
| **Frontend App** | GitHub Releases | Users download the `.exe` file to their laptops |

### A. How Render Works (Backend + ML)
Render is linked directly to our GitHub repository. Whenever you `git push` to the `main` branch, Render automatically detects the changes and redeploys the server.

* Render looks at `Procfile` and sees the command: `web: bash start.sh`
* Render executes `start.sh` which:
  1. Runs `auto_seed.py` (creates the admin account in Neon).
  2. Starts `api_server.py` in the background (The ML Engine).
  3. Waits 5 seconds.
  4. Starts `gunicorn app:app` (The Main Flask Backend).

Because both Python files run inside the same Render container, the backend can talk to the ML Engine locally, but the entire system is exposed to the internet via the `.onrender.com` URL.

### B. Environment Variables on Render
For Render to connect to the Neon database, an Environment Variable must be set in the Render Dashboard.

* **Key:** `DATABASE_URL`
* **Value:** `postgresql://neondb_owner:[PASSWORD]@ep-morning-sea-aoi12tm7-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`

When `db.py` detects this variable, it automatically stops using local SQLite and switches to the live cloud database.
