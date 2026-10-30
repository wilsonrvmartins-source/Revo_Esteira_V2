import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const dir = await mkdtemp(join(tmpdir(), "revo-demo-browser-")),
  data = join(dir, "dados-ficticios");
const child = spawn(
  process.execPath,
  ["scripts/offline-demo.mjs", "--data-dir", data, "--no-browser"],
  { stdio: ["ignore", "pipe", "pipe"] },
);
let logs = "",
  browser;
const base = await new Promise((resolve, reject) => {
  const timeout = setTimeout(
    () => reject(new Error("Não iniciou: " + logs)),
    20000,
  );
  child.stdout.on("data", (bytes) => {
    logs += bytes;
    const match = logs.match(/http:\/\/127\.0\.0\.1:\d+/);
    if (match) {
      clearTimeout(timeout);
      resolve(match[0]);
    }
  });
  child.stderr.on("data", (bytes) => (logs += bytes));
  child.once("exit", (code) => {
    clearTimeout(timeout);
    reject(new Error("Iniciador encerrou: " + code + " " + logs));
  });
});
try {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    remote = [];
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "127.0.0.1") return route.continue();
    remote.push(url.href);
    return route.abort();
  });
  const page = await context.newPage();
  await page.goto(base);
  await page
    .getByRole("heading", { name: "Teste a esteira", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Entrar como Administrador", exact: true })
    .click();
  await page.getByRole("heading", { name: "Esteira de processos." }).waitFor();
  await page.waitForFunction(
    () => document.querySelector(".stats .stat b")?.textContent === "330",
  );
  assert.match(await page.locator(".stats").innerText(), /330/);
  await page.screenshot({
    path: "/workspace/shared/revo-demo-local-desktop.png",
  });
  await page.locator(".card-open").first().click();
  await page
    .getByRole("button", { name: "Dados e etapas", exact: true })
    .click();
  await page.getByLabel("Etapa do processo").selectOption("1");
  await page
    .getByRole("button", { name: "Salvar alterações", exact: true })
    .click();
  await page.getByText("Reivindicado · 25%", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Notas", exact: true }).click();
  await page.getByLabel("Nova nota").fill("Teste local salvo sem internet.");
  await page
    .getByRole("button", { name: "Adicionar nota", exact: true })
    .click();
  await page
    .getByText("Teste local salvo sem internet.", { exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.getByRole("button", { name: /Importação automática/ }).click();
  await page
    .getByLabel("Arquivos Excel (.xlsx)", { exact: true })
    .setInputFiles(join(data, "exemplos/01-novas-lojas-ficticias.xlsx"));
  await page
    .getByRole("button", { name: "Enviar para a pasta", exact: true })
    .click();
  await page
    .getByText("Concluído", { exact: true })
    .waitFor({ timeout: 20000 });
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.waitForFunction(
    () => document.querySelector(".stats .stat b")?.textContent === "332",
  );
  assert.match(await page.locator(".stats").innerText(), /332/);
  const repeated = await context.request.post(
    base + "/api/automation/import/files",
    {
      multipart: {
        file: {
          name: "mesmo-arquivo.xlsx",
          mimeType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          buffer: await readFile(
            join(data, "exemplos/01-novas-lojas-ficticias.xlsx"),
          ),
        },
      },
    },
  );
  assert.equal((await repeated.json()).alreadyProcessed, true);
  await page
    .getByRole("button", { name: "Minha conta", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Sair da conta", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Entrar como Visualizador", exact: true })
    .click();
  await page.getByRole("heading", { name: "Esteira de processos." }).waitFor();
  assert.equal(
    await page.getByRole("button", { name: "Nova loja", exact: false }).count(),
    0,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: "/workspace/shared/revo-demo-local-celular.png",
  });
  assert.deepEqual(remote, []);
  console.log(
    "PASS: demonstração local, 330 lojas fictícias, avanço, notas, importação, deduplicação, visualizador e celular; nenhuma requisição externa.",
  );
} finally {
  if (browser) await browser.close();
  const exit = new Promise((resolve) => child.once("exit", resolve));
  child.kill("SIGTERM");
  await exit;
  await rm(dir, { recursive: true, force: true });
}
