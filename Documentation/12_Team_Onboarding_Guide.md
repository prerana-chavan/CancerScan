# 12. Team Onboarding Guide

Welcome to the CancerScan team! This guide is written specifically for Akshada, Dipti, Prerana, and Sakshi. If you just got a new laptop or need to run the code for the first time, follow this guide exactly.

## Step 1: Install Prerequisites

You must have **two** things installed on your computer before touching the code:

1. **Python 3.11:** Download from [python.org](https://www.python.org/downloads/release/python-3119/).
   > [!IMPORTANT]
   > When installing, you MUST check the box that says **"Add Python to PATH"**. Do not use Python 3.12 or 3.13, because TensorFlow will not work.
2. **Node.js (LTS):** Download from [nodejs.org](https://nodejs.org/). Click "Next" through the installer.

## Step 2: Clone the Project

Open Command Prompt or Terminal, and type:
```bash
git clone https://github.com/prerana-chavan/CancerScan.git
cd CancerScan
```

## Step 3: Install Frontend Dependencies

We need to download all the React and Electron libraries.

1. Go into the frontend folder:
   ```bash
   cd frontend
   ```
2. Tell Node to install everything:
   ```bash
   npm install
   ```
3. Go back to the main folder:
   ```bash
   cd ..
   ```

## Step 4: Install Backend Dependencies

We need to download Flask, TensorFlow, and the database drivers.

1. Go into the backend folder:
   ```bash
   cd backend
   ```
2. Tell Python to install everything:
   ```bash
   pip install -r requirements.txt
   ```
3. Go back to the main folder:
   ```bash
   cd ..
   ```

## Step 5: Run the Project Locally!

You don't need to type out 3 different commands to start the project. We created a shortcut for you.

1. Find the file named **`start_all.bat`** in the main folder.
2. Double-click it.
3. Three black terminal windows will open. Leave them alone! They are starting the Main Backend, the ML Engine, and the Frontend App.
4. After 10-15 seconds, the CancerScan desktop app will automatically pop up on your screen.

## Step 6: Log In

Because you are running locally, it creates a local SQLite database for you automatically. Use the default admin credentials to log in:

* **Email:** `admin@cancerscan.app`
* **Password:** `Admin@123`
