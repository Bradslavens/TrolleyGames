// API base URL — auto-selected by environment so no manual editing is needed
// before deploying. Override either value if your URLs change.
const PROD_API = "https://trolleygames-1.onrender.com/";
const LOCAL_API = "http://localhost:3001/";

const isLocal =
  typeof location !== "undefined" &&
  (location.hostname === "localhost" || location.hostname === "127.0.0.1");

export const API_BASE_URL = isLocal ? LOCAL_API : PROD_API;
