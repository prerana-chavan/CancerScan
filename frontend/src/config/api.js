// Use Render Cloud in Production (.exe), stay Local during Development (npm run dev)
const isProd = import.meta.env.PROD;
const BASE_URL = isProd ? 'https://cancerscan.onrender.com' : 'http://localhost:5099';
const ML_URL   = isProd ? 'https://cancerscan.onrender.com' : 'http://localhost:5001';

export { BASE_URL, ML_URL };
