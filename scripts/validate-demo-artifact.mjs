import { createHash } from "node:crypto";
import JSZip from "jszip";
export const DEMO_ARTIFACT = "downloads/REVO-Processos-Teste-Local-Windows.zip";
export const DEMO_MANIFEST =
  "downloads/REVO-Processos-Teste-Local-Windows.json";
export async function validateDemoArtifact(bytes, manifest) {
  if (
    manifest.kind !== "offline-demo-distribution" ||
    manifest.containsOperationalData !== false ||
    manifest.fictitiousDataGeneratedOnFirstRun !== true
  )
    throw new Error(
      "O manifesto não identifica uma distribuição fictícia sem dados operacionais.",
    );
  if (
    bytes.length > 60 * 1024 * 1024 ||
    bytes.length !== manifest.bytes ||
    createHash("sha256").update(bytes).digest("hex") !== manifest.sha256
  )
    throw new Error(
      "Tamanho ou checksum do pacote de demonstração divergente.",
    );
  const zip = await JSZip.loadAsync(bytes),
    prefix = "REVO-Processos-Offline/";
  for (const [name, entry] of Object.entries(zip.files)) {
    const raw = entry.unsafeOriginalName || name;
    if (
      !name.startsWith(prefix) ||
      raw.split("/").includes("..") ||
      /\\/.test(raw)
    )
      throw new Error("Caminho inesperado dentro do pacote.");
    const relative = name.slice(prefix.length);
    if (
      /^(data|data-demo|attachments|\.git)\//i.test(relative) ||
      /(^|\/)\.env(?:\.|$)|\.(sqlite(?:-wal|-shm)?|db|pem|key|xlsx|zip|bundle)$/i.test(
        relative,
      ) ||
      /(acesso-inicial|acesso-privado)/i.test(relative)
    )
      throw new Error(
        "O pacote contém arquivo operacional ou privado: " + relative,
      );
  }
  const file = zip.file(prefix + "VERSAO-PACOTE.json");
  if (!file) throw new Error("O pacote não tem identificação de versão.");
  const version = JSON.parse(await file.async("string"));
  if (
    version.containsOperationalData !== false ||
    version.internetRequiredToRun !== false ||
    version.platform !== "Windows x64" ||
    version.sourceTreeClean !== true ||
    version.sourceCommit !== manifest.sourceCommit
  )
    throw new Error("Os metadados internos não conferem com a demonstração.");
  for (const name of [
    "INICIAR-REVO.bat",
    "runtime/node.exe",
    "runtime/LICENSE.txt",
    "dist/index.html",
    "server/demo-data.js",
  ])
    if (!zip.file(prefix + name)) throw new Error("Pacote incompleto: " + name);
  return {
    sha256: manifest.sha256,
    bytes: bytes.length,
    sourceCommit: version.sourceCommit,
    checkedForPrivatePaths: true,
  };
}
