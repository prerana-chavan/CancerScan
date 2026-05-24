// Automatically detect if we are running in the browser (live web) or packaged .exe
const isWebProduction = window.location.protocol === 'https:' && window.location.hostname !== 'localhost';
const isAsarPackaged = window.location.href.includes('app.asar');
const isPackagedExe = (window.electronAPI && window.electronAPI.isPackaged) || isAsarPackaged;

// If live web OR packaged .exe -> Use Render Backend
// If local development (start_all.bat) -> Use localhost
const useProductionBackend = isWebProduction || isPackagedExe;

const BASE_URL = useProductionBackend ? 'https://cancerscan.onrender.com' : 'http://localhost:5099';
const ML_URL   = useProductionBackend ? 'https://cancerscan.onrender.com' : 'http://localhost:5001';

export { BASE_URL, ML_URL };
