# 14. System Architecture Guide

This document maps the complete data flow of the CancerScan application, from the user's computer to the cloud infrastructure.

## Complete Deployment Architecture

```mermaid
graph TD
    %% Define styles
    classDef frontend fill:#3b82f6,stroke:#1e3a8a,stroke-width:2px,color:white;
    classDef backend fill:#10b981,stroke:#064e3b,stroke-width:2px,color:white;
    classDef ml fill:#8b5cf6,stroke:#4c1d95,stroke-width:2px,color:white;
    classDef db fill:#f59e0b,stroke:#b45309,stroke-width:2px,color:white;
    classDef public fill:#64748b,stroke:#334155,stroke-width:2px,color:white;

    %% Public Layer
    subgraph PUBLIC [Public Web Layer]
        LP[Landing Page<br/>Netlify]:::public
        GH[GitHub Releases<br/>Download Hub]:::public
    end

    %% Client Layer
    subgraph CLIENT [Client Layer - Doctor's PC]
        APP[Desktop Application<br/>Electron .exe + React]:::frontend
    end

    %% Server Layer
    subgraph SERVER [Server Layer - Render Cloud]
        API[Main Backend API<br/>Flask - Port 5099]:::backend
        ML[ML Inference Engine<br/>TensorFlow - Port 5001]:::ml
    end

    %% Database Layer
    subgraph DATABASE [Data Layer - Neon.tech]
        PG[(PostgreSQL Database<br/>neondb)]:::db
    end

    %% Connections
    User([Doctor]) -->|Visits| LP
    LP -.->|Links to| GH
    GH -->|Downloads| APP
    
    APP -->|HTTP POST/GET<br/>JWT Auth| API
    
    API <-->|Image Upload<br/>JSON Results| ML
    
    API -->|SQL Queries| PG
    
    %% Note
    note1[Both APIs run inside the<br/>same Render container instance]
    API -.-> note1
    ML -.-> note1
```

## Data Flow: Processing a Scan

1. **User Interface:** The doctor opens the Electron app and navigates to the "Analysis" screen.
2. **Image Selection:** The doctor uploads a `.jpeg` or `.png` slide from their computer and fills in patient details (Age, Gender, Symptoms).
3. **Frontend API Call:** Axios sends a `multipart/form-data` POST request to `https://cancerscan.onrender.com/api/analysis/predict` including the doctor's JWT token.
4. **Backend Security Check:** The `@require_auth` middleware intercepts the request, verifies the JWT signature, and identifies the doctor.
5. **Backend Processing:** `analysis_routes.py` temporarily saves the image to the server's disk.
6. **ML Relay:** The backend forwards the image to the ML Engine at `http://localhost:5001/predict` (since they run in the same container, `localhost` is extremely fast).
7. **ML Validation:** The Gatekeeper checks if the image has H&E staining colors.
8. **ML Normalization:** Macenko normalizes the slide colors.
9. **ML Inference:** The TensorFlow `lcscnet_fold1.h5` model evaluates the image and returns probabilities for Normal, Adenocarcinoma, and SCC.
10. **Database Write:** The Main Backend receives the probabilities. It converts the slide image into Base64 text. It executes an `INSERT INTO patients` SQL query to Neon.
11. **Frontend Display:** The backend returns the final JSON to the Electron app, which displays the result and allows PDF download.
