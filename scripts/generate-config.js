const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env");
const outPath = path.join(root, "public", "js", "config.js");

function parseEnv(text) {
  const out = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i === -1) continue;
    const key = trimmed.slice(0, i).trim();
    let val = trimmed.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

if (!fs.existsSync(envPath)) {
  console.error("\n  Falta archivo .env\n");
  process.exit(1);
}

const env = parseEnv(fs.readFileSync(envPath, "utf8"));
const apiKey = env.ESPO_API_KEY || "";

if (!apiKey) {
  console.error("\n  Falta ESPO_API_KEY en .env\n");
  process.exit(1);
}

const asignaciones = [];
if (env.ASIGNACION_USER_ID_CONTAMINACION) {
  asignaciones.push({
    campo: env.ASIGNACION_CAMPO_TIPO || "tipoCaso",
    valor: env.ASIGNACION_VALOR_CONTAMINACION || "Contaminación",
    assignedUserId: env.ASIGNACION_USER_ID_CONTAMINACION,
    emailFuncionario: env.ASIGNACION_EMAIL_CONTAMINACION || "",
    nombreFuncionario: env.ASIGNACION_NOMBRE_CONTAMINACION || "",
  });
}

const content = `// Generado desde .env
window.CRM_CONFIG = {
  apiKey: ${JSON.stringify(apiKey)},
  emailFrom: ${JSON.stringify(env.EMAIL_FROM || "")},
  emailFromName: ${JSON.stringify(env.EMAIL_FROM_NAME || "CRM Envigado")},
  campoEmailCiudadano: ${JSON.stringify(env.CAMPO_EMAIL_CIUDADANO || "emailReportante")},
  asignaciones: ${JSON.stringify(asignaciones)},
};
`;

fs.writeFileSync(outPath, content, "utf8");
console.log("  config.js actualizado");
