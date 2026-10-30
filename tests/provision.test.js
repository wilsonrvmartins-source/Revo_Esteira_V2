import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  statSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { provisionOwner } from "../server/provision.js";
import { openDB, checkPassword } from "../server/db.js";
test("preparação local cria acesso privado e não sobrescreve conta existente", () => {
  const dir = mkdtempSync(join(tmpdir(), "revo-owner-"));
  try {
    const options = {
      dbPath: join(dir, "db.sqlite"),
      accessFile: join(dir, "acesso.txt"),
    };
    const owner = provisionOwner(options);
    assert.ok(owner.password.length >= 24);
    assert.equal(statSync(options.accessFile).mode & 0o777, 0o600);
    assert.ok(
      readFileSync(options.accessFile, "utf8").includes(owner.password),
    );
    const db = openDB(options.dbPath),
      user = db.prepare("SELECT * FROM users").get();
    assert.equal(user.role, "Administrador");
    assert.ok(checkPassword(owner.password, user.password));
    db.close();
    assert.throws(() => provisionOwner(options), /Já existe usuário/);
    assert.ok(
      readFileSync(options.accessFile, "utf8").includes(owner.password),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("arquivo de acesso existente é preservado e criação de usuário é revertida", () => {
  const dir = mkdtempSync(join(tmpdir(), "revo-owner-"));
  try {
    const options = {
      dbPath: join(dir, "db.sqlite"),
      accessFile: join(dir, "acesso.txt"),
    };
    writeFileSync(options.accessFile, "preservar");
    assert.throws(() => provisionOwner(options));
    assert.equal(readFileSync(options.accessFile, "utf8"), "preservar");
    const db = openDB(options.dbPath);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM users").get().n, 0);
    db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
