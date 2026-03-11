import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { ApiResponse } from "./types/index.js";
import * as ConfigService from "./services/ConfigService.js";
import * as GatewayService from "./services/GatewayService.js";
import * as PersonaService from "./services/PersonaService.js";

// ── Config ──
const PORT = parseInt(process.env.OPENCLAW_PANEL_PORT || "3187", 10);
const HOST = process.env.OPENCLAW_PANEL_HOST || "0.0.0.0";
const IS_DEV = process.env.NODE_ENV !== "production";

// ── Static file serving ──
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, "../../frontend/dist");
const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

// ── Helpers ──

function setCors(res: ServerResponse): void {
  if (IS_DEV) {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Max-Age", "86400");
  }
}

function json<T>(res: ServerResponse, data: ApiResponse<T>, status = 200): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function jsonOk<T>(res: ServerResponse, data: T): void {
  json(res, { ok: true, data });
}

function jsonError(res: ServerResponse, error: string, status = 400): void {
  json(res, { ok: false, error }, status);
}

async function parseBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      if (chunks.length === 0) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf-8")));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function extractParam(pathname: string, pattern: string): string | null {
  // Simple pattern like /api/config/channels/:channelId
  const patternParts = pattern.split("/");
  const pathParts = pathname.split("/");
  if (patternParts.length !== pathParts.length) return null;
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(":")) continue;
    if (patternParts[i] !== pathParts[i]) return null;
  }
  const paramIndex = patternParts.findIndex((p) => p.startsWith(":"));
  return paramIndex >= 0 ? pathParts[paramIndex] : null;
}

// ── Router ──

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  setCors(res);

  // Handle preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);
  const pathname = url.pathname;
  const method = req.method || "GET";

  try {
    // ── Health ──
    if (method === "GET" && pathname === "/api/health") {
      jsonOk(res, { status: "ok", timestamp: new Date().toISOString() });
      return;
    }

    // ── Setup ──
    if (method === "GET" && pathname === "/api/setup/state") {
      jsonOk(res, ConfigService.getSetupState());
      return;
    }

    if (method === "GET" && pathname === "/api/setup/current-config") {
      jsonOk(res, ConfigService.getCurrentConfig());
      return;
    }

    if (method === "POST" && pathname === "/api/setup/validate-api-key") {
      const body = await parseBody(req);
      const apiKey = body.apiKey as string;
      const provider = body.provider as string;
      if (!apiKey || !provider) {
        jsonError(res, "apiKey and provider are required");
        return;
      }
      const result = await ConfigService.validateApiKey(apiKey, provider);
      jsonOk(res, result);
      return;
    }

    if (method === "GET" && pathname === "/api/setup/models") {
      // Support both query-param key and server-side stored key
      let apiKey = url.searchParams.get("apiKey");
      let provider = url.searchParams.get("provider");
      if (!apiKey || !provider) {
        // Try stored credentials
        const stored = ConfigService.getStoredAICredentials();
        if (stored) {
          apiKey = stored.apiKey;
          provider = stored.provider;
        }
      }
      if (!apiKey || !provider) {
        jsonError(res, "No API key configured. Please configure via LAS platform or provide apiKey/provider params.");
        return;
      }
      const result = await ConfigService.listModels(apiKey, provider);
      jsonOk(res, result);
      return;
    }

    if (method === "POST" && pathname === "/api/setup/complete") {
      const body = await parseBody(req);
      const { model, provider, workspace } = body as Record<string, string>;
      let apiKey = body.apiKey as string | undefined;
      // If no apiKey provided, use stored one (from LAS deployment)
      if (!apiKey) {
        const stored = ConfigService.getStoredAICredentials();
        if (stored) {
          apiKey = stored.apiKey;
        }
      }
      const resolvedProvider = provider || ConfigService.getStoredAICredentials()?.provider;
      if (!apiKey || !model || !resolvedProvider) {
        jsonError(res, "model is required; apiKey and provider must be pre-configured or provided");
        return;
      }
      const result = ConfigService.completeSetup(apiKey, model, resolvedProvider, workspace);
      jsonOk(res, result);
      return;
    }

    // ── AI Config ──
    if (method === "GET" && pathname === "/api/config/ai") {
      const config = ConfigService.getCurrentConfig();
      jsonOk(res, config.ai || {});
      return;
    }

    if (method === "GET" && pathname === "/api/config/ai/providers") {
      jsonOk(res, ConfigService.getProviders());
      return;
    }

    if (method === "PUT" && pathname === "/api/config/ai") {
      const body = await parseBody(req);
      const { apiKey, model, provider } = body as Record<string, string>;
      if (!apiKey || !model || !provider) {
        jsonError(res, "apiKey, model, and provider are required");
        return;
      }
      ConfigService.updateAIConfig(apiKey, model, provider);
      jsonOk(res, { updated: true });
      return;
    }

    // ── Channels ──
    if (method === "GET" && pathname === "/api/config/channels") {
      jsonOk(res, ConfigService.getChannels());
      return;
    }

    const channelMatch = extractParam(pathname, "/api/config/channels/:channelId");
    if (channelMatch) {
      if (method === "GET") {
        const channel = ConfigService.getChannel(channelMatch);
        if (!channel) {
          jsonError(res, "Channel not found", 404);
          return;
        }
        jsonOk(res, channel);
        return;
      }
      if (method === "PUT") {
        const body = await parseBody(req);
        const result = ConfigService.updateChannel(channelMatch, body as { enabled?: boolean; config?: Record<string, string | boolean> });
        if (!result.ok) {
          jsonError(res, result.error || "Update failed");
          return;
        }
        jsonOk(res, { updated: true });
        return;
      }
    }

    // ── Service (Gateway) ──
    if (method === "GET" && pathname === "/api/service/status") {
      jsonOk(res, GatewayService.getStatus());
      return;
    }

    if (method === "POST" && pathname === "/api/service/start") {
      const result = GatewayService.start();
      if (!result.ok) {
        jsonError(res, result.error || "Failed to start", 500);
        return;
      }
      jsonOk(res, { started: true });
      return;
    }

    if (method === "POST" && pathname === "/api/service/stop") {
      const result = await GatewayService.stop();
      if (!result.ok) {
        jsonError(res, result.error || "Failed to stop", 500);
        return;
      }
      jsonOk(res, { stopped: true });
      return;
    }

    if (method === "POST" && pathname === "/api/service/restart") {
      const result = await GatewayService.restart();
      if (!result.ok) {
        jsonError(res, result.error || "Failed to restart", 500);
        return;
      }
      jsonOk(res, { restarted: true });
      return;
    }

    if (method === "GET" && pathname === "/api/service/logs") {
      GatewayService.streamLogs(res);
      return; // SSE — don't end the response
    }

    // ── Diagnostics ──
    if (method === "POST" && pathname === "/api/diagnostics/run") {
      // Use server-stored credentials (from LAS platform deployment)
      const stored = ConfigService.getStoredAICredentials();
      if (!stored) {
        jsonOk(res, { success: false, message: "未检测到 API Key，请确认 LAS 平台已完成配置" });
        return;
      }
      const result = await ConfigService.testAIConnection(stored.apiKey, stored.provider);
      jsonOk(res, { success: result.ok, message: result.ok ? "AI 服务连接正常" : (result.error || "AI 服务连接失败") });
      return;
    }

    const diagChannelMatch = extractParam(pathname, "/api/diagnostics/test-channel/:channelId");
    if (method === "POST" && diagChannelMatch) {
      // Channel diagnostic — basic connectivity check placeholder
      const channel = ConfigService.getChannel(diagChannelMatch);
      if (!channel) {
        jsonError(res, "Channel not found", 404);
        return;
      }
      if (!channel.enabled) {
        jsonOk(res, { ok: false, error: "渠道未启用" });
        return;
      }
      // For now, just confirm the channel has required fields filled
      const missing: string[] = [];
      for (const field of channel.fields) {
        if (field.required && !channel.values[field.key]) {
          missing.push(field.label);
        }
      }
      if (missing.length > 0) {
        jsonOk(res, { ok: false, error: `缺少必填字段: ${missing.join(", ")}` });
        return;
      }
      jsonOk(res, { ok: true, message: "配置完整，渠道可用" });
      return;
    }

    // ── Persona ──
    if (method === "GET" && pathname === "/api/config/persona/templates") {
      jsonOk(res, PersonaService.getTemplates());
      return;
    }

    if (method === "GET" && pathname === "/api/config/persona") {
      jsonOk(res, PersonaService.getActivePersona());
      return;
    }

    if (method === "PUT" && pathname === "/api/config/persona") {
      const body = await parseBody(req);
      const { activeId, customPrompt } = body as { activeId: string; customPrompt?: string };
      if (!activeId) {
        jsonError(res, "activeId is required");
        return;
      }
      const result = PersonaService.updatePersona(activeId, customPrompt);
      if (!result.ok) {
        jsonError(res, result.error || "Update failed");
        return;
      }
      jsonOk(res, { updated: true });
      return;
    }

    // ── Static Files (SPA) ──
    // Serve frontend dist for non-API GET requests
    if (method === "GET" && !pathname.startsWith("/api/")) {
      const safePath = path.normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, "");
      let filePath = path.join(DIST_DIR, safePath);

      // Try exact file first, then SPA fallback to index.html
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(DIST_DIR, "index.html");
      }

      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || "application/octet-stream";
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { "Content-Type": contentType });
        res.end(content);
        return;
      }
    }

    // ── 404 ──
    jsonError(res, `Not found: ${method} ${pathname}`, 404);
  } catch (err) {
    const message = (err as Error).message || "Internal server error";
    console.error(`[ERROR] ${method} ${pathname}: ${message}`);
    jsonError(res, message, 500);
  }
}

// ── Server ──

const server = http.createServer(handleRequest);

server.listen(PORT, HOST, () => {
  console.log(`[openclaw-panel] Backend running at http://${HOST}:${PORT}`);
  console.log(`[openclaw-panel] CORS allowed for http://localhost:5173`);
});

// Graceful shutdown
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    console.log(`\n[openclaw-panel] Received ${signal}, shutting down...`);
    server.close(() => {
      process.exit(0);
    });
    // Force exit after 5s
    setTimeout(() => process.exit(1), 5000);
  });
}
