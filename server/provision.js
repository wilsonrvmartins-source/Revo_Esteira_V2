import { randomBytes } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { openDB, transaction, hashPassword } from "./db.js";

// Explicit local-owner command. Never called automatically by the web server.
// Credentials are returned only to the caller in memory; CLI logs contain no password.
export function provisionOwner({
  dbPath = resolve("data/revo.sqlite"),
  accessFile = resolve("data/revo-acesso-inicial.txt"),
} = {}) {
  const db = openDB(dbPath);
  try {
    const email = "admin@revo.local",
      password = randomBytes(24).toString("base64url");
    transaction(db, () => {
      if (db.prepare("SELECT id FROM users LIMIT 1").get())
        throw new Error(
          "Já existe usuário. Nenhuma conta ou senha foi alterada.",
        );
      const id = db
        .prepare("INSERT INTO users(name,email,password,role) VALUES(?,?,?,?)")
        .run(
          "Administrador REVO",
          email,
          hashPassword(password),
          "Administrador",
        ).lastInsertRowid;
      db.prepare(
        "INSERT INTO audit(store_id,user_id,action,details) VALUES(NULL,?,?,?)",
      ).run(
        id,
        "administrador inicial preparado",
        JSON.stringify({
          method: "comando local autorizado pelo proprietário",
        }),
      );
      mkdirSync(dirname(accessFile), { recursive: true });
      writeFileSync(
        accessFile,
        [
          "REVO PROCESSOS — ACESSO INICIAL PRIVADO",
          "",
          "Usuário: " + email,
          "Senha: " + password,
          "",
          "Guarde este arquivo em local privado. Não compartilhe nem envie ao GitHub.",
          "Depois de entrar, use Minha conta para trocar a senha.",
          "O usuário é uma identificação local: não é uma caixa de e-mail.",
          "Este arquivo não é um link de publicação da aplicação.",
          "",
        ].join("\n"),
        { flag: "wx", mode: 0o600 },
      );
    });
    return { email, password, accessFile };
  } finally {
    db.close();
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const result = provisionOwner({
      dbPath: process.env.DB_PATH ? resolve(process.env.DB_PATH) : undefined,
      accessFile: process.argv[2] ? resolve(process.argv[2]) : undefined,
    });
    console.log(
      "Administrador preparado. Acesso privado salvo em: " + result.accessFile,
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
