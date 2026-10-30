import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + scryptSync(password, salt, 64).toString("hex");
}
export function checkPassword(password, hash) {
  try {
    const [salt, key] = hash.split(":");
    return timingSafeEqual(
      Buffer.from(key, "hex"),
      scryptSync(password, salt, 64),
    );
  } catch {
    return false;
  }
}
export function openDB(path) {
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS stores(id INTEGER PRIMARY KEY,code TEXT UNIQUE NOT NULL,name TEXT NOT NULL,contact TEXT NOT NULL DEFAULT '',method TEXT NOT NULL DEFAULT '',owner TEXT NOT NULL DEFAULT '',city TEXT NOT NULL DEFAULT '',stage INTEGER NOT NULL DEFAULT 0,version INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS stage_fields(stage INTEGER PRIMARY KEY,label TEXT NOT NULL,instructions TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS parameters(store_id INTEGER NOT NULL REFERENCES stores(id),stage INTEGER NOT NULL,value TEXT NOT NULL DEFAULT '',PRIMARY KEY(store_id,stage));
CREATE TABLE IF NOT EXISTS integrations(store_id INTEGER NOT NULL REFERENCES stores(id),section INTEGER NOT NULL,state TEXT NOT NULL DEFAULT 'Pendente',data TEXT NOT NULL DEFAULT '{}',PRIMARY KEY(store_id,section));
CREATE TABLE IF NOT EXISTS source_data(store_id INTEGER PRIMARY KEY REFERENCES stores(id),data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS notes(id INTEGER PRIMARY KEY,store_id INTEGER NOT NULL REFERENCES stores(id),user_id INTEGER NOT NULL REFERENCES users(id),body TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS source_latest(store_id INTEGER PRIMARY KEY REFERENCES stores(id),data TEXT NOT NULL,modified_ms REAL NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS import_baseline(store_id INTEGER NOT NULL REFERENCES stores(id),field TEXT NOT NULL,value TEXT NOT NULL,PRIMARY KEY(store_id,field));
CREATE TABLE IF NOT EXISTS manual_overrides(store_id INTEGER NOT NULL REFERENCES stores(id),field TEXT NOT NULL,PRIMARY KEY(store_id,field));
CREATE TABLE IF NOT EXISTS app_settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS auto_import_files(digest TEXT PRIMARY KEY,filename TEXT NOT NULL,status TEXT NOT NULL,result TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,store_id INTEGER REFERENCES stores(id),user_id INTEGER NOT NULL REFERENCES users(id),action TEXT NOT NULL,details TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);`);
  for (let i = 0; i < 7; i++)
    db.prepare(
      "INSERT OR IGNORE INTO stage_fields(stage,label,instructions) VALUES(?,?,?)",
    ).run(i, "Orientações da etapa", "");
  return db;
}
export function transaction(db, fn) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
