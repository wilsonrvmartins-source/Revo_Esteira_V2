import { DatabaseSync } from "node:sqlite";
import { mkdirSync, chmodSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
const source = resolve(process.env.DB_PATH || "data/revo.sqlite");
if (!existsSync(source))
  throw new Error(
    "Banco não encontrado. Inicie a aplicação antes de criar backup.",
  );
const destination = resolve(
  process.argv[2] ||
    "data/backups/revo-" +
      new Date().toISOString().replaceAll(":", "-") +
      ".sqlite",
);
if (source === destination || existsSync(destination))
  throw new Error(
    "Escolha um novo destino; arquivos existentes nunca são sobrescritos.",
  );
mkdirSync(dirname(destination), { recursive: true });
const db = new DatabaseSync(source);
db.prepare("VACUUM INTO ?").run(destination);
db.close();
chmodSync(destination, 0o600);
const copy = new DatabaseSync(destination, { readOnly: true });
const result = copy.prepare("PRAGMA integrity_check").get();
copy.close();
if (Object.values(result)[0] !== "ok")
  throw new Error("Falha na integridade do backup.");
console.log("Backup consistente e verificado: " + destination);
console.log(
  "Guarde uma cópia fora deste ambiente. Este arquivo contém dados privados.",
);
