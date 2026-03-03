const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());

app.get("/bulk-update", (req, res) => {
  try {
    console.log(
      "Received bulk-update request from",
      req.ip || req.connection.remoteAddress,
    );
    const total = 100000; // simulate 100k rows
    res.setHeader("Content-Type", "application/x-ndjson");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    if (res.flushHeaders) res.flushHeaders();

    // send an immediate initial chunk so the browser Network/Response shows data quickly
    const initial = { processed: 0, total, timestamp: Date.now() };
    res.write(JSON.stringify(initial) + "\n");

    let processed = 0;
    const chunkSize = 2000; // rows per tick
    const intervalMs = 100; // update interval

    const timer = setInterval(() => {
      try {
        processed = Math.min(total, processed + chunkSize);
        const obj = { processed, total, timestamp: Date.now() };
        res.write(JSON.stringify(obj) + "\n");

        if (processed >= total) {
          clearInterval(timer);
          res.write(JSON.stringify({ done: true, processed, total }) + "\n");
          res.end();
        }
      } catch (err) {
        console.error(
          "Error writing chunk:",
          err && err.stack ? err.stack : err,
        );
        clearInterval(timer);
        try {
          res.status(500).end("server error");
        } catch (e) {}
      }
    }, intervalMs);

    req.on("close", () => {
      clearInterval(timer);
    });
  } catch (err) {
    console.error(
      "bulk-update handler error:",
      err && err.stack ? err.stack : err,
    );
    try {
      res.status(500).end("server error");
    } catch (e) {}
  }
});

const port = 3000;
app.listen(port, () =>
  console.log(`Mock server listening on http://localhost:${port}`),
);
