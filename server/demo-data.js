import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { resolve, join } from "node:path";
import ExcelJS from "exceljs";
import { openDB, transaction, hashPassword } from "./db.js";
import { STAGES } from "./domain.js";
import { rememberBaseline, markManualOverrides } from "./spreadsheet.js";
import { DEMO_PROFILES, DEMO_PASSWORD } from "../shared/demo-config.js";
const PURPOSE = "revo-demo-local-fictional-v1";
const HEADERS =
  "Merchant ID;Merchant Code;Merchant Name;Merchant Latitude;Merchant Longitude;Google Search Latitude;Google Search Longitude;Merchant Address;Merchant Contact Phone;Primary Category;Support Category;Merchant Owner;Merchant Status;Merchant Owner Type;Merchant Open Service;Brand Owner;Brand ID;Brand Name;Customer ID;Aor Name;Merchant Bind OpenApi;OpenApi Menu Push Time;Merchant Activity Summary;Merchant Owner Superior;Today Business Hour;Within Business Hours;visible spu count;Second City Name;Group ID;Group Name;Position offset distance from algorithm(meter);Position offset distance confidence;Full Reduce(Pickup);Full Reduce(Delivery);Full Discount(Pickup);Full Discount(Delivery);Meal for one(Pickup);Meal for one(Delivery);Number of promo items(Pickup);Number of promo items(Delivery);Reduce Delivery Fee;KP phone;Google Search POI-Merchant Distance (Unit: meters);BD Visit-Merchant Distance (Unit: meters);API Latitude;API Longitude;Expected PDV (API) provider;API-Merchant Distance (Unit: meters)".split(
    ";",
  );
const categories = [
  "Mercado fictício",
  "Cafeteria fictícia",
  "Restaurante fictício",
  "Padaria fictícia",
  "Empório fictício",
];
function merchant(n, stage = n % 7) {
  const suffix = String(n).padStart(4, "0");
  return Object.assign(Object.fromEntries(HEADERS.map((h) => [h, ""])), {
    "Merchant ID": "DEMO-" + suffix,
    "Merchant Name":
      [
        "Loja Aurora",
        "Café Horizonte",
        "Mercado Jardim",
        "Empório Estação",
        "Padaria Amanhecer",
      ][n % 5] +
      " — Exemplo " +
      suffix,
    "Merchant Address": "Rua Demonstração, " + n + " — endereço fictício",
    "Merchant Contact Phone": "contato-" + suffix + "@example.invalid",
    "Primary Category": categories[n % 5],
    "Merchant Owner": "Operador Exemplo " + ((n % 5) + 1),
    "Merchant Status": STAGES[stage],
    "Merchant Owner Type": "Exemplo",
    "Merchant Open Service": "Demonstração",
    "Brand Owner": "Equipe fictícia",
    "Brand ID": "MARCA-DEMO-" + (n % 12),
    "Brand Name": "Marca fictícia " + (n % 12),
    "Customer ID": "CLIENTE-DEMO-" + suffix,
    "Aor Name": "Região Exemplo",
    "Merchant Bind OpenApi": false,
    "Merchant Activity Summary": "Campanha fictícia para testar a integração",
    "Merchant Owner Superior": "Líder Exemplo " + (n % 3),
    "Today Business Hour": "09:00–18:00 (fictício)",
    "Within Business Hours": true,
    "visible spu count": 10 + (n % 30),
    "Second City Name": "Cidade Exemplo " + ((n % 4) + 1),
    "Group ID": "GRUPO-DEMO-" + (n % 6),
    "Group Name": "Equipe Exemplo " + (n % 6),
    "KP phone": "(00) 00000-0000",
    "Expected PDV (API) provider": "PDV Demonstração",
  });
}
async function writeWorkbook(path, rows) {
  if (existsSync(path)) return;
  const book = new ExcelJS.Workbook(),
    sheet = book.addWorksheet("shop");
  sheet.addRow(HEADERS);
  rows.forEach((row) => sheet.addRow(HEADERS.map((h) => row[h])));
  const bytes = await book.xlsx.writeBuffer();
  writeFileSync(path, bytes, { flag: "wx" });
}
export async function prepareDemo(directory) {
  const folder = resolve(directory),
    marker = join(folder, ".revo-demo.json"),
    dbPath = join(folder, "revo.sqlite");
  if (existsSync(folder) && readdirSync(folder).length && !existsSync(marker))
    throw new Error(
      "A pasta escolhida contém arquivos sem identificação de demonstração. Nada foi substituído. Escolha uma pasta vazia.",
    );
  if (
    existsSync(marker) &&
    JSON.parse(readFileSync(marker, "utf8")).purpose !== PURPOSE
  )
    throw new Error(
      "Esta pasta não foi criada para a demonstração. Nada foi alterado.",
    );
  mkdirSync(folder, { recursive: true, mode: 0o700 });
  if (!existsSync(marker))
    writeFileSync(
      marker,
      JSON.stringify(
        { purpose: PURPOSE, containsOnlyFictionalData: true },
        null,
        2,
      ) + "\n",
      { flag: "wx", mode: 0o600 },
    );
  const db = openDB(dbPath);
  let created = false;
  try {
    if (
      !db
        .prepare("SELECT value FROM app_settings WHERE key='demo_seed_version'")
        .get()
    ) {
      if (
        db.prepare("SELECT COUNT(*) AS n FROM users").get().n ||
        db.prepare("SELECT COUNT(*) AS n FROM stores").get().n
      )
        throw new Error(
          "Há dados anteriores sem identificação de teste. A preparação foi interrompida sem substituí-los.",
        );
      transaction(db, () => {
        for (const user of DEMO_PROFILES)
          db.prepare(
            "INSERT INTO users(name,email,password,role) VALUES(?,?,?,?)",
          ).run(user.name, user.email, hashPassword(DEMO_PASSWORD), user.role);
        for (let n = 1; n <= 330; n++) {
          const stage = (n - 1) % 7,
            source = merchant(n, stage),
            id = Number(
              db
                .prepare(
                  "INSERT INTO stores(code,name,contact,method,owner,city,stage) VALUES(?,?,?,?,?,?,?)",
                )
                .run(
                  source["Merchant ID"],
                  source["Merchant Name"],
                  source["Merchant Contact Phone"],
                  "Método de teste " + ((n % 3) + 1),
                  source["Merchant Owner"],
                  source["Second City Name"],
                  stage,
                ).lastInsertRowid,
            );
          db.prepare("INSERT INTO source_data VALUES(?,?)").run(
            id,
            JSON.stringify(source),
          );
          rememberBaseline(
            db,
            id,
            {
              name: source["Merchant Name"],
              contact: source["Merchant Contact Phone"],
              owner: source["Merchant Owner"],
              city: source["Second City Name"],
            },
            ["name", "contact", "owner", "city"],
          );
          for (let section = 0; section < 7; section++)
            db.prepare("INSERT INTO integrations VALUES(?,?,?,?)").run(
              id,
              section,
              section < stage
                ? "Concluído"
                : section === stage
                  ? "Em andamento"
                  : "Pendente",
              JSON.stringify(
                section === 0
                  ? { Contrato: "Exemplo fictício, sem validade jurídica" }
                  : { Observação: "Informação de demonstração" },
              ),
            );
          db.prepare("INSERT INTO parameters VALUES(?,?,?)").run(
            id,
            stage,
            "Orientação fictícia: confira os dados antes de avançar.",
          );
          if (n <= 14)
            db.prepare(
              "INSERT INTO notes(store_id,user_id,body) VALUES(?,?,?)",
            ).run(
              id,
              2,
              "Nota de demonstração: contato fictício registrado para testar o acompanhamento.",
            );
          db.prepare(
            "INSERT INTO audit(store_id,user_id,action,details) VALUES(?,?,?,?)",
          ).run(
            id,
            1,
            "cadastro fictício de demonstração",
            JSON.stringify({ fictional: true, initialStage: STAGES[stage] }),
          );
        }
        markManualOverrides(db, 2, ["owner"]);
        db.prepare(
          "UPDATE stores SET owner='Responsável editado manualmente (teste)' WHERE id=2",
        ).run();
        db.prepare(
          "INSERT INTO app_settings VALUES('demo_seed_version','1')",
        ).run();
      });
      created = true;
    }
  } finally {
    db.close();
  }
  const examples = join(folder, "exemplos");
  mkdirSync(examples, { recursive: true });
  await writeWorkbook(join(examples, "01-novas-lojas-ficticias.xlsx"), [
    merchant(1001, 0),
    merchant(1002, 0),
  ]);
  const changed = [merchant(1, 6), merchant(2, 6), merchant(1001, 6)];
  changed[0]["Merchant Name"] =
    "Loja atualizada pela planilha — exemplo fictício";
  changed[1]["Merchant Owner"] =
    "Responsável da nova planilha — deve ser protegido";
  await writeWorkbook(
    join(examples, "02-atualizar-sem-duplicar.xlsx"),
    changed,
  );
  await writeWorkbook(
    join(examples, "03-relatorio-ficticio-330-lojas.xlsx"),
    Array.from({ length: 330 }, (_, i) => merchant(i + 1, i % 7)),
  );
  const incoming = join(folder, "importacao/entrada");
  mkdirSync(incoming, { recursive: true });
  return { folder, dbPath, examples, incoming, created };
}
