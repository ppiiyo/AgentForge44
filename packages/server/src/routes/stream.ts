import { Router } from "express";

export const streamRouter = Router();

/**
 * SSE Endpoint for streaming steps progress and incremental LLM model tokens
 */
streamRouter.get("/api/agent/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Keep connection alive with silent space pings
  const intervalId = setInterval(() => {
    res.write(":\n\n");
  }, 10000);

  const mockPayloads = [
    { type: "node_start", nodeId: "node-input", title: "Input Specs Ready" },
    { type: "token", token: "Starting code generation..." },
    { type: "token", token: "\n\n```typescript\nexport const" },
    { type: "token", token: " useDebounce = <T>(val: T, delay: number) =>" },
    { type: "node_complete", nodeId: "node-input", finalValue: "export const useDebounce..." }
  ];

  let idx = 0;
  const writeMockTrace = () => {
    if (idx < mockPayloads.length) {
      res.write(`data: ${JSON.stringify(mockPayloads[idx])}\n\n`);
      idx++;
      setTimeout(writeMockTrace, 1200);
    } else {
      res.write("data: [DONE]\n\n");
      clearInterval(intervalId);
      res.end();
    }
  };

  setTimeout(writeMockTrace, 800);

  req.on("close", () => {
    clearInterval(intervalId);
  });
});
