import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const dir = await mkdtemp(join(tmpdir(), "revo-browser-"));
const server = spawn(process.execPath, ["server/index.js"], {
  env: {
    ...process.env,
    NODE_ENV: "production",
    DB_PATH: join(dir, "test.sqlite"),
    SETUP_TOKEN: "browser-test-token",
    COOKIE_SECURE: "false",
    PORT: "3327",
  },
});
let logs = "";
server.stdout.on("data", (x) => (logs += x));
server.stderr.on("data", (x) => (logs += x));
let ready = false;
for (let i = 0; i < 100; i++) {
  try {
    if ((await fetch("http://127.0.0.1:3327/api/health")).ok) {
      ready = true;
      break;
    }
  } catch {}
  await new Promise((r) => setTimeout(r, 100));
}
if (!ready) {
  server.kill();
  throw new Error(logs);
}
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto("http://127.0.0.1:3327");
  await page.getByRole("heading", { name: "Prepare sua operação" }).waitFor();
  await page.getByLabel("Seu nome").fill("Equipe de teste");
  await page
    .getByLabel("Token de configuração do servidor")
    .fill("browser-test-token");
  await page.getByLabel("E-mail", { exact: true }).fill("browser@example.com");
  await page.getByLabel("Senha", { exact: true }).fill("browser-test-password");
  await page.getByRole("button", { name: "Criar administrador" }).click();
  await page.getByRole("heading", { name: "Esteira de processos." }).waitFor();
  await page.getByRole("button", { name: "Nova loja" }).click();
  await page.getByLabel("Merchant ID", { exact: true }).fill("BROWSER-01");
  await page
    .getByLabel("Nome da loja", { exact: true })
    .fill("Loja de validação visual");
  await page.getByLabel("Responsável", { exact: true }).fill("Equipe REVO");
  await page.getByLabel("Cidade", { exact: true }).fill("Rio Verde");
  await page.getByRole("button", { name: "Cadastrar loja" }).click();
  await page
    .getByRole("heading", { name: "Loja de validação visual" })
    .waitFor();
  await page.screenshot({ path: "/tmp/revo-desktop.png", fullPage: true });
  await page.getByRole("heading", { name: "Loja de validação visual" }).click();
  await page.getByText("Progresso desta loja", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Dados e etapas", exact: true })
    .click();
  await page.getByLabel("Etapa do processo").selectOption("1");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await page.getByText("Reivindicado · 25%", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Timeline de integração", exact: true })
    .click();
  await page
    .getByLabel("Buscar em Assinando", { exact: true })
    .fill("contrato");
  assert.equal(
    await page.getByLabel("Contrato", { exact: true }).isVisible(),
    true,
  );
  await page.getByLabel("Contrato", { exact: true }).fill("Contrato de teste");
  await page
    .getByRole("button", { name: "Salvar integração", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Alterações salvas." })
    .waitFor();
  await page.screenshot({ path: "/tmp/revo-timeline.png", fullPage: true });
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page
    .getByLabel("Buscar em Reivindicado", { exact: true })
    .fill("não existe");
  assert.equal(
    await page
      .getByRole("heading", { name: "Loja de validação visual" })
      .count(),
    0,
  );
  await page.getByLabel("Buscar em Reivindicado", { exact: true }).fill("");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "/tmp/revo-mobile.png", fullPage: true });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    "Página não deve ter overflow horizontal",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: bootstrap, login, cadastro, transição 25%, integração, busca por etapa e layout móvel.",
  );
} finally {
  await browser.close();
  const done = new Promise((r) => server.once("exit", r));
  server.kill("SIGTERM");
  await done;
  await rm(dir, { recursive: true, force: true });
}
