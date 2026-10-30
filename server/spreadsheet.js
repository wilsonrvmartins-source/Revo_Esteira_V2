import ExcelJS from "exceljs";
import { STAGES } from "./domain.js";
import { validateZip } from "./xlsx-guard.js";
export const HEADERS = {
  code: "Código da loja",
  name: "Nome",
  contact: "Contato",
  method: "Método de aceitação",
  owner: "Responsável",
  city: "Cidade",
};
export const SOURCE_NAMES = {
  code: ["Merchant ID", "Código da loja"],
  name: ["Merchant Name", "Nome"],
  contact: ["Merchant Contact Phone", "Contato"],
  method: ["Método de aceitação"],
  owner: ["Merchant Owner", "Responsável"],
  city: ["Second City Name", "Cidade"],
};
const invalid = (message) => Object.assign(new Error(message), { status: 400 });
export async function parseSpreadsheet(buffer) {
  if (buffer.length > 3 * 1024 * 1024)
    throw invalid("Envie um arquivo .xlsx de até 3 MB.");
  if (buffer.length < 4 || buffer.readUInt32LE(0) !== 0x04034b50)
    throw invalid("Arquivo XLSX inválido.");
  validateZip(buffer);
  const w = new ExcelJS.Workbook();
  try {
    await w.xlsx.load(buffer);
  } catch {
    throw invalid("Não foi possível ler o arquivo Excel.");
  }
  const sheet = w.worksheets[0];
  if (!sheet || sheet.rowCount > 2001 || sheet.columnCount > 100)
    throw invalid("Use até 2.000 linhas e 100 colunas na primeira aba.");
  const columns = {},
    sourceColumns = {},
    titles = new Set();
  sheet.getRow(1).eachCell((cell, col) => {
    const title = cell.text.trim();
    if (!title) return;
    if (titles.has(title)) throw invalid("Coluna repetida: " + title);
    titles.add(title);
    sourceColumns[col] = title;
    const key =
      Object.keys(SOURCE_NAMES).find((k) => SOURCE_NAMES[k].includes(title)) ||
      (["Merchant Status", "Status"].includes(title)
        ? "initialStage"
        : undefined);
    if (key) {
      if (columns[key])
        throw invalid("Coluna repetida: " + (HEADERS[key] || "Status"));
      columns[key] = col;
    }
  });
  if (!columns.code || !columns.name)
    throw invalid("Use o modelo: Código da loja e Nome são obrigatórios.");
  const rows = [];
  for (let i = 2; i <= sheet.rowCount; i++) {
    const r = sheet.getRow(i);
    if (!r.hasValues) continue;
    const row = { source: {}, _row: i };
    for (const [c, title] of Object.entries(sourceColumns)) {
      const cell = r.getCell(Number(c));
      if (cell.type === ExcelJS.ValueType.Formula)
        throw invalid("Fórmulas não são aceitas na importação.");
      row.source[title] = cell.text;
    }
    for (const [k, c] of Object.entries(columns)) row[k] = r.getCell(c).text;
    if (columns.initialStage) {
      const text = String(row.initialStage).trim().toLocaleLowerCase("pt-BR");
      const index = STAGES.findIndex(
        (s) => s.toLocaleLowerCase("pt-BR") === text,
      );
      if (index < 0) throw invalid("Status desconhecido na linha " + i);
      row.initialStage = index;
    }
    rows.push(row);
  }
  return { rows, columns: Object.keys(columns) };
}
export function rememberBaseline(db, storeId, item, columns) {
  for (const field of columns.filter(
    (k) => Object.hasOwn(HEADERS, k) && k !== "code",
  ))
    db.prepare(
      "INSERT INTO import_baseline(store_id,field,value) VALUES(?,?,?) ON CONFLICT(store_id,field) DO UPDATE SET value=excluded.value",
    ).run(storeId, field, item[field]);
}
export function markManualOverrides(db, storeId, fields) {
  for (const field of fields)
    db.prepare(
      "INSERT OR IGNORE INTO manual_overrides(store_id,field) VALUES(?,?)",
    ).run(storeId, field);
}
