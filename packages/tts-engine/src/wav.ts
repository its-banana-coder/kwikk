/** Reads the fmt/data chunks of a canonical RIFF/WAVE buffer to compute playback duration. */
export function parseWavDurationMs(buffer: Buffer): number {
  if (buffer.length < 12 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("not a valid WAV buffer");
  }

  let offset = 12;
  let byteRate = 0;
  let dataSize = 0;

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const bodyStart = offset + 8;

    if (chunkId === "fmt ") {
      byteRate = buffer.readUInt32LE(bodyStart + 8);
    } else if (chunkId === "data") {
      dataSize = chunkSize;
    }

    offset = bodyStart + chunkSize + (chunkSize % 2);
  }

  if (!byteRate) throw new Error("WAV buffer is missing a fmt chunk");
  return Math.round((dataSize / byteRate) * 1000);
}
