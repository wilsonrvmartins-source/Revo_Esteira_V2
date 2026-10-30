import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  readdir,
  rm,
  copyFile,
  symlink,
  utimes,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { openDB } from "../server/db.js";
import { createAutoImporter } from "../server/auto-import.js";
import { markManualOverrides } from "../server/spreadsheet.js";
const HEAD = [
  "Merchant ID",
  "Merchant Name",
  "Merchant Contact Phone",
  "Merchant Owner",
  "Merchant Status",
  "Primary Category",
];
async function workbook(rows) {
  const w = new ExcelJS.Workbook(),
    s = w.addWorksheet("shop");
  rows.forEach((r) => s.addRow(r));
  return w.xlsx.writeBuffer();
}
async function fixture(fn, { admin = true } = {}) {
  const dir = await mkdtemp(join(tmpdir(), "revo-auto-")),
    folder = join(dir, "entrada");
  await mkdir(folder);
  const db = openDB(join(dir, "db.sqlite"));
  if (admin)
    db.prepare(
      "INSERT INTO users(name,email,password,role) VALUES(?,?,?,?)",
    ).run("Admin", "a@example.com", "unused", "Administrador");
  let clock = Date.now(),
    sequence = 0,
    events = 0;
  const modified = Date.now();
  const create = () =>
    createAutoImporter({
      db,
      directory: folder,
      now: () => clock,
      settleMs: 1000,
      onChange: () => events++,
    });
  const runner = create();
  const drop = async (name, rows) => {
    const path = join(folder, name);
    await writeFile(path, await workbook(rows));
    const time = new Date(modified + ++sequence * 1000);
    await utimes(path, time, time);
    return path;
  };
  const settle = async (runnerToUse = runner) => {
    await runnerToUse.scan();
    clock += 1100;
    await runnerToUse.scan();
  };
  try {
    await fn({
      db,
      folder,
      runner,
      drop,
      settle,
      create,
      advance: (ms) => (clock += ms),
      events: () => events,
    });
  } finally {
    runner.stop();
    db.close();
    await rm(dir, { recursive: true, force: true });
  }
}
const stores = (db) => db.prepare("SELECT * FROM stores ORDER BY id").all();
test("aguarda cópia estabilizar e preserva o arquivo de origem", () =>
  fixture(async ({ db, folder, runner, drop, advance }) => {
    await drop("a.xlsx", [
      HEAD,
      ["1", "Loja", "", "BD", "Entrando", "Lanches"],
    ]);
    await runner.scan();
    assert.equal(stores(db).length, 0);
    advance(500);
    await runner.scan();
    assert.equal(stores(db).length, 0);
    await drop("a.xlsx", [
      HEAD,
      ["1", "Loja completa", "", "BD", "Entrando", "Lanches"],
    ]);
    await runner.scan();
    advance(1100);
    await runner.scan();
    assert.equal(stores(db)[0].name, "Loja completa");
    assert.equal(stores(db)[0].stage, 2);
    assert.deepEqual(await readdir(folder), ["a.xlsx"]);
  }));
test("mesmo conteúdo com outro nome e reinício não duplica registros nem histórico", () =>
  fixture(async ({ db, folder, runner, drop, settle, create }) => {
    const file = await drop("primeira.xlsx", [
      HEAD,
      ["1", "Loja", "", "BD", "Entrando", ""],
    ]);
    await settle();
    await copyFile(file, join(folder, "copia.xlsx"));
    await settle();
    assert.equal(stores(db).length, 1);
    assert.equal(runner.status().history.length, 1);
    const restarted = create();
    await settle(restarted);
    assert.equal(stores(db).length, 1);
    assert.equal(restarted.status().history.length, 1);
    restarted.stop();
  }));
test("atualiza origem, protege edições manuais e preserva status, notas e integração", () =>
  fixture(async ({ db, runner, drop, settle }) => {
    await drop("1.xlsx", [
      HEAD,
      ["1", "Primeiro", "111", "BD", "Entrando", "Lanches"],
    ]);
    await settle();
    const id = stores(db)[0].id;
    db.prepare(
      "UPDATE stores SET owner='Responsável manual',stage=3 WHERE id=?",
    ).run(id);
    markManualOverrides(db, id, ["owner"]);
    db.prepare("INSERT INTO notes(store_id,user_id,body) VALUES(?,?,?)").run(
      id,
      1,
      "Nota manual",
    );
    db.prepare("INSERT INTO integrations VALUES(?,?,?,?)").run(
      id,
      0,
      "Concluído",
      '{"Contrato":"Assinado"}',
    );
    await drop("2.xlsx", [
      HEAD,
      ["1", "Nome atualizado", "222", "BD externo", "Offline", "Restaurante"],
    ]);
    await settle();
    const s = stores(db)[0];
    assert.equal(s.name, "Nome atualizado");
    assert.equal(s.contact, "222");
    assert.equal(s.owner, "Responsável manual");
    assert.equal(s.stage, 3);
    assert.equal(
      db.prepare("SELECT body FROM notes").get().body,
      "Nota manual",
    );
    assert.equal(
      db.prepare("SELECT state FROM integrations").get().state,
      "Concluído",
    );
    assert.equal(
      JSON.parse(db.prepare("SELECT data FROM source_data").get().data)[
        "Primary Category"
      ],
      "Lanches",
    );
    assert.equal(
      JSON.parse(db.prepare("SELECT data FROM source_latest").get().data)[
        "Primary Category"
      ],
      "Restaurante",
    );
    assert.equal(runner.status().history[0].result.protectedFields, 1);
  }));
test("campos vazios não apagam dados e cadastro manual não é sobrescrito", () =>
  fixture(async ({ db, drop, settle }) => {
    db.prepare("INSERT INTO stores(code,name,contact) VALUES(?,?,?)").run(
      "MANUAL",
      "Cadastro humano",
      "999",
    );
    await drop("a.xlsx", [
      HEAD,
      ["1", "Loja", "123", "BD", "Entrando", "Categoria"],
      ["MANUAL", "Nome externo", "", "BD externo", "Offline", ""],
    ]);
    await settle();
    assert.equal(stores(db)[0].name, "Cadastro humano");
    assert.equal(stores(db)[0].contact, "999");
    assert.equal(stores(db)[0].stage, 0);
    await drop("b.xlsx", [HEAD, ["1", "Loja", "", "", "Entrando", ""]]);
    await settle();
    assert.equal(stores(db)[1].contact, "123");
    assert.equal(stores(db)[1].owner, "BD");
  }));
test("migra proteção a partir da origem de lojas já existentes sem sobrescrever edições antigas", () =>
  fixture(async ({ db, drop, settle }) => {
    const id = Number(
      db
        .prepare("INSERT INTO stores(code,name,contact,owner) VALUES(?,?,?,?)")
        .run("OLD", "Original", "Contato alterado", "BD antigo")
        .lastInsertRowid,
    );
    db.prepare("INSERT INTO source_data VALUES(?,?)").run(
      id,
      JSON.stringify({
        "Merchant Name": "Original",
        "Merchant Contact Phone": "Contato original",
        "Merchant Owner": "BD antigo",
      }),
    );
    await drop("a.xlsx", [
      HEAD,
      ["OLD", "Nome novo", "Contato externo", "BD novo", "Cooperando", ""],
    ]);
    await settle();
    const s = stores(db)[0];
    assert.equal(s.name, "Nome novo");
    assert.equal(s.owner, "BD novo");
    assert.equal(s.contact, "Contato alterado");
    assert.equal(s.stage, 0);
  }));
test("IDs repetidos ou inválidos rejeitam todo o arquivo e correção com novo conteúdo é retomada", () =>
  fixture(async ({ db, runner, drop, settle }) => {
    await drop("a.xlsx", [
      HEAD,
      ["1", "A", "", "", "Entrando", ""],
      ["1", "Duplicado", "", "", "Entrando", ""],
    ]);
    await settle();
    assert.equal(stores(db).length, 0);
    assert.equal(runner.status().history[0].status, "error");
    await drop("a.xlsx", [HEAD, ["1", "Corrigida", "", "", "Entrando", ""]]);
    await settle();
    assert.equal(stores(db).length, 1);
    assert.equal(runner.status().history.length, 2);
  }));
test("falha no meio do lote reverte dados e auditoria da planilha inteira", () =>
  fixture(async ({ db, runner, drop, settle }) => {
    db.exec(
      "CREATE TRIGGER reject_bad BEFORE INSERT ON stores WHEN NEW.code='BAD' BEGIN SELECT RAISE(ABORT,'Falha simulada'); END;",
    );
    await drop("a.xlsx", [
      HEAD,
      ["OK", "Boa", "", "", "Entrando", ""],
      ["BAD", "Falha", "", "", "Entrando", ""],
    ]);
    await settle();
    assert.equal(stores(db).length, 0);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM audit").get().n, 0);
    assert.equal(runner.status().history[0].status, "error");
  }));
test("pausa persiste e retoma sem perder arquivos", () =>
  fixture(async ({ db, runner, drop, settle, create }) => {
    runner.setEnabled(false);
    await drop("a.xlsx", [HEAD, ["1", "Loja", "", "", "Entrando", ""]]);
    await settle();
    assert.equal(stores(db).length, 0);
    const other = create();
    assert.equal(other.status().enabled, false);
    other.stop();
    runner.setEnabled(true);
    await settle();
    assert.equal(stores(db).length, 1);
  }));
test("sem administrador ativo o monitor aguarda sem importar", () =>
  fixture(
    async ({ db, runner, drop, settle }) => {
      await drop("a.xlsx", [HEAD, ["1", "Loja", "", "", "Entrando", ""]]);
      await settle();
      assert.equal(runner.status().ready, false);
      assert.equal(stores(db).length, 0);
    },
    { admin: false },
  ));
test("ignora arquivos temporários e links, e registra excesso de tamanho sem importar", () =>
  fixture(async ({ db, folder, runner, drop, settle }) => {
    const file = await drop("~$temporario.xlsx", [
      HEAD,
      ["1", "Loja", "", "", "Entrando", ""],
    ]);
    await symlink(file, join(folder, "link.xlsx"));
    await writeFile(
      join(folder, "grande.xlsx"),
      Buffer.alloc(3 * 1024 * 1024 + 1),
    );
    await settle();
    assert.equal(stores(db).length, 0);
    assert.equal(runner.status().history.length, 1);
    assert.match(runner.status().history[0].result.error, /3 MB/);
  }));
test("arquivo com modificação mais antiga não regride dados de referência", () =>
  fixture(async ({ db, drop, settle, folder }) => {
    await drop("novo.xlsx", [HEAD, ["1", "Nome novo", "", "", "Entrando", ""]]);
    await settle();
    const file = await drop("antigo.xlsx", [
      HEAD,
      ["1", "Nome antigo", "", "", "Entrando", ""],
    ]);
    await utimes(file, new Date(1000), new Date(1000));
    await settle();
    assert.equal(stores(db)[0].name, "Nome novo");
  }));
test("dois monitores concorrentes processam o conteúdo uma única vez", () =>
  fixture(async ({ db, runner, drop, create, advance }) => {
    await drop("a.xlsx", [HEAD, ["1", "Loja", "", "", "Entrando", ""]]);
    const other = create();
    await Promise.all([runner.scan(), other.scan()]);
    advance(1100);
    await Promise.all([runner.scan(), other.scan()]);
    assert.equal(stores(db).length, 1);
    assert.equal(runner.status().history.length, 1);
    other.stop();
  }));
test(
  "relatório real: 330 lojas com novo arquivo repetido sem duplicidade",
  { skip: !process.env.FIXTURE_PATH },
  () =>
    fixture(async ({ db, folder, runner, settle }) => {
      await writeFile(
        join(folder, "real.xlsx"),
        await readFile(process.env.FIXTURE_PATH),
      );
      await settle();
      assert.equal(stores(db).length, 330);
      await copyFile(join(folder, "real.xlsx"), join(folder, "repetido.xlsx"));
      await settle();
      assert.equal(stores(db).length, 330);
      assert.equal(runner.status().history.length, 1);
    }),
);
