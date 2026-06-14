# 01. Project Overview

## 1. Project Identity
* **Project Name:** CancerScan
* **Full Title:** CancerScan: Lung Cancer Detection, Subtype Classification and Survival Analysis Using Deep Learning
* **Academic Year:** 2025-2026
* **College:** Dr. Vithalrao Vikhe Patil College of Engineering, Ahilyanagar
* **University:** Savitribai Phule Pune University
* **Department:** Computer Engineering (CE)

## 2. Team Members
* **Prerana Chavan** (Team Leader)
* **Akshada Aware**
* **Dipti Berad**
* **Sakshi Yemul**

## 3. Abstract
CancerScan is an AI-powered medical diagnostic tool designed to assist pathologists in analyzing lung tissue biopsy slides (Histopathology / H&E stained slides). The system uses a Deep Learning Convolutional Neural Network (CNN) to detect lung cancer and classify it into its specific subtypes (Adenocarcinoma vs. Squamous Cell Carcinoma). By automating the initial screening process, CancerScan reduces diagnostic time and provides a second layer of validation for medical professionals.

## 4. Problem Statement
Manual analysis of lung histopathology slides under a microscope is time-consuming, prone to human error, and suffers from inter-observer variability. Distinguishing between closely related lung cancer subtypes (like Adenocarcinoma and Squamous Cell Carcinoma) requires highly specialized expertise. There is a need for an automated, accessible, and highly accurate AI system to support pathologists in rural or understaffed hospitals.

## 5. Core Features
1. **Desktop Application:** Secure, native desktop experience for doctors built with Electron and React.
2. **AI Inference:** 3-class classification model (Normal vs. Adenocarcinoma vs. Squamous Cell Carcinoma) using a custom MobileNet/CNN architecture.
3. **Automated Normalization:** Macenko stain normalization standardizes slide colors before AI processing.
4. **H&E Gatekeeper:** Prevents upload of non-medical images (like selfies or landscapes) using pixel-level color validation.
5. **Secure Authentication:** JWT-based login with bcrypt password hashing and Role-Based Access Control (Admin vs. Doctor).
6. **Report Generation:** Automatic generation of downloadable PDF medical reports for patient records.
7. **Cloud Infrastructure:** Global accessibility powered by Render (Backend) and Neon (Database).

## 6. Official Links
* **Landing Page:** [https://cancerscan-ai.netlify.app/](https://cancerscan-ai.netlify.app/)
* **Backend API & ML Engine:** [https://cancerscan.onrender.com](https://dashboard.render.com/project/prj-d7q9l0q8qa3s73fs0kq0)
* **Database:** [Neon Console](https://console.neon.tech/app/projects/shy-salad-08176877)
* **GitHub Repository:** [https://github.com/prerana-chavan/CancerScan](https://github.com/prerana-chavan/CancerScan)
