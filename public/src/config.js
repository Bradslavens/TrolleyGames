// Auto-detect environment and set appropriate API URL
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export const API_BASE_URL = isLocalhost 
  ? "http://localhost:3001/"  // Local development
  : "https://trolleygames-1.onrender.com/";  // Production on Render

// Debug logging
console.log('Current hostname:', window.location.hostname);
console.log('Is localhost:', isLocalhost);
console.log('API_BASE_URL:', API_BASE_URL);
