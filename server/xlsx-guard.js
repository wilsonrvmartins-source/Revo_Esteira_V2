// Inspect ZIP central directory before ExcelJS inflates the XLSX archive.
export function validateZip(buffer) {
  let end = -1;
  for (
    let i = buffer.length - 22;
    i >= Math.max(0, buffer.length - 65557);
    i--
  ) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new Error("Arquivo Excel corrompido.");
  const entries = buffer.readUInt16LE(end + 10),
    offset = buffer.readUInt32LE(end + 16);
  if (entries > 500 || entries === 0 || offset >= end)
    throw new Error("Estrutura Excel excede os limites permitidos.");
  let position = offset,
    total = 0;
  for (let i = 0; i < entries; i++) {
    if (position + 46 > end || buffer.readUInt32LE(position) !== 0x02014b50)
      throw new Error("Diretório ZIP inválido.");
    total += buffer.readUInt32LE(position + 24);
    if (total > 30 * 1024 * 1024)
      throw new Error("Planilha descompactada excede 30 MB.");
    position +=
      46 +
      buffer.readUInt16LE(position + 28) +
      buffer.readUInt16LE(position + 30) +
      buffer.readUInt16LE(position + 32);
  }
  if (position > end) throw new Error("Estrutura ZIP inválida.");
}
