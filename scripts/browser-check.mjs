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
const stopRecording = process.env.RECORD_DEMO
  ? await (await import("./record-demo.mjs")).recordDemo(page)
  : null;
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto("http://127.0.0.1:3327");
  await page.getByRole("heading", { name: "Prepare sua operação" }).waitFor();
  await page.screenshot({ path: "/tmp/revo-login.png", fullPage: true });
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
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: /Importação automática/ }).click();
  await page
    .getByRole("heading", { name: "Importação automática", exact: true })
    .waitFor();
  await page.getByLabel("Pasta de origem", { exact: true }).waitFor();
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Lojas");
  sheet.addRow(["Merchant ID", "Merchant Name", "Merchant Status"]);
  sheet.addRow(["DEMO-AUTO", "Loja importada automaticamente", "Entrando"]);
  const buffer = await workbook.xlsx.writeBuffer();
  if (process.env.RECORD_DEMO) await page.waitForTimeout(1200);
  await page
    .getByLabel("Arquivos Excel (.xlsx)", { exact: true })
    .setInputFiles({
      name: "demonstracao.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer,
    });
  await page
    .getByRole("button", { name: "Enviar para a pasta", exact: true })
    .click();
  await page
    .getByText("Concluído", { exact: true })
    .waitFor({ timeout: 20000 });
  await page.screenshot({ path: "/tmp/revo-automacao.png", fullPage: true });
  if (process.env.RECORD_DEMO) await page.waitForTimeout(1800);
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page
    .getByRole("heading", {
      name: "Loja importada automaticamente",
      exact: true,
    })
    .waitFor();
  const repeated = await context.request.post(
    "http://127.0.0.1:3327/api/automation/import/files",
    {
      multipart: {
        file: {
          name: "outro-computador.xlsx",
          mimeType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          buffer,
        },
      },
    },
  );
  assert.equal((await repeated.json()).alreadyProcessed, true);
  assert.equal(
    await page
      .getByRole("heading", {
        name: "Loja importada automaticamente",
        exact: true,
      })
      .count(),
    1,
  );
  if (process.env.RECORD_DEMO) await page.waitForTimeout(1800);
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(
      () =>
        new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        ),
    );
    const layout = await page.evaluate(() => {
      const issues = [];
      if (document.documentElement.scrollWidth > innerWidth)
        issues.push("rolagem horizontal da página");
      for (const brand of document.querySelectorAll(".brand-lockup")) {
        const subtitle = brand.querySelector(".brand-subtitle");
        const range = document.createRange();
        range.selectNodeContents(subtitle);
        const text = range.getBoundingClientRect();
        const owner =
          brand.closest("aside") || brand.closest(".page-watermark");
        const area = owner.getBoundingClientRect();
        if (
          text.left < Math.max(0, area.left) - 1 ||
          text.right > Math.min(innerWidth, area.right) + 1 ||
          text.top < area.top - 1 ||
          text.bottom > area.bottom + 1
        )
          issues.push("PROCESSOS cortado");
      }
      return issues;
    });
    assert.deepEqual(layout, [], `Layout e marca completos em ${width}px`);
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS: bootstrap, login, cadastro, transição 25%, integração, busca por etapa, importação automática e layout de 320px a 1920px, com a palavra PROCESSOS inteira.",
  );
} finally {
  if (stopRecording) await stopRecording();
  await context.close();
  await browser.close();
  const done = new Promise((r) => server.once("exit", r));
  server.kill("SIGTERM");
  await done;
  await rm(dir, { recursive: true, force: true });
}
