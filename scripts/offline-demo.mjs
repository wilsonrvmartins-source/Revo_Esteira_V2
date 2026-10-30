import { fork, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { prepareDemo } from "../server/demo-data.js";
import { DEMO_PROFILES, DEMO_PASSWORD } from "../shared/demo-config.js";
const root = fileURLToPath(new URL("../", import.meta.url));
const args = process.argv.slice(2),
  position = args.indexOf("--data-dir");
if (position >= 0 && !args[position + 1])
  throw new Error("Informe uma pasta vazia para os dados fictícios.");
const folder =
  position >= 0 ? resolve(args[position + 1]) : resolve(root, "data-demo");
if (!existsSync(resolve(root, "dist/index.html")))
  throw new Error(
    "A interface pronta não foi encontrada. Use o pacote local completo ou execute npm run build no código-fonte.",
  );
const data = await prepareDemo(folder);
const server = fork(resolve(root, "server/index.js"), [], {
  cwd: root,
  env: {
    ...process.env,
    NODE_ENV: "production",
    HOST: "127.0.0.1",
    PORT: "0",
    DB_PATH: data.dbPath,
    IMPORT_DIR: data.incoming,
    COOKIE_SECURE: "false",
    REVO_LOCAL_DEMO: "1",
  },
  stdio: ["ignore", "pipe", "pipe", "ipc"],
});
server.stdout.on("data", (x) => process.stdout.write(x));
server.stderr.on("data", (x) => process.stderr.write(x));
let ready = false,
  ending = false;
const timeout = setTimeout(() => {
  console.error(
    "A aplicação demorou para iniciar. Feche esta janela e tente novamente; seus dados de teste serão preservados.",
  );
  server.kill("SIGTERM");
  process.exitCode = 1;
}, 20000);
server.on("error", (error) => {
  clearTimeout(timeout);
  console.error(error.message);
  process.exitCode = 1;
});
function stop() {
  if (!ending) {
    ending = true;
    server.kill("SIGTERM");
  }
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
server.on("exit", (code) => {
  clearTimeout(timeout);
  if (!ready || code) process.exitCode = code || 1;
});
server.on("message", async (message) => {
  if (message?.type !== "ready" || !Number.isInteger(message.port) || ready)
    return;
  ready = true;
  clearTimeout(timeout);
  const url = "http://127.0.0.1:" + message.port;
  console.log("\nREVO PROCESSOS — TESTE LOCAL COM 330 LOJAS FICTÍCIAS");
  console.log("Abra no navegador: " + url);
  console.log(
    "Escolha Administrador, Operador ou Visualizador na tela. Não precisa digitar senha.",
  );
  console.log("Exemplos de planilhas: " + data.examples);
  console.log(
    "Mantenha esta janela aberta enquanto testa. Não é necessário estar conectado à internet.\n",
  );
  if (args.includes("--smoke-test")) {
    try {
      const health = await fetch(url + "/api/health");
      if (!health.ok) throw new Error("Falha na saúde da aplicação.");
      const login = await fetch(url + "/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: DEMO_PROFILES[0].email,
          password: DEMO_PASSWORD,
        }),
      });
      if (!login.ok) throw new Error("Falha no acesso fictício.");
      const response = await fetch(url + "/api/stores", {
        headers: { Cookie: login.headers.get("set-cookie").split(";")[0] },
      });
      const stores = await response.json();
      if (
        stores.length < 330 ||
        !stores.every((s) => s.code.startsWith("DEMO-"))
      )
        throw new Error("A base de demonstração está incorreta.");
      console.log(
        "SMOKE_OK: demonstração isolada, login e lojas fictícias verificados.",
      );
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    } finally {
      stop();
    }
    return;
  }
  if (!args.includes("--no-browser")) {
    const command =
      process.platform === "win32"
        ? ["cmd.exe", ["/d", "/s", "/c", `start "" "${url}"`]]
        : process.platform === "darwin"
          ? ["open", [url]]
          : ["xdg-open", [url]];
    const opener = spawn(command[0], command[1], {
      stdio: "ignore",
      windowsHide: true,
    });
    opener.on("error", () =>
      console.log("Se o navegador não abrir sozinho, copie o endereço acima."),
    );
  }
});
