// Automatically switch between localhost (for local Electron/Dev) and Render (for live web)
const isWebProduction = window.location.protocol === 'https:' && window.location.hostname !== 'localhost';

// Production: Render backend | Local: localhost
const BASE_URL = isWebProduction ? 'https://cancerscan.onrender.com' : 'http://localhost:5099';
const ML_URL   = isWebProduction ? 'https://cancerscan.onrender.com' : 'http://localhost:5001';

export { BASE_URL, ML_URL };
