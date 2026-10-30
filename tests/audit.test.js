import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  readdir,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
const script = resolve("scripts/audit-save.mjs"),
  setup = resolve("scripts/install-audit-hook.mjs");
async function temporary(fn) {
  const dir = await mkdtemp(join(tmpdir(), "revo-audit-"));
  function git(...args) {
    const r = spawnSync("git", args, { cwd: dir, encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
    return r.stdout.trim();
  }
  try {
    git("init", "-q");
    git("config", "user.name", "Audit Test");
    git("config", "user.email", "test@example.invalid");
    await mkdir(join(dir, "docs/continuidade"), { recursive: true });
    await writeFile(
      join(dir, "docs/continuidade/PROMPT_COMPLETO_REVO_PROCESSOS.md"),
      "Prompt de teste\n",
    );
    git("add", ".");
    git("commit", "-qm", "base");
    await fn({ dir, git });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
test("auditoria registra versão base, paths e hash exato do prompt sem afirmar push", () =>
  temporary(async ({ dir, git }) => {
    const base = git("rev-parse", "HEAD");
    await writeFile(join(dir, "app.js"), 'console.log("teste");\n');
    git("add", "app.js");
    const r = spawnSync(process.execPath, [script], {
      cwd: dir,
      encoding: "utf8",
      env: { ...process.env, REVO_AUDIT_SUMMARY: "Etapa de teste" },
    });
    assert.equal(r.status, 0, r.stderr);
    const folder = join(dir, "docs/auditoria/salvamentos"),
      files = await readdir(folder);
    assert.equal(files.length, 1);
    const record = JSON.parse(await readFile(join(folder, files[0]), "utf8"));
    assert.equal(record.baseCommit, base);
    assert.deepEqual(record.changedPaths, ["app.js"]);
    assert.equal(record.summary, "Etapa de teste");
    assert.equal(
      record.promptSHA256,
      createHash("sha256").update("Prompt de teste\n").digest("hex"),
    );
    assert.match(record.gitCommitAndPush, /não afirma envio/);
    assert.ok(git("diff", "--cached", "--name-only").includes(files[0]));
  }));
test("arquivo privado preparado impede a auditoria de salvar", () =>
  temporary(async ({ dir, git }) => {
    await writeFile(join(dir, ".env"), "EXEMPLO=apenas-teste\n");
    git("add", ".env");
    const r = spawnSync(process.execPath, [script], {
      cwd: dir,
      encoding: "utf8",
    });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /arquivos privados/);
  }));
test("instalação preserva hooks de outro fluxo", () =>
  temporary(async ({ dir, git }) => {
    git("config", "--local", "core.hooksPath", "meus-hooks");
    const r = spawnSync(process.execPath, [setup], {
      cwd: dir,
      encoding: "utf8",
    });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(
      git("config", "--local", "--get", "core.hooksPath"),
      "meus-hooks",
    );
  }));
