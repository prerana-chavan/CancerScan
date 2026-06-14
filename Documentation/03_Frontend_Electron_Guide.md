# 03. Frontend & Electron Guide

CancerScan's frontend is built using **React 18** and **Vite**, and then wrapped into a native Windows Desktop Application using **Electron 28**. 

This means doctors don't access the app through a website; they download an `.exe` file and install it on their computer.

## 1. Tech Stack
* **UI Framework:** React 18
* **Build Tool:** Vite 5 (extremely fast compiling)
* **Desktop Wrapper:** Electron 28
* **Styling:** Tailwind CSS 4
* **Routing:** React Router v6
* **HTTP Client:** Axios
* **Charts:** Recharts

## 2. API Connection Logic (api.js)
The frontend is smart enough to know if it is running locally for development, or if it has been packaged into an `.exe` for production.

**File:** `frontend/src/config/api.js`
```javascript
// Automatically detect if we are running packaged .exe
const isAsarPackaged = window.location.href.includes('app.asar');
const isPackagedExe = (window.electronAPI && window.electronAPI.isPackaged) || isAsarPackaged;

// If packaged .exe -> Use Render Backend
// If local development -> Use localhost
const useProductionBackend = isPackagedExe;

const BASE_URL = useProductionBackend ? 'https://cancerscan.onrender.com' : 'http://localhost:5099';
const ML_URL   = useProductionBackend ? 'https://cancerscan.onrender.com' : 'http://localhost:5001';
```

## 3. How to Package the `.exe` File

When you are ready to distribute your app to the professors or judges, you need to "build" the `.exe` installer.

### Step-by-Step Build Process:
1. Open Command Prompt.
2. Navigate to the frontend folder:
   ```cmd
   cd path\to\CancerScan\frontend
   ```
3. Run the packaging command:
   ```cmd
   npm run package
   ```
4. **What happens next?**
   * Vite compiles all the React code into plain HTML/JS (`frontend/dist/`).
   * Electron-Builder takes that HTML/JS and wraps it inside a Chromium browser shell.
   * It creates a Windows NSIS Installer.
5. **Where is the file?**
   * Go to `frontend/dist-electron/`
   * You will find a file named **`CancerScan Setup 1.0.0.exe`**.

> [!TIP]
> This `.exe` file is what you will upload to GitHub Releases for people to download! (See the GitHub Release Guide).

## 4. Local Development

If you just want to edit the React code and see changes live without building an `.exe` every time, run:

```cmd
cd frontend
npm start
```
This boots up a live-reloading Electron window. When you save a `.jsx` file, the window updates instantly.
