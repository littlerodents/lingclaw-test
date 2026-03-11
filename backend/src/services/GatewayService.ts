import { spawn, execSync, type ChildProcess } from "node:child_process";
import type { ServerResponse } from "node:http";
import type { GatewayStatus, ServiceLogEntry } from "../types/index.js";

const GATEWAY_PORT = 18789;
const MAX_LOG_ENTRIES = 600;

// ── State ──
let gatewayProcess: ChildProcess | null = null;
let gatewayPid: number | null = null;
let gatewayStartTime: number | null = null;
const logBuffer: ServiceLogEntry[] = [];
const sseClients: Set<ServerResponse> = new Set();

// ── Helpers ──

function pushLog(level: ServiceLogEntry["level"], message: string): void {
  const entry: ServiceLogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message: maskLogMessage(message),
  };
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOG_ENTRIES) {
    logBuffer.shift();
  }
  // Broadcast to SSE clients
  for (const client of sseClients) {
    try {
      client.write(`data: ${JSON.stringify(entry)}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}

function maskLogMessage(msg: string): string {
  // Mask patterns: sk-xxx, token values, secrets
  return msg
    .replace(/(sk-[a-zA-Z0-9]{4})[a-zA-Z0-9]+/g, "$1***")
    .replace(/(Bearer\s+)[^\s"]+/gi, "$1***")
    .replace(/(token[=:]\s*["']?)[^\s"']+/gi, "$1***")
    .replace(/(secret[=:]\s*["']?)[^\s"']+/gi, "$1***")
    .replace(/(key[=:]\s*["']?)[^\s"']+/gi, "$1***")
    .replace(/(password[=:]\s*["']?)[^\s"']+/gi, "$1***");
}

function findExistingPid(): number | null {
  try {
    const output = execSync(`lsof -i :${GATEWAY_PORT} -t 2>/dev/null`, { encoding: "utf-8" }).trim();
    if (output) {
      const pid = parseInt(output.split("\n")[0], 10);
      return isNaN(pid) ? null : pid;
    }
  } catch {
    // No process on port
  }
  return null;
}

function getProcessMemory(pid: number): number | null {
  try {
    const rss = execSync(`ps -o rss= -p ${pid} 2>/dev/null`, { encoding: "utf-8" }).trim();
    const kb = parseInt(rss, 10);
    return isNaN(kb) ? null : kb;
  } catch {
    return null;
  }
}

// ── Public API ──

export function getStatus(): GatewayStatus {
  // Check if our tracked process is still alive
  if (gatewayPid) {
    try {
      process.kill(gatewayPid, 0); // signal 0 = check existence
    } catch {
      // Process gone
      gatewayPid = null;
      gatewayProcess = null;
      gatewayStartTime = null;
    }
  }

  // Also check for externally started process on the port
  const existingPid = findExistingPid();
  const running = existingPid !== null;
  const pid = existingPid;
  const memory = pid ? getProcessMemory(pid) : null;

  let uptime: number | null = null;
  if (running && gatewayStartTime && pid === gatewayPid) {
    uptime = Math.floor((Date.now() - gatewayStartTime) / 1000);
  }

  return {
    running,
    pid,
    port: GATEWAY_PORT,
    memory,
    uptime,
    gatewayUrl: running ? `http://127.0.0.1:${GATEWAY_PORT}` : null,
  };
}

export function start(): { ok: boolean; error?: string } {
  const existing = findExistingPid();
  if (existing) {
    gatewayPid = existing;
    return { ok: true }; // Already running
  }

  try {
    pushLog("info", "Starting OpenClaw gateway...");

    const child = spawn("openclaw", [
      "gateway", "run",
      "--bind", "loopback",
      "--port", String(GATEWAY_PORT),
      "--force",
      "--allow-unconfigured",
    ], {
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    if (!child.pid) {
      pushLog("error", "Failed to start gateway: no PID returned");
      return { ok: false, error: "Failed to spawn process" };
    }

    gatewayProcess = child;
    gatewayPid = child.pid;
    gatewayStartTime = Date.now();

    child.stdout?.on("data", (data: Buffer) => {
      const lines = data.toString().split("\n").filter(Boolean);
      for (const line of lines) {
        pushLog("info", line);
      }
    });

    child.stderr?.on("data", (data: Buffer) => {
      const lines = data.toString().split("\n").filter(Boolean);
      for (const line of lines) {
        pushLog("error", line);
      }
    });

    child.on("exit", (code, signal) => {
      pushLog("info", `Gateway exited: code=${code} signal=${signal}`);
      if (gatewayPid === child.pid) {
        gatewayPid = null;
        gatewayProcess = null;
        gatewayStartTime = null;
      }
    });

    child.on("error", (err) => {
      pushLog("error", `Gateway error: ${err.message}`);
    });

    // Unref so the parent can exit independently
    child.unref();

    pushLog("info", `Gateway started with PID ${child.pid}`);
    return { ok: true };
  } catch (err) {
    const msg = (err as Error).message;
    pushLog("error", `Failed to start gateway: ${msg}`);
    return { ok: false, error: msg };
  }
}

export async function stop(): Promise<{ ok: boolean; error?: string }> {
  const pid = findExistingPid();
  if (!pid) {
    gatewayPid = null;
    gatewayProcess = null;
    gatewayStartTime = null;
    return { ok: true }; // Nothing to stop
  }

  pushLog("info", `Stopping gateway (PID ${pid})...`);

  try {
    // SIGTERM first
    process.kill(pid, "SIGTERM");

    // Wait up to 5 seconds for graceful shutdown
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 250));
      try {
        process.kill(pid, 0);
      } catch {
        // Process gone
        pushLog("info", "Gateway stopped gracefully");
        gatewayPid = null;
        gatewayProcess = null;
        gatewayStartTime = null;
        return { ok: true };
      }
    }

    // SIGKILL if still alive
    pushLog("warn", "Gateway did not stop gracefully, sending SIGKILL...");
    process.kill(pid, "SIGKILL");
    await new Promise((r) => setTimeout(r, 500));

    gatewayPid = null;
    gatewayProcess = null;
    gatewayStartTime = null;
    pushLog("info", "Gateway force-stopped");
    return { ok: true };
  } catch (err) {
    const msg = (err as Error).message;
    pushLog("error", `Failed to stop gateway: ${msg}`);
    return { ok: false, error: msg };
  }
}

export async function restart(): Promise<{ ok: boolean; error?: string }> {
  const stopResult = await stop();
  if (!stopResult.ok) return stopResult;
  // Brief pause before restart
  await new Promise((r) => setTimeout(r, 500));
  return start();
}

export function getLogs(): ServiceLogEntry[] {
  return [...logBuffer];
}

export function streamLogs(res: ServerResponse): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  // Send existing logs as initial batch
  for (const entry of logBuffer) {
    res.write(`data: ${JSON.stringify(entry)}\n\n`);
  }

  sseClients.add(res);

  res.on("close", () => {
    sseClients.delete(res);
  });
}

// ── Cleanup on process exit ──
process.on("exit", () => {
  if (gatewayPid) {
    try {
      process.kill(gatewayPid, "SIGTERM");
    } catch {
      // ignore
    }
  }
});
