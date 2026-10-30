import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { randomBytes, createHash } from "node:crypto";
import { join } from "node:path";
function git(...args) {
  const r = spawnSync("git", args, { encoding: "utf8" });
  if (r.status !== 0) throw new Error("Falha na auditoria: " + r.stderr.trim());
  return r.stdout.trim();
}
const root = git("rev-parse", "--show-toplevel");
const paths = git("diff", "--cached", "--name-only", "-z")
  .split("\0")
  .filter(Boolean);
if (
  !paths.length ||
  paths.every((p) => p.startsWith("docs/auditoria/salvamentos/"))
)
  process.exit(0);
const privatePaths = paths.filter((p) =>
  /(^|\/)(data|node_modules|attachments)(\/|$)|(^|\/)\.env(?:\.|$)|\.(?:sqlite(?:-wal|-shm)?|db|pem|key|xlsx)$/i.test(
    p,
  ),
);
if (privatePaths.length)
  throw new Error(
    "Salvamento interrompido: retire do staging arquivos privados ou operacionais: " +
      privatePaths.join(", "),
  );
const now = new Date(),
  filename =
    now.toISOString().replaceAll(":", "-") +
    "-" +
    randomBytes(4).toString("hex") +
    ".json";
const folder = join(root, "docs/auditoria/salvamentos");
mkdirSync(folder, { recursive: true });
const stagedPrompt = spawnSync(
  "git",
  ["show", ":docs/continuidade/PROMPT_COMPLETO_REVO_PROCESSOS.md"],
  { encoding: "utf8" },
);
if (stagedPrompt.status !== 0)
  throw new Error("O prompt de continuidade precisa estar no índice Git.");
const prompt = stagedPrompt.stdout;
const record = {
  schemaVersion: 1,
  createdAtUTC: now.toISOString(),
  createdAtSaoPaulo: now.toLocaleString("sv-SE", {
    timeZone: "America/Sao_Paulo",
  }),
  repository: "wilsonrvmartins-source/Revo_Esteira_V2",
  targetBranch: "codex/revo-processos",
  baseCommit: git("rev-parse", "HEAD"),
  preparedCodeTree: git("write-tree"),
  summary:
    process.env.REVO_AUDIT_SUMMARY ||
    "Salvamento preparado; consulte a mensagem do commit no Git.",
  changedPaths: paths,
  promptSHA256: createHash("sha256").update(prompt).digest("hex"),
  gitCommitAndPush:
    "O SHA final pertence ao commit que contém este arquivo. Confirmar no remoto depois do push; este registro não afirma envio antecipadamente.",
};
const file = join(folder, filename);
writeFileSync(file, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
git("add", "--", "docs/auditoria/salvamentos/" + filename);
console.log("Auditoria adicionada: docs/auditoria/salvamentos/" + filename);
