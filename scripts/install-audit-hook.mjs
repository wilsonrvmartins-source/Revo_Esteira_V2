import { spawnSync } from "node:child_process";
const git = (...args) => spawnSync("git", args, { encoding: "utf8" });
if (git("rev-parse", "--is-inside-work-tree").status !== 0) {
  console.log(
    "Sem checkout Git: auditoria por commit será ativada quando houver repositório.",
  );
  process.exit(0);
}
const current = git("config", "--local", "--get", "core.hooksPath");
if (current.status !== 0 && current.status !== 1)
  throw new Error("Não foi possível verificar os hooks existentes.");
if (current.stdout.trim() && current.stdout.trim() !== ".githooks") {
  console.log(
    "Hooks existentes preservados. Integre manualmente a auditoria antes de salvar.",
  );
  process.exit(0);
}
const result = git("config", "--local", "core.hooksPath", ".githooks");
if (result.status !== 0)
  throw new Error("Não foi possível ativar a auditoria: " + result.stderr);
console.log("Auditoria de commits ativada em .githooks.");
