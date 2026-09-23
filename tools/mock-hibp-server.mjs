import http from "node:http";
import crypto from "node:crypto";

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 8791);
const compromised = process.env.MOCK_HIBP_COMPROMISED_PASSWORD || "password";
const digest = crypto.createHash("sha1").update(compromised, "utf8").digest("hex").toUpperCase();
const prefix = digest.slice(0,5);
const suffix = digest.slice(5);

http.createServer((req,res) => {
  const url = new URL(req.url || "/", "http://localhost");
  const candidatePrefix = url.pathname.startsWith("/range/") ? url.pathname.slice("/range/".length).toUpperCase() : "";
  res.writeHead(200, {"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store"});
  if (candidatePrefix === prefix) {
    res.end(`${suffix}:999999\n00000000000000000000000000000000000:1\n`);
  } else {
    res.end("00000000000000000000000000000000000:1\n");
  }
}).listen(PORT,HOST,()=>console.log(`Mock HIBP listening on http://${HOST}:${PORT}`));
