import { mkdir, readdir, stat, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { transaction } from "./db.js";
import { FIELDS, planImport } from "./domain.js";
import {
  parseSpreadsheet,
  rememberBaseline,
  SOURCE_NAMES,
} from "./spreadsheet.js";

export function createAutoImporter({
  db,
  directory,
  onChange = () => {},
  intervalMs = 5000,
  settleMs = 3000,
  now = Date.now,
}) {
  const folder = resolve(directory),
    observed = new Map();
  let timer,
    busy = false,
    stopped = false,
    lastChecked = null,
    lastError = null;
  const enabled = () =>
    db
      .prepare("SELECT value FROM app_settings WHERE key='auto_import_enabled'")
      .get()?.value !== "false";
  const actor = () =>
    db
      .prepare(
        "SELECT id FROM users WHERE active=1 AND role='Administrador' ORDER BY id LIMIT 1",
      )
      .get();
  const setEnabled = (value) =>
    db
      .prepare(
        "INSERT INTO app_settings(key,value) VALUES('auto_import_enabled',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
      )
      .run(String(value));
  function status() {
    return {
      folder,
      enabled: enabled(),
      running: busy,
      intervalSeconds: intervalMs / 1000,
      settleSeconds: settleMs / 1000,
      lastChecked,
      lastError,
      ready: !!actor(),
      history: db
        .prepare(
          "SELECT * FROM auto_import_files ORDER BY created_at DESC,rowid DESC LIMIT 50",
        )
        .all()
        .map((r) => ({ ...r, result: JSON.parse(r.result) })),
    };
  }
  function previous(store, field) {
    const known = db
      .prepare("SELECT value FROM import_baseline WHERE store_id=? AND field=?")
      .get(store.id, field);
    if (known) return known.value;
    const source = JSON.parse(
      db.prepare("SELECT data FROM source_data WHERE store_id=?").get(store.id)
        ?.data || "{}",
    );
    for (const key of SOURCE_NAMES[field])
      if (Object.hasOwn(source, key)) return String(source[key]).trim();
    return store[field] === "" ? "" : undefined;
  }
  function record(digest, filename, state, result) {
    db.prepare(
      "INSERT INTO auto_import_files(digest,filename,status,result) VALUES(?,?,?,?)",
    ).run(digest, filename, state, JSON.stringify(result));
  }
  async function processFile(buffer, digest, filename, user, modifiedMs) {
    try {
      const { rows, columns } = await parseSpreadsheet(buffer),
        plan = planImport(
          rows,
          new Set(
            db
              .prepare("SELECT code FROM stores")
              .all()
              .map((s) => s.code),
          ),
        );
      // Unattended imports never silently choose among duplicate or invalid rows.
      const invalid = plan.filter((r) =>
        ["invalid", "duplicate"].includes(r.kind),
      );
      if (!plan.length) throw new Error("A planilha está vazia.");
      if (invalid.length)
        throw new Error(
          "Arquivo não aplicado: " +
            invalid.length +
            " linha(s) inválida(s) ou com Merchant ID repetido. Linhas: " +
            invalid
              .slice(0, 20)
              .map((r) => r.row)
              .join(", "),
        );
      transaction(db, () => {
        if (
          db
            .prepare("SELECT digest FROM auto_import_files WHERE digest=?")
            .get(digest)
        )
          return;
        const result = {
          created: 0,
          updated: 0,
          preserved: 0,
          protectedFields: 0,
          olderReports: 0,
          conflicts: [],
        };
        for (const line of plan) {
          const s = line.item,
            old = db.prepare("SELECT * FROM stores WHERE code=?").get(s.code);
          if (!old) {
            const id = Number(
              db
                .prepare(
                  "INSERT INTO stores(code,name,contact,method,owner,city,stage) VALUES(?,?,?,?,?,?,?)",
                )
                .run(s.code, ...FIELDS.map((k) => s[k]), s.initialStage)
                .lastInsertRowid,
            );
            db.prepare("INSERT INTO source_data VALUES(?,?)").run(
              id,
              JSON.stringify(s.source),
            );
            db.prepare("INSERT INTO source_latest VALUES(?,?,?)").run(
              id,
              JSON.stringify(s.source),
              modifiedMs,
            );
            rememberBaseline(db, id, s, columns);
            db.prepare(
              "INSERT INTO audit(store_id,user_id,action,details) VALUES(?,?,?,?)",
            ).run(
              id,
              user.id,
              "importação automática: cadastro",
              JSON.stringify({
                filename,
                digest,
                code: s.code,
                stage: s.initialStage,
              }),
            );
            result.created++;
            continue;
          }
          const latest = db
            .prepare(
              "SELECT data,modified_ms FROM source_latest WHERE store_id=?",
            )
            .get(old.id);
          if (latest && latest.modified_ms > modifiedMs) {
            result.preserved++;
            result.olderReports++;
            continue;
          }
          const previousSource = JSON.parse(
            latest?.data ||
              db
                .prepare("SELECT data FROM source_data WHERE store_id=?")
                .get(old.id)?.data ||
              "{}",
          );
          const nextSource = {
            ...previousSource,
            ...Object.fromEntries(
              Object.entries(s.source).filter(
                ([, v]) => String(v).trim() !== "",
              ),
            ),
          };
          const sameSource =
            JSON.stringify(Object.entries(previousSource).sort()) ===
            JSON.stringify(Object.entries(nextSource).sort());
          const changes = {};
          for (const field of columns.filter((k) => FIELDS.includes(k))) {
            if (s[field] === "" || s[field] === old[field]) continue;
            const baseline = previous(old, field),
              locked = db
                .prepare(
                  "SELECT field FROM manual_overrides WHERE store_id=? AND field=?",
                )
                .get(old.id, field);
            if (locked || baseline === undefined || old[field] !== baseline) {
              result.protectedFields++;
              if (result.conflicts.length < 100)
                result.conflicts.push({
                  code: s.code,
                  field,
                  reason: "Campo editado manualmente ou sem origem conhecida",
                });
              continue;
            }
            changes[field] = s[field];
          }
          if (Object.keys(changes).length || !sameSource) {
            db.prepare(
              "UPDATE stores SET " +
                Object.keys(changes)
                  .map((k) => k + "=?")
                  .concat("version=version+1")
                  .join(",") +
                ",updated_at=strftime('%Y-%m-%d %H:%M:%f','now') WHERE id=?",
            ).run(...Object.values(changes), old.id);
            db.prepare(
              "INSERT INTO audit(store_id,user_id,action,details) VALUES(?,?,?,?)",
            ).run(
              old.id,
              user.id,
              "importação automática: atualização",
              JSON.stringify({
                filename,
                digest,
                changes,
                sourceUpdated: !sameSource,
              }),
            );
            result.updated++;
          } else result.preserved++;
          db.prepare(
            "INSERT INTO source_latest VALUES(?,?,?) ON CONFLICT(store_id) DO UPDATE SET data=excluded.data,modified_ms=excluded.modified_ms",
          ).run(old.id, JSON.stringify(nextSource), modifiedMs);
          rememberBaseline(db, old.id, s, columns);
        }
        record(digest, filename, "processed", result);
      });
    } catch (error) {
      if (
        !db
          .prepare("SELECT digest FROM auto_import_files WHERE digest=?")
          .get(digest)
      )
        transaction(db, () =>
          record(digest, filename, "error", { error: error.message }),
        );
    }
    onChange();
  }
  async function scan() {
    if (busy || stopped || !enabled()) return;
    const user = actor();
    if (!user) return;
    busy = true;
    lastError = null;
    try {
      await mkdir(folder, { recursive: true, mode: 0o700 });
      const entries = (await readdir(folder, { withFileTypes: true })).filter(
        (e) =>
          e.isFile() && /\.xlsx$/i.test(e.name) && !e.name.startsWith("~$"),
      );
      const files = [];
      for (const entry of entries) {
        try {
          const info = await stat(join(folder, entry.name));
          files.push({ name: entry.name, info });
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
      }
      files.sort(
        (a, b) =>
          a.info.mtimeMs - b.info.mtimeMs || a.name.localeCompare(b.name),
      );
      const present = new Set(files.map((f) => f.name));
      for (const name of observed.keys())
        if (!present.has(name)) observed.delete(name);
      for (const file of files) {
        if (stopped || !enabled()) break;
        const signature = file.info.size + ":" + file.info.mtimeMs,
          prior = observed.get(file.name);
        if (!prior || prior.signature !== signature) {
          observed.set(file.name, { signature, since: now(), done: false });
          continue;
        }
        if (prior.done || now() - prior.since < settleMs) continue;
        if (file.info.size > 3 * 1024 * 1024) {
          const digest = createHash("sha256")
            .update("oversize:" + file.name + ":" + signature)
            .digest("hex");
          if (
            !db
              .prepare("SELECT digest FROM auto_import_files WHERE digest=?")
              .get(digest)
          ) {
            transaction(db, () =>
              record(digest, file.name, "error", {
                error: "Arquivo maior que 3 MB. Nenhum dado foi alterado.",
              }),
            );
            onChange();
          }
          prior.done = true;
          continue;
        }
        let buffer, after;
        try {
          buffer = await readFile(join(folder, file.name));
          after = await stat(join(folder, file.name));
        } catch (error) {
          if (error.code === "ENOENT") continue;
          throw error;
        }
        if (
          after.size !== file.info.size ||
          after.mtimeMs !== file.info.mtimeMs
        )
          continue;
        const digest = createHash("sha256").update(buffer).digest("hex");
        if (
          !db
            .prepare("SELECT digest FROM auto_import_files WHERE digest=?")
            .get(digest)
        )
          await processFile(buffer, digest, file.name, user, file.info.mtimeMs);
        prior.done = true;
      }
      lastChecked = new Date(now()).toISOString();
    } catch (error) {
      lastError = error.message;
      onChange();
    } finally {
      busy = false;
    }
  }
  function start() {
    stopped = false;
    if (timer) return;
    mkdir(folder, { recursive: true, mode: 0o700 }).catch((error) => {
      lastError = error.message;
    });
    timer = setInterval(() => {
      void scan();
    }, intervalMs);
    timer.unref();
    void scan();
  }
  function stop() {
    stopped = true;
    clearInterval(timer);
    timer = null;
  }
  return { status, setEnabled, scan, start, stop };
}
