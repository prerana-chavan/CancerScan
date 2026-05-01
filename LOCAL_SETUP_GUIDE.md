# 🔬 CancerScan — Local Setup Guide (Pendrive / Folder Copy)

> **AI-Powered Lung Cancer Detection System**
> Follow this step-by-step guide to run the CancerScan project on your Windows laptop.
> No internet is needed after the initial setup.

---

## ✅ STEP 1: Install Prerequisites

You need **2 software** installed before anything else.

### 1. Install Python 3.11

- Download: https://www.python.org/downloads/release/python-3119/
- Scroll down and click **"Windows installer (64-bit)"**
- Run the installer
- **⚠️ VERY IMPORTANT:** On the first screen, check the box: **☑ Add python.exe to PATH**
- Click "Install Now"
- After installation, open **Command Prompt** (search "cmd" in Start menu) and type:
  ```
  python --version
  ```
  You should see: `Python 3.11.9` (or similar)

> **DO NOT install Python 3.12 or 3.13 or 3.14.** TensorFlow only works with Python 3.11 or below.

### 2. Install Node.js 18 or 20 (LTS)

- Download: https://nodejs.org/ (click the big green **LTS** button)
- Run the installer, click Next through everything
- After installation, open **Command Prompt** and type:
  ```
  node --version
  npm --version
  ```
  You should see `v18.x.x` or `v20.x.x` and `10.x.x`

---

## 📁 STEP 2: Copy the Project Folder

1. Plug in the pendrive
2. Copy the entire project folder (e.g., `LungCancer (4)dect+subtype+ui`) to your **Desktop**
3. You should now have a folder on your Desktop with this structure inside:
   ```
   LungCancer (4)dect+subtype+ui/
   ├── backend/
   ├── frontend/
   ├── start_all.bat
   └── ...
   ```

---

## 🐍 STEP 3: Install Python Backend Packages

1. Open **Command Prompt** (search "cmd" in Start menu)
2. Navigate to the backend folder. Type this command exactly:
   ```
   cd Desktop
   cd "LungCancer (4)dect+subtype+ui"
   cd backend
   ```
3. Now install all Python libraries:
   ```
   pip install flask==3.0.2 flask-cors==4.0.0 pillow bcrypt==4.1.2 pyjwt==2.8.0 openpyxl==3.1.2 numpy requests==2.31.0 python-dotenv==1.0.1
   ```
4. Now install TensorFlow (this is the biggest download, ~400MB):
   ```
   pip install tensorflow
   ```
5. Wait for everything to finish. You will see `Successfully installed ...` at the end.

### Verify Python packages are installed:
```
python -c "import flask; import tensorflow; print('All packages OK!')"
```
You should see: `All packages OK!`

---

## 🌐 STEP 4: Install Frontend (Electron) Packages

1. In the same Command Prompt, go back to the main folder and into the frontend:
   ```
   cd ..
   cd frontend
   ```
2. Install all Node.js/Electron dependencies:
   ```
   npm install
   ```
3. Wait 2-3 minutes for it to finish. You will see a message at the end.

### What does `npm install` do?
It reads the `package.json` file and downloads all the JavaScript libraries needed for the app — including React, Electron, Vite, Tailwind CSS, charting libraries, etc.

---

## 🚀 STEP 5: Run the Application

### Option A: One-Click Launch (Recommended)

1. Open **File Explorer**
2. Go to your Desktop → `LungCancer (4)dect+subtype+ui` folder
3. Double-click **`start_all.bat`**
4. **3 black terminal windows** will open automatically:
   - Window 1: Backend Server (port 5099)
   - Window 2: ML Engine (port 5001)
   - Window 3: Electron Frontend App
5. **Wait 15-20 seconds** for everything to load
6. The CancerScan desktop app will open as a window

> If double-clicking doesn't work, right-click `start_all.bat` → **Run as administrator**

### Option B: Run via Command Prompt

If `start_all.bat` doesn't work, open **3 separate** Command Prompt windows:

**Window 1 — Start Backend Server:**
```
cd Desktop
cd "LungCancer (4)dect+subtype+ui"
cd backend
python app.py
```
✅ Wait until you see: `Running on http://127.0.0.1:5099`

**Window 2 — Start ML Engine:**
```
cd Desktop
cd "LungCancer (4)dect+subtype+ui"
cd backend
python api_server.py
```
✅ Wait until you see: `Running on http://127.0.0.1:5001` and `Model loaded successfully`

**Window 3 — Start Electron App:**
```
cd Desktop
cd "LungCancer (4)dect+subtype+ui"
cd frontend
npm run electron:dev
```
✅ The CancerScan app window will open automatically.

---

## 🔑 STEP 6: Login Credentials

### Administrator Login
| Field | Value |
|-------|-------|
| Email | `admin@cancerscan.app` |
| Password | `Admin@123` |

### Doctor / Pathologist
1. Click **"Request Clinical Access"** on the login page
2. Fill in the registration form
3. Log in as **Admin** (using credentials above)
4. Go to **User Management** and **Approve** the new doctor
5. Now the doctor can log in and use the AI analysis

---

## 🧪 STEP 7: Test AI Analysis

1. Log in as an approved **Pathologist**
2. Go to the **Analysis** page
3. Fill in patient name, age, gender, etc.
4. Upload a **lung histopathology image** (H&E stained slide, JPG or PNG)
5. Click **Run Analysis**
6. Results will show:
   - ✅ **Benign** — Normal lung tissue, no cancer
   - 🔴 **Cancer Detected** — with subtype (Adenocarcinoma or Squamous Cell Carcinoma)
   - 🟡 **Inconclusive** — Low confidence, needs manual review

---

## ⚠️ Troubleshooting

| Problem | Solution |
|---------|----------|
| `'python' is not recognized` | Reinstall Python, make sure you check **"Add to PATH"** |
| `'npm' is not recognized` | Reinstall Node.js |
| `ModuleNotFoundError: No module named 'flask'` | Run `pip install flask==3.0.2` in the backend folder |
| `ModuleNotFoundError: No module named 'tensorflow'` | Run `pip install tensorflow` |
| `npm install` gives errors | Delete the `frontend/node_modules` folder and run `npm install` again |
| `Port 5099 already in use` | Close other terminal windows or restart your computer |
| App opens but shows "Connection Failed" | Backend is not running. Make sure Windows 1 and 2 are open and running |
| Analysis says "ML engine not running" | Make sure Window 2 (api_server.py) is running and shows `Model loaded` |
| Windows Defender blocks something | Click **"More Info"** → **"Run Anyway"** |

---

## 📋 Complete List of Required Software & Libraries

### System Software
| Software | Version | Download Link |
|----------|---------|---------------|
| Python | 3.11.x | https://python.org/downloads |
| Node.js | 18.x or 20.x LTS | https://nodejs.org |

### Python Packages (backend)
| Package | Purpose |
|---------|---------|
| Flask 3.0.2 | Web server framework |
| flask-cors 4.0.0 | Cross-origin request handling |
| TensorFlow | AI/ML deep learning framework |
| Keras | Neural network API (included in TensorFlow) |
| Pillow | Image processing |
| NumPy | Numerical computations |
| bcrypt 4.1.2 | Password hashing |
| PyJWT 2.8.0 | JSON Web Token authentication |
| openpyxl 3.1.2 | Excel export |
| requests 2.31.0 | HTTP client |
| python-dotenv 1.0.1 | Environment variable loader |

### Node.js Packages (frontend) — installed automatically by `npm install`
| Package | Purpose |
|---------|---------|
| React 18 | UI framework |
| Vite 5 | Build tool & dev server |
| Electron 28 | Desktop app framework |
| electron-builder | Packaging into .exe |
| Tailwind CSS 4 | Styling |
| Axios | HTTP client for API calls |
| Recharts | Data visualization / charts |
| Framer Motion | Animations |
| jsPDF | PDF report generation |
| Lucide React | Icons |

---

## 🛑 How to Stop the Application

- Close all 3 terminal windows, OR
- Press `Ctrl + C` in each terminal window to stop the servers

---

**Built with ❤️ by the CancerScan Team**
