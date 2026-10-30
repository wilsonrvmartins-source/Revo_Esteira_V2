import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  stat,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { DatabaseSync } from "node:sqlite";
import { prepareDemo } from "../server/demo-data.js";
import { openDB, checkPassword } from "../server/db.js";
import { DEMO_PASSWORD } from "../shared/demo-config.js";
import { parseSpreadsheet } from "../server/spreadsheet.js";
async function temporary(fn) {
  const dir = await mkdtemp(join(tmpdir(), "revo-demo-tests-"));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
test("demonstração cria 330 lojas, três perfis e exemplos fictícios com 48 colunas", () =>
  temporary(async (dir) => {
    const data = await prepareDemo(join(dir, "demo"));
    const db = new DatabaseSync(data.dbPath, { readOnly: true });
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM stores").get().n, 330);
    assert.equal(
      db.prepare("SELECT COUNT(DISTINCT stage) AS n FROM stores").get().n,
      7,
    );
    const users = db.prepare("SELECT * FROM users").all();
    assert.equal(users.length, 3);
    assert.ok(users.every((u) => checkPassword(DEMO_PASSWORD, u.password)));
    assert.equal(
      db
        .prepare(
          "SELECT COUNT(*) AS n FROM stores WHERE code NOT LIKE 'DEMO-%'",
        )
        .get().n,
      0,
    );
    assert.ok(db.prepare("SELECT COUNT(*) AS n FROM integrations").get().n > 0);
    assert.ok(db.prepare("SELECT COUNT(*) AS n FROM notes").get().n > 0);
    const source = JSON.parse(
      db.prepare("SELECT data FROM source_data LIMIT 1").get().data,
    );
    assert.equal(Object.keys(source).length, 48);
    db.close();
    const report = await parseSpreadsheet(
      await readFile(
        join(data.examples, "03-relatorio-ficticio-330-lojas.xlsx"),
      ),
    );
    assert.equal(report.rows.length, 330);
    assert.ok(report.rows.every((r) => r.code.startsWith("DEMO-")));
  }));
test("segunda abertura preserva edições feitas na demonstração", () =>
  temporary(async (dir) => {
    const data = await prepareDemo(join(dir, "demo"));
    const db = openDB(data.dbPath);
    db.prepare(
      "UPDATE stores SET name='Minha edição de teste' WHERE id=1",
    ).run();
    db.close();
    const again = await prepareDemo(data.folder);
    assert.equal(again.created, false);
    const copy = new DatabaseSync(data.dbPath, { readOnly: true });
    assert.equal(
      copy.prepare("SELECT name FROM stores WHERE id=1").get().name,
      "Minha edição de teste",
    );
    assert.equal(copy.prepare("SELECT COUNT(*) AS n FROM stores").get().n, 330);
    copy.close();
  }));
test("pasta com banco anterior sem marcador de demo é recusada sem alterações", () =>
  temporary(async (dir) => {
    const data = join(dir, "producao");
    await mkdir(data);
    const path = join(data, "revo.sqlite");
    const db = openDB(path);
    db.prepare("INSERT INTO stores(code,name) VALUES(?,?)").run(
      "REAL-PROTEGIDO",
      "Preservar",
    );
    db.close();
    const before = await readFile(path);
    await assert.rejects(prepareDemo(data), /Nada foi substituído/);
    assert.deepEqual(await readFile(path), before);
  }));
test("iniciador força isolamento e ignora DB_PATH e IMPORT_DIR herdados", () =>
  temporary(async (dir) => {
    const production = join(dir, "real.sqlite");
    const db = openDB(production);
    db.prepare("INSERT INTO stores(code,name) VALUES(?,?)").run(
      "PROTEGIDO",
      "Não alterar",
    );
    db.close();
    const outside = join(dir, "nao-criar");
    const result = await promisify(execFile)(
      process.execPath,
      [
        resolve("scripts/offline-demo.mjs"),
        "--data-dir",
        join(dir, "demo"),
        "--no-browser",
        "--smoke-test",
      ],
      {
        env: {
          ...process.env,
          DB_PATH: production,
          IMPORT_DIR: outside,
          HOST: "0.0.0.0",
          COOKIE_SECURE: "true",
        },
        timeout: 25000,
      },
    );
    assert.match(result.stdout, /SMOKE_OK/);
    const current = new DatabaseSync(production, { readOnly: true });
    assert.equal(
      current.prepare("SELECT COUNT(*) AS n FROM stores").get().n,
      1,
    );
    assert.equal(
      current.prepare("SELECT code FROM stores").get().code,
      "PROTEGIDO",
    );
    current.close();
    await assert.rejects(stat(outside), { code: "ENOENT" });
  }));
