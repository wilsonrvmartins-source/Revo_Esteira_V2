import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
// Uses the Chromium screencast protocol and the installed system FFmpeg.
// No browser-binary download or external recording service is required.
export async function recordDemo(page) {
  const base = "/workspace/shared/revo-demonstracao-automatizacao";
  const path = existsSync(base + ".webm")
    ? base + "-" + Date.now() + ".webm"
    : base + ".webm";
  const encoder = spawn(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-n",
      "-f",
      "image2pipe",
      "-vcodec",
      "mjpeg",
      "-framerate",
      "10",
      "-i",
      "pipe:0",
      "-vf",
      "scale=1280:800:force_original_aspect_ratio=decrease,pad=1280:800:(ow-iw)/2:(oh-ih)/2,setsar=1",
      "-c:v",
      "libvpx-vp9",
      "-b:v",
      "600k",
      "-deadline",
      "realtime",
      path,
    ],
    { stdio: ["pipe", "ignore", "pipe"] },
  );
  let error = "",
    latest = null,
    closed = false;
  encoder.stderr.on("data", (data) => (error += data));
  encoder.on("error", (e) => (error = e.message));
  encoder.stdin.on("error", () => {});
  const finished = new Promise((resolve) =>
    encoder.once("close", (code) => {
      closed = true;
      resolve(code);
    }),
  );
  const session = await page.context().newCDPSession(page);
  session.on("Page.screencastFrame", (event) => {
    latest = Buffer.from(event.data, "base64");
    void session
      .send("Page.screencastFrameAck", { sessionId: event.sessionId })
      .catch(() => {});
  });
  await session.send("Page.startScreencast", {
    format: "jpeg",
    quality: 75,
    maxWidth: 1280,
    maxHeight: 800,
    everyNthFrame: 1,
  });
  const timer = setInterval(() => {
    if (latest && !closed && !encoder.stdin.writableNeedDrain)
      encoder.stdin.write(latest);
  }, 100);
  return async () => {
    clearInterval(timer);
    await session.send("Page.stopScreencast").catch(() => {});
    await session.detach();
    encoder.stdin.end();
    const code = await finished;
    if (code !== 0) throw new Error("Falha ao gravar demonstração: " + error);
    console.log("Vídeo de demonstração salvo em: " + path);
  };
}
