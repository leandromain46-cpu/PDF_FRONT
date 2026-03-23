const isLocalHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);

const LOCAL_API_BASE = "http://localhost:3000/api";
const PROD_API_BASE = "https://pdf-generador-arg-backend-production-90a5.up.railway.app/api";

export const API_BASE = isLocalHost ? LOCAL_API_BASE : PROD_API_BASE;