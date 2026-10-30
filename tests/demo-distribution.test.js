import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { createHash } from "node:crypto";
import { validateDemoArtifact } from "../scripts/validate-demo-artifact.mjs";
async function artifact(extra) {
  const zip = new JSZip(),
    prefix = "REVO-Processos-Offline/";
  const version = {
    containsOperationalData: false,
    internetRequiredToRun: false,
    platform: "Windows x64",
    sourceTreeClean: true,
    sourceCommit: "a".repeat(40),
  };
  zip.file(prefix + "VERSAO-PACOTE.json", JSON.stringify(version));
  for (const file of [
    "INICIAR-REVO.bat",
    "runtime/node.exe",
    "runtime/LICENSE.txt",
    "dist/index.html",
    "server/demo-data.js",
  ])
    zip.file(prefix + file, "Somente fixture de teste");
  if (extra) zip.file(prefix + extra, "Somente fixture");
  const bytes = await zip.generateAsync({ type: "nodebuffer" });
  return {
    bytes,
    manifest: {
      kind: "offline-demo-distribution",
      containsOperationalData: false,
      fictitiousDataGeneratedOnFirstRun: true,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      sourceCommit: version.sourceCommit,
    },
  };
}
test("distribuição fictícia íntegra é aceita", async () => {
  const a = await artifact();
  assert.equal(
    (await validateDemoArtifact(a.bytes, a.manifest)).checkedForPrivatePaths,
    true,
  );
});
test("banco em um ZIP com checksum válido é recusado", async () => {
  const a = await artifact("data/revo.sqlite");
  await assert.rejects(
    validateDemoArtifact(a.bytes, a.manifest),
    /operacional ou privado/,
  );
});
test("checksum divergente impede distribuição", async () => {
  const a = await artifact();
  a.manifest.sha256 = "0".repeat(64);
  await assert.rejects(validateDemoArtifact(a.bytes, a.manifest), /checksum/);
});
test("versão interna divergente impede distribuição", async () => {
  const a = await artifact();
  a.manifest.sourceCommit = "b".repeat(40);
  await assert.rejects(
    validateDemoArtifact(a.bytes, a.manifest),
    /metadados internos/,
  );
});
