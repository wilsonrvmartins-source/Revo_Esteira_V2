import express from "express";
import multer from "multer";
import ExcelJS from "exceljs";
import { randomBytes, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { existsSync } from "node:fs";
import { writeFile, rename, mkdir } from "node:fs/promises";
import { openDB, transaction, hashPassword, checkPassword } from "./db.js";
import {
  HEADERS as headers,
  parseSpreadsheet,
  rememberBaseline,
  markManualOverrides,
} from "./spreadsheet.js";
import { createAutoImporter } from "./auto-import.js";
import { STAGES, ROLES, FIELDS, validateStore, planImport } from "./domain.js";
const root = fileURLToPath(new URL("../", import.meta.url));
const dbPath = process.env.DB_PATH || resolve(root, "data/revo.sqlite");
const db = openDB(dbPath);
const app = express(),
  clients = new Set(),
  imports = new Map(),
  attempts = new Map();
const production = process.env.NODE_ENV === "production";
app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));
app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "same-origin",
    "Cache-Control": "no-store",
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  });
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    if (req.get("sec-fetch-site") === "cross-site")
      return res.status(403).json({ error: "Origem inválida." });
    const origin = req.get("origin");
    if (origin && new URL(origin).host !== req.get("host"))
      return res.status(403).json({ error: "Origem inválida." });
  }
  next();
});
const fail = (status, message) => Object.assign(new Error(message), { status });
const safeUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
});
const audit = (user, id, action, details) =>
  db
    .prepare(
      "INSERT INTO audit(store_id,user_id,action,details) VALUES(?,?,?,?)",
    )
    .run(id, user.id, action, JSON.stringify(details));
const emit = () => {
  for (const c of clients) {
    if (
      c.expires < Date.now() ||
      !db.prepare("SELECT token FROM sessions WHERE token=?").get(c.token)
    ) {
      c.res.end();
      clients.delete(c);
    } else c.res.write("event: changed\ndata: {}\n\n");
  }
};
function session(req, res, user) {
  const token = randomBytes(32).toString("hex"),
    key = createHash("sha256").update(token).digest("hex");
  db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
    key,
    user.id,
    Date.now() + 12 * 3600000,
  );
  res.cookie("revo_session", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: production && process.env.COOKIE_SECURE !== "false",
    maxAge: 12 * 3600000,
    path: "/",
  });
  return safeUser(user);
}
app.get("/api/health", (req, res) => res.json({ ok: true }));
app.get("/api/setup", (req, res) =>
  res.json({ required: !db.prepare("SELECT id FROM users LIMIT 1").get() }),
);
app.post("/api/setup", (req, res) => {
  if (db.prepare("SELECT id FROM users LIMIT 1").get())
    throw fail(409, "Configuração inicial já concluída.");
  if (!process.env.SETUP_TOKEN)
    throw fail(
      503,
      "Defina SETUP_TOKEN no servidor para autorizar a criação do primeiro administrador.",
    );
  const supplied = String(req.body.token || "");
  if (
    createHash("sha256").update(supplied).digest("hex") !==
    createHash("sha256").update(process.env.SETUP_TOKEN).digest("hex")
  )
    throw fail(403, "Token de configuração inválido.");
  const { name, email, password } = validateUser(req.body);
  const id = db
    .prepare("INSERT INTO users(name,email,password,role) VALUES(?,?,?,?)")
    .run(name, email, hashPassword(password), "Administrador").lastInsertRowid;
  res.json(
    session(req, res, db.prepare("SELECT * FROM users WHERE id=?").get(id)),
  );
});
function validateUser(b) {
  const name = String(b.name || "").trim(),
    email = String(b.email || "")
      .trim()
      .toLowerCase(),
    password = String(b.password || "");
  if (
    !name ||
    name.length > 150 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    password.length < 12 ||
    password.length > 128
  )
    throw fail(
      400,
      "Informe nome, e-mail válido e senha de 12 a 128 caracteres.",
    );
  return { name, email, password };
}
app.post("/api/login", (req, res) => {
  const key = req.ip,
    now = Date.now();
  for (const [k, v] of attempts) if (v.until < now) attempts.delete(k);
  const count = attempts.get(key) || { n: 0, until: now + 15 * 60000 };
  if (count.n >= 10) throw fail(429, "Muitas tentativas. Tente em 15 minutos.");
  const password = String(req.body.password || "");
  if (password.length > 128) throw fail(400, "Senha inválida.");
  const u = db.prepare("SELECT * FROM users WHERE email=? AND active=1").get(
    String(req.body.email || "")
      .trim()
      .toLowerCase(),
  );
  if (!u || !checkPassword(password, u.password)) {
    count.n++;
    attempts.set(key, count);
    throw fail(401, "E-mail ou senha incorretos.");
  }
  attempts.delete(key);
  res.json(session(req, res, u));
});
app.use("/api", (req, res, next) => {
  const raw = (req.headers.cookie || "")
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("revo_session="))
    ?.slice(13);
  const key = createHash("sha256")
    .update(raw || "")
    .digest("hex");
  const s = db
    .prepare(
      "SELECT users.*,sessions.expires FROM sessions JOIN users ON users.id=sessions.user_id WHERE token=? AND expires>? AND active=1",
    )
    .get(key, Date.now());
  if (!s) return res.status(401).json({ error: "Faça login para continuar." });
  req.user = safeUser(s);
  req.session = key;
  req.expires = s.expires;
  next();
});
const write = (req, res, next) =>
  req.user.role === "Visualizador"
    ? res.status(403).json({ error: "Seu perfil permite apenas leitura." })
    : next();
const admin = (req, res, next) =>
  req.user.role !== "Administrador"
    ? res.status(403).json({ error: "Acesso exclusivo do administrador." })
    : next();
app.get("/api/me", (req, res) => res.json(req.user));
app.post("/api/password", (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);
  const password = String(req.body.password || "");
  if (password.length < 12 || password.length > 128)
    throw fail(400, "Senha deve ter de 12 a 128 caracteres.");
  if (
    typeof req.body.current !== "string" ||
    req.body.current.length > 128 ||
    !checkPassword(req.body.current, user.password)
  )
    throw fail(403, "Senha atual incorreta.");
  transaction(db, () => {
    db.prepare("UPDATE users SET password=? WHERE id=?").run(
      hashPassword(password),
      user.id,
    );
    db.prepare("DELETE FROM sessions WHERE user_id=?").run(user.id);
    audit(req.user, null, "senha alterada", {});
  });
  session(req, res, user);
  emit();
  res.json({ ok: true });
});
app.post("/api/logout", (req, res) => {
  db.prepare("DELETE FROM sessions WHERE token=?").run(req.session);
  res.clearCookie("revo_session", { path: "/" });
  emit();
  res.json({ ok: true });
});
app.get("/api/events", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  res.write("event: connected\ndata: {}\n\n");
  const c = { res, token: req.session, expires: req.expires };
  clients.add(c);
  const timer = setInterval(() => {
    if (c.expires < Date.now()) {
      res.end();
      return;
    }
    res.write(": keepalive\n\n");
  }, 20000);
  req.on("close", () => {
    clearInterval(timer);
    clients.delete(c);
  });
});
app.get("/api/config", (req, res) =>
  res.json({
    stages: STAGES,
    fields: db.prepare("SELECT * FROM stage_fields ORDER BY stage").all(),
  }),
);
app.put("/api/config/:stage", admin, (req, res) => {
  const stage = Number(req.params.stage),
    label = String(req.body.label || "").trim(),
    instructions = String(req.body.instructions || "");
  if (
    !Number.isInteger(stage) ||
    stage < 0 ||
    stage > 6 ||
    !label ||
    label.length > 100 ||
    instructions.length > 3000
  )
    throw fail(400, "Configuração inválida.");
  transaction(db, () => {
    db.prepare(
      "UPDATE stage_fields SET label=?,instructions=? WHERE stage=?",
    ).run(label, instructions, stage);
    audit(req.user, null, "configuração de etapa", {
      stage,
      label,
      instructions,
    });
  });
  emit();
  res.json({ ok: true });
});
function stores() {
  return db
    .prepare("SELECT * FROM stores ORDER BY updated_at DESC,id DESC")
    .all();
}
function store(id) {
  const s = db.prepare("SELECT * FROM stores WHERE id=?").get(id);
  if (!s) throw fail(404, "Loja não encontrada.");
  return s;
}
app.get("/api/stores", (req, res) => res.json(stores()));
app.post("/api/stores", write, (req, res) => {
  const s = validateStore(req.body);
  let id;
  transaction(db, () => {
    if (db.prepare("SELECT id FROM stores WHERE code=?").get(s.code))
      throw fail(409, "Já existe uma loja com esse código.");
    id = Number(
      db
        .prepare(
          "INSERT INTO stores(code,name,contact,method,owner,city) VALUES(?,?,?,?,?,?)",
        )
        .run(s.code, ...FIELDS.map((k) => s[k])).lastInsertRowid,
    );
    audit(req.user, id, "cadastro", s);
  });
  emit();
  res.status(201).json(store(id));
});
app.get("/api/stores/:id", (req, res) =>
  res.json({
    ...store(req.params.id),
    integrations: db
      .prepare(
        "SELECT section,state,data FROM integrations WHERE store_id=? ORDER BY section",
      )
      .all(req.params.id)
      .map((x) => ({ ...x, data: JSON.parse(x.data) })),
    parameters: db
      .prepare("SELECT stage,value FROM parameters WHERE store_id=?")
      .all(req.params.id),
    notes: db
      .prepare(
        "SELECT notes.*,users.name AS author FROM notes JOIN users ON users.id=notes.user_id WHERE store_id=? ORDER BY notes.id DESC",
      )
      .all(req.params.id),
    latestSource: JSON.parse(
      db
        .prepare("SELECT data FROM source_latest WHERE store_id=?")
        .get(req.params.id)?.data || "null",
    ),
    source: JSON.parse(
      db
        .prepare("SELECT data FROM source_data WHERE store_id=?")
        .get(req.params.id)?.data || "{}",
    ),
    history: db
      .prepare(
        "SELECT audit.*,users.name AS author FROM audit JOIN users ON users.id=audit.user_id WHERE store_id=? ORDER BY audit.id DESC LIMIT 100",
      )
      .all(req.params.id),
  }),
);
app.patch("/api/stores/:id", write, (req, res) => {
  transaction(db, () => {
    const old = store(req.params.id);
    if (req.body.version !== old.version)
      throw fail(
        409,
        "Outra pessoa alterou esta loja. Recarregue os dados antes de salvar.",
      );
    const stage = req.body.stage ?? old.stage;
    if (
      !Number.isInteger(stage) ||
      stage < 0 ||
      stage > 6 ||
      (stage !== old.stage && stage !== old.stage + 1)
    )
      throw fail(400, "Avance somente para a próxima etapa da sequência.");
    const updated = validateStore({ ...old, ...req.body, code: old.code });
    markManualOverrides(
      db,
      old.id,
      FIELDS.filter((k) => Object.hasOwn(req.body, k) && updated[k] !== old[k]),
    );
    db.prepare(
      "UPDATE stores SET name=?,contact=?,method=?,owner=?,city=?,stage=?,version=version+1,updated_at=strftime('%Y-%m-%d %H:%M:%f','now') WHERE id=?",
    ).run(...FIELDS.map((k) => updated[k]), stage, old.id);
    if (req.body.parameters) {
      if (!Array.isArray(req.body.parameters) || req.body.parameters.length > 7)
        throw fail(400, "Parâmetros inválidos.");
      for (const p of req.body.parameters) {
        if (
          !Number.isInteger(p.stage) ||
          p.stage < 0 ||
          p.stage > 6 ||
          typeof p.value !== "string" ||
          p.value.length > 3000
        )
          throw fail(400, "Parâmetro inválido.");
        db.prepare(
          "INSERT INTO parameters VALUES(?,?,?) ON CONFLICT(store_id,stage) DO UPDATE SET value=excluded.value",
        ).run(old.id, p.stage, p.value);
      }
    }
    if (req.body.integrations) {
      if (
        !Array.isArray(req.body.integrations) ||
        req.body.integrations.length > 7
      )
        throw fail(400, "Integração inválida.");
      for (const part of req.body.integrations) {
        if (
          !Number.isInteger(part.section) ||
          part.section < 0 ||
          part.section > 6 ||
          !["Pendente", "Em andamento", "Concluído", "Bloqueado"].includes(
            part.state,
          ) ||
          !part.data ||
          typeof part.data !== "object" ||
          Array.isArray(part.data) ||
          Object.entries(part.data).some(
            ([k, v]) =>
              k.length > 100 || typeof v !== "string" || v.length > 1000,
          ) ||
          Object.keys(part.data).length > 12
        )
          throw fail(400, "Dados de integração inválidos.");
        db.prepare(
          "INSERT INTO integrations VALUES(?,?,?,?) ON CONFLICT(store_id,section) DO UPDATE SET state=excluded.state,data=excluded.data",
        ).run(old.id, part.section, part.state, JSON.stringify(part.data));
      }
    }
    audit(req.user, old.id, "edição", {
      before: old,
      after: { ...updated, stage },
      parameters: req.body.parameters,
      integrations: req.body.integrations,
    });
  });
  emit();
  res.json(store(req.params.id));
});
app.post("/api/stores/:id/notes", write, (req, res) => {
  store(req.params.id);
  const body = String(req.body.body || "").trim();
  if (!body || body.length > 3000)
    throw fail(400, "A nota deve ter entre 1 e 3000 caracteres.");
  transaction(db, () => {
    db.prepare("INSERT INTO notes(store_id,user_id,body) VALUES(?,?,?)").run(
      req.params.id,
      req.user.id,
      body,
    );
    db.prepare(
      "UPDATE stores SET version=version+1,updated_at=strftime('%Y-%m-%d %H:%M:%f','now') WHERE id=?",
    ).run(req.params.id);
    audit(req.user, Number(req.params.id), "nota adicionada", { body });
  });
  emit();
  res.status(201).json({ ok: true });
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
});
app.get("/api/template.xlsx", async (req, res) => {
  const w = new ExcelJS.Workbook(),
    s = w.addWorksheet("Lojas");
  s.addRow(Object.values(headers));
  s.getRow(1).font = { bold: true };
  s.columns.forEach((c) => (c.width = 25));
  res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.set(
    "Content-Disposition",
    'attachment; filename="modelo-processos.xlsx"',
  );
  await w.xlsx.write(res);
  res.end();
});
app.post(
  "/api/import/preview",
  write,
  upload.single("file"),
  async (req, res) => {
    if (!req.file || !req.file.originalname.toLowerCase().endsWith(".xlsx"))
      throw fail(400, "Envie um arquivo .xlsx de até 3 MB.");
    const { rows, columns } = await parseSpreadsheet(req.file.buffer);
    const plan = planImport(rows, new Set(stores().map((s) => s.code)));
    for (const [k, v] of imports) if (v.expires < Date.now()) imports.delete(k);
    if (imports.size >= 100)
      throw fail(429, "Muitas prévias pendentes. Aguarde 10 minutos.");
    const id = randomBytes(16).toString("hex");
    imports.set(id, {
      user: req.user.id,
      plan,
      columns,
      versions: new Map(stores().map((s) => [s.code, s.version])),
      expires: Date.now() + 600000,
    });
    res.json({
      id,
      plan: plan.map((line) => ({
        ...line,
        item: line.item ? { ...line.item, source: undefined } : undefined,
      })),
      columns,
    });
  },
);
app.post("/api/import/commit", write, (req, res) => {
  const entry = imports.get(req.body.id);
  if (!entry || entry.user !== req.user.id || entry.expires < Date.now())
    throw fail(400, "Prévia expirada. Envie o arquivo novamente.");
  const fields = req.body.fields || [];
  if (
    !Array.isArray(fields) ||
    fields.some((k) => !FIELDS.includes(k) || !entry.columns.includes(k))
  )
    throw fail(400, "Campos de atualização inválidos.");
  if (!["skip", "update"].includes(req.body.mode))
    throw fail(400, "Modo inválido.");
  const result = { created: 0, updated: 0, skipped: 0, invalid: 0 };
  transaction(db, () => {
    for (const line of entry.plan) {
      if (["invalid", "duplicate"].includes(line.kind)) {
        result.invalid++;
        continue;
      }
      const s = line.item,
        old = db.prepare("SELECT * FROM stores WHERE code=?").get(s.code);
      if (old) {
        if (req.body.mode !== "update" || fields.length === 0) {
          result.skipped++;
          continue;
        }
        if (entry.versions.get(s.code) !== old.version)
          throw fail(
            409,
            "Dados alterados após a prévia. Gere uma nova prévia.",
          );
        const changes = Object.fromEntries(
          fields
            .filter((k) => s[k] !== "" && s[k] !== old[k])
            .map((k) => [k, s[k]]),
        );
        if (!Object.keys(changes).length) {
          result.skipped++;
          continue;
        }
        db.prepare(
          "UPDATE stores SET " +
            Object.keys(changes)
              .map((k) => k + "=?")
              .join(",") +
            ",version=version+1,updated_at=strftime('%Y-%m-%d %H:%M:%f','now') WHERE id=?",
        ).run(...Object.values(changes), old.id);
        markManualOverrides(db, old.id, Object.keys(changes));
        audit(req.user, old.id, "importação: atualização", {
          before: old,
          changes,
        });
        result.updated++;
      } else {
        const id = Number(
          db
            .prepare(
              "INSERT INTO stores(code,name,contact,method,owner,city) VALUES(?,?,?,?,?,?)",
            )
            .run(s.code, ...FIELDS.map((k) => s[k])).lastInsertRowid,
        );
        db.prepare("UPDATE stores SET stage=? WHERE id=?").run(
          s.initialStage,
          id,
        );
        db.prepare("INSERT INTO source_data VALUES(?,?)").run(
          id,
          JSON.stringify(s.source),
        );
        audit(req.user, id, "importação: cadastro", {
          code: s.code,
          name: s.name,
          stage: s.initialStage,
        });
        rememberBaseline(db, id, s, entry.columns);
        result.created++;
      }
    }
  });
  imports.delete(req.body.id);
  emit();
  res.json(result);
});
app.get("/api/export.xlsx", async (req, res) => {
  const q = String(req.query.q || "").toLocaleLowerCase("pt-BR"),
    stage = req.query.stage;
  const rows = stores().filter(
    (s) =>
      (!stage || String(s.stage) === stage) &&
      (!q ||
        [s.code, s.name, s.owner, s.city].some((x) =>
          x.toLocaleLowerCase("pt-BR").includes(q),
        )),
  );
  const w = new ExcelJS.Workbook(),
    sheet = w.addWorksheet("Processos");
  sheet.addRow([
    ...Object.values(headers),
    "Status",
    "Progresso (%)",
    "Atualizado em",
    ...STAGES.map((s) => "Parâmetro: " + s),
  ]);
  const ps = db.prepare("SELECT * FROM parameters").all();
  for (const s of rows)
    sheet.addRow([
      ...Object.keys(headers).map((k) => s[k]),
      STAGES[s.stage],
      [0, 25, 50, 75, 100, 100, 100][s.stage],
      s.updated_at,
      ...STAGES.map(
        (_, i) =>
          ps.find((p) => p.store_id === s.id && p.stage === i)?.value || "",
      ),
    ]);
  const selected = new Set(rows.map((s) => s.id));
  for (const [table, title] of [
    ["source_data", "Origem preservada"],
    ["source_latest", "Origem automática"],
  ]) {
    const sourceRows = db
      .prepare("SELECT store_id,data FROM " + table)
      .all()
      .filter((s) => selected.has(s.store_id))
      .map((s) => JSON.parse(s.data));
    if (!sourceRows.length) continue;
    const sourceSheet = w.addWorksheet(title),
      titles = [...new Set(sourceRows.flatMap(Object.keys))];
    sourceSheet.addRow(titles);
    sourceRows.forEach((r) =>
      sourceSheet.addRow(titles.map((t) => String(r[t] ?? ""))),
    );
    sourceSheet.getRow(1).font = { bold: true };
    sourceSheet.columns.forEach((c) => (c.width = 25));
  }
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.columns.forEach((c) => (c.width = 25));
  res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.set("Content-Disposition", 'attachment; filename="processos.xlsx"');
  await w.xlsx.write(res);
  res.end();
});
app.get("/api/users", admin, (req, res) =>
  res.json(
    db
      .prepare("SELECT id,name,email,role,active FROM users ORDER BY name")
      .all(),
  ),
);
app.post("/api/users", admin, (req, res) => {
  const u = validateUser(req.body);
  if (!ROLES.includes(req.body.role)) throw fail(400, "Perfil inválido.");
  transaction(db, () => {
    db.prepare(
      "INSERT INTO users(name,email,password,role) VALUES(?,?,?,?)",
    ).run(u.name, u.email, hashPassword(u.password), req.body.role);
    audit(req.user, null, "usuário criado", {
      email: u.email,
      role: req.body.role,
    });
  });
  res.status(201).json({ ok: true });
});
app.patch("/api/users/:id", admin, (req, res) => {
  const id = Number(req.params.id),
    role = req.body.role,
    active = req.body.active ? 1 : 0;
  if (id === req.user.id)
    throw fail(
      400,
      "Não é permitido alterar o próprio perfil ou desativar sua conta.",
    );
  if (!ROLES.includes(role)) throw fail(400, "Perfil inválido.");
  if (!db.prepare("SELECT id FROM users WHERE id=?").get(id))
    throw fail(404, "Usuário não encontrado.");
  transaction(db, () => {
    db.prepare("UPDATE users SET role=?,active=? WHERE id=?").run(
      role,
      active,
      id,
    );
    if (req.body.password) {
      if (
        typeof req.body.password !== "string" ||
        req.body.password.length < 12 ||
        req.body.password.length > 128
      )
        throw fail(400, "Senha deve ter de 12 a 128 caracteres.");
      db.prepare("UPDATE users SET password=? WHERE id=?").run(
        hashPassword(req.body.password),
        id,
      );
    }
    db.prepare("DELETE FROM sessions WHERE user_id=?").run(id);
    audit(req.user, null, "usuário alterado", {
      id,
      role,
      active,
      passwordReset: !!req.body.password,
    });
  });
  emit();
  res.json({ ok: true });
});
const automation = createAutoImporter({
  db,
  directory:
    process.env.IMPORT_DIR || resolve(dirname(dbPath), "importacao/entrada"),
  onChange: emit,
});
app.get("/api/automation/import", write, (req, res) =>
  res.json(automation.status()),
);
app.put("/api/automation/import", admin, (req, res) => {
  if (typeof req.body.enabled !== "boolean")
    throw fail(400, "Informe se a automação deve ficar ativa.");
  transaction(db, () => {
    automation.setEnabled(req.body.enabled);
    audit(req.user, null, "configuração de importação automática", {
      enabled: req.body.enabled,
    });
  });
  emit();
  res.json(automation.status());
});
app.post(
  "/api/automation/import/files",
  write,
  upload.single("file"),
  async (req, res) => {
    if (!req.file || !req.file.originalname.toLowerCase().endsWith(".xlsx"))
      throw fail(400, "Envie uma planilha .xlsx.");
    await parseSpreadsheet(req.file.buffer);
    const digest = createHash("sha256").update(req.file.buffer).digest("hex");
    const previous = db
      .prepare("SELECT status FROM auto_import_files WHERE digest=?")
      .get(digest);
    if (previous)
      return res.json({
        queued: false,
        alreadyProcessed: true,
        status: previous.status,
      });
    const state = automation.status();
    if (!state.ready)
      throw fail(
        409,
        "É necessário um administrador ativo para executar a automação.",
      );
    const stem =
      req.file.originalname
        .replace(/\.xlsx$/i, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .slice(0, 90) || "planilha";
    const name =
      stem + "-" + Date.now() + "-" + randomBytes(6).toString("hex") + ".xlsx";
    await mkdir(state.folder, { recursive: true, mode: 0o700 });
    const temporary = resolve(state.folder, name + ".uploading"),
      destination = resolve(state.folder, name);
    await writeFile(temporary, req.file.buffer, { flag: "wx", mode: 0o600 });
    await rename(temporary, destination);
    audit(req.user, null, "planilha enviada à pasta automática", {
      filename: name,
      digest,
    });
    await automation.scan();
    emit();
    res
      .status(202)
      .json({ queued: true, filename: name, enabled: state.enabled });
  },
);
app.post("/api/automation/import/scan", write, async (req, res) => {
  await automation.scan();
  res.json(automation.status());
});
app.use("/api", (req, res) =>
  res.status(404).json({ error: "Rota não encontrada." }),
);
if (production) {
  if (!existsSync(resolve(root, "dist/index.html")))
    throw new Error("Execute npm run build antes de iniciar em produção.");
  app.use(express.static(resolve(root, "dist")));
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    configFile: resolve(root, "vite.config.js"),
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const unique = String(err.message).includes("UNIQUE constraint");
  res
    .status(
      err.status ||
        (unique ? 409 : err instanceof multer.MulterError ? 400 : 400),
    )
    .json({
      error: unique
        ? "Já existe um registro com esse código ou e-mail."
        : err.message || "Erro inesperado.",
    });
});
automation.start();
const server = app.listen(
  Number(process.env.PORT || 3000),
  process.env.HOST || "127.0.0.1",
  () =>
    console.log(
      "REVO Processos iniciado na porta " + (process.env.PORT || 3000),
    ),
);
process.on("SIGTERM", () => {
  automation.stop();
  for (const c of clients) c.res.end();
  server.close(() => {
    db.close();
    process.exit(0);
  });
});
