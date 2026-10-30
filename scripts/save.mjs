import { spawnSync } from "node:child_process";
const summary = process.argv.slice(2).join(" ").trim();
if (!summary)
  throw new Error(
    'Use npm run save -- "descrição da etapa" após adicionar os arquivos desejados ao staging.',
  );
function run(args, options = {}) {
  const r = spawnSync("git", args, { encoding: "utf8", ...options });
  if (r.status !== 0)
    throw new Error((r.stderr || r.stdout || "Operação Git falhou.").trim());
  return r.stdout.trim();
}
if (!run(["diff", "--cached", "--name-only"]))
  throw new Error(
    "Nenhum arquivo preparado. Adicione somente os arquivos desta etapa ao staging.",
  );
const remote = run(["remote", "get-url", "origin"]);
if (
  !/^(?:https:\/\/github\.com\/|git@github\.com:)wilsonrvmartins-source\/Revo_Esteira_V2(?:\.git)?$/.test(
    remote,
  )
)
  throw new Error(
    "Destino remoto diferente do projeto autorizado. Nenhum envio foi feito.",
  );
if (run(["config", "--local", "--get", "core.hooksPath"]) !== ".githooks")
  throw new Error("Ative a auditoria com npm run audit:setup antes de salvar.");
console.log(
  run(["commit", "-m", summary], {
    env: { ...process.env, REVO_AUDIT_SUMMARY: summary },
  }),
);
console.log(run(["push", "origin", "HEAD:refs/heads/codex/revo-processos"]));
const local = run(["rev-parse", "HEAD"]),
  remoteHead = run([
    "ls-remote",
    "origin",
    "refs/heads/codex/revo-processos",
  ]).split(/\s/)[0];
if (local !== remoteHead)
  throw new Error(
    "Não foi possível confirmar o SHA no GitHub. O commit local permanece preservado.",
  );
console.log("Salvamento confirmado no GitHub: " + local);
