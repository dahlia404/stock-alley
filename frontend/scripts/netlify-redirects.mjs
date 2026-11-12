// Writes dist/_redirects for Netlify: proxies /api/* to BACKEND_URL (same-origin, so the
// login cookie works) and falls back to index.html for client-side routes.
import { writeFileSync } from "node:fs";

const backend = (process.env.BACKEND_URL || "").trim().replace(/\/+$/, "");
if (!/^https?:\/\//.test(backend)) {
  console.error(
    "\n[netlify-redirects] Falta la variable BACKEND_URL (p. ej. https://alleystock-api.onrender.com).\n" +
      "Añádela en Netlify > Site configuration > Environment variables y vuelve a desplegar.\n",
  );
  process.exit(1);
}

writeFileSync(
  "dist/_redirects",
  `/api/*  ${backend}/api/:splat  200!\n/*  /index.html  200\n`,
);
console.log(`[netlify-redirects] /api/* -> ${backend}/api/`);
