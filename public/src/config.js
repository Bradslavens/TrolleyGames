// API base URL — auto-selected by environment so no manual editing is needed.
//
// In production the front-end is a Render *static site* served from a different
// origin than the API service, so we target the API explicitly there.
// Everywhere else (local dev, and testing from phones/tablets on your home
// network) the Express server serves BOTH the front-end and the API from the
// same origin, so we just reuse that origin. This makes http://localhost:3001,
// http://127.0.0.1:3001, and http://192.168.x.x:3001 all work automatically.

const PROD_API = "https://trolleygames-1.onrender.com/";
const PROD_FRONTEND_HOST = "trolleygames-2.onrender.com";

const isProd =
  typeof location !== "undefined" && location.hostname === PROD_FRONTEND_HOST;

const sameOrigin =
  typeof location !== "undefined" ? location.origin + "/" : "/";

export const API_BASE_URL = isProd ? PROD_API : sameOrigin;
