import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type {
  SetupState,
  OpenClawConfig,
  ChannelConfig,
  ChannelInstanceConfig,
  AIProvider,
} from "../types/index.js";

// ── Paths ──
const CONFIG_DIR = path.join(os.homedir(), ".openclaw");
const CONFIG_FILE = path.join(CONFIG_DIR, "openclaw.json");

// ── Provider registry ──
const PROVIDERS: Record<string, { name: string; baseUrl: string }> = {
  qnaigc: { name: "QnAIGC", baseUrl: "https://api.qnaigc.com/v1" },
  openai: { name: "OpenAI", baseUrl: "https://api.openai.com/v1" },
  anthropic: { name: "Anthropic", baseUrl: "https://api.anthropic.com/v1" },
  deepseek: { name: "DeepSeek", baseUrl: "https://api.deepseek.com/v1" },
  moonshot: { name: "Moonshot", baseUrl: "https://api.moonshot.cn/v1" },
};

// ── Channel definitions ──
const CHANNEL_DEFINITIONS: ChannelConfig[] = [
  {
    id: "telegram",
    name: "Telegram",
    icon: "📨",
    enabled: false,
    fields: [
      { key: "botToken", label: "Bot Token", type: "password", required: true, placeholder: "123456:ABC-DEF1234..." },
      { key: "webhookSecret", label: "Webhook Secret", type: "password", required: false, placeholder: "可选的 Webhook 密钥" },
      { key: "allowFrom", label: "允许的用户", type: "textarea", required: false, placeholder: "允许的用户ID，每行一个", hint: "留空表示允许所有用户" },
    ],
  },
  {
    id: "discord",
    name: "Discord",
    icon: "🎮",
    enabled: false,
    fields: [
      { key: "token", label: "Bot Token", type: "password", required: true, placeholder: "Bot token from Discord Developer Portal" },
      { key: "publicKey", label: "Public Key", type: "text", required: true, placeholder: "Application public key" },
      { key: "guildAllowlist", label: "服务器白名单", type: "textarea", required: false, placeholder: "允许的服务器ID，每行一个", hint: "留空表示允许所有服务器" },
    ],
  },
  {
    id: "slack",
    name: "Slack",
    icon: "💬",
    enabled: false,
    fields: [
      { key: "botToken", label: "Bot Token", type: "password", required: true, placeholder: "xoxb-..." },
      { key: "signingSecret", label: "Signing Secret", type: "password", required: true, placeholder: "Slack app signing secret" },
      { key: "appToken", label: "App Token", type: "password", required: false, placeholder: "xapp-...", hint: "Socket Mode用" },
    ],
  },
  {
    id: "feishu",
    name: "飞书",
    icon: "🐦",
    enabled: false,
    fields: [
      { key: "appId", label: "App ID", type: "text", required: true, placeholder: "cli_xxxxxx" },
      { key: "appSecret", label: "App Secret", type: "password", required: true, placeholder: "飞书应用密钥" },
      { key: "verificationToken", label: "Verification Token", type: "password", required: false, placeholder: "事件订阅验证令牌" },
      { key: "encryptKey", label: "Encrypt Key", type: "password", required: false, placeholder: "事件订阅加密密钥" },
    ],
  },
  {
    id: "dingtalk",
    name: "钉钉",
    icon: "🔔",
    enabled: false,
    fields: [
      { key: "clientId", label: "Client ID", type: "text", required: true, placeholder: "钉钉应用 Client ID" },
      { key: "clientSecret", label: "Client Secret", type: "password", required: true, placeholder: "钉钉应用 Client Secret" },
      { key: "robotCode", label: "Robot Code", type: "text", required: true, placeholder: "机器人编码" },
      { key: "aesKey", label: "AES Key", type: "password", required: false, placeholder: "消息加密密钥" },
    ],
  },
  {
    id: "wecom",
    name: "企业微信",
    icon: "🏢",
    enabled: false,
    fields: [
      { key: "corpId", label: "Corp ID", type: "text", required: true, placeholder: "企业ID" },
      { key: "agentId", label: "Agent ID", type: "text", required: true, placeholder: "应用AgentId" },
      { key: "secret", label: "Secret", type: "password", required: true, placeholder: "应用Secret" },
      { key: "token", label: "Token", type: "password", required: false, placeholder: "回调Token" },
      { key: "encodingAESKey", label: "EncodingAESKey", type: "password", required: false, placeholder: "回调EncodingAESKey" },
    ],
  },
  {
    id: "qq",
    name: "QQ",
    icon: "🐧",
    enabled: false,
    fields: [
      { key: "appId", label: "App ID", type: "text", required: true, placeholder: "QQ机器人 App ID" },
      { key: "secret", label: "Secret", type: "password", required: true, placeholder: "QQ机器人密钥" },
      { key: "token", label: "Token", type: "password", required: false, placeholder: "可选的访问令牌" },
      { key: "sandbox", label: "沙箱模式", type: "boolean", required: false, hint: "沙箱模式" },
    ],
  },
  {
    id: "wechat",
    name: "微信",
    icon: "💚",
    enabled: false,
    fields: [],
  },
];

// ── Helpers ──

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function readConfig(): OpenClawConfig {
  ensureConfigDir();
  if (!fs.existsSync(CONFIG_FILE)) return {};
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    return JSON.parse(raw) as OpenClawConfig;
  } catch {
    return {};
  }
}

function writeConfig(config: OpenClawConfig): void {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

function maskSensitive(value: string): string {
  if (!value || value.length < 8) return "***";
  return value.slice(0, 3) + "***..." + value.slice(-4);
}

function generateToken(length = 32): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (const b of bytes) {
    result += chars[b % chars.length];
  }
  return result;
}

function resolveBaseUrl(provider: string): string {
  const p = PROVIDERS[provider.toLowerCase()];
  return p ? p.baseUrl : PROVIDERS.openai.baseUrl;
}

// ── Public API ──

export function getSetupState(): SetupState {
  const config = readConfig();
  return {
    isConfigured: !!(config.ai?.apiKey && config.ai?.model),
    hasApiKey: !!config.ai?.apiKey,
    workspace: config.workspace ?? null,
    model: config.ai?.model ?? null,
  };
}

export function getCurrentConfig(): OpenClawConfig {
  const config = readConfig();
  // Mask sensitive values before returning
  const safe = JSON.parse(JSON.stringify(config)) as OpenClawConfig;
  if (safe.ai?.apiKey) safe.ai.apiKey = maskSensitive(safe.ai.apiKey);
  if (safe.gateway?.authToken) safe.gateway.authToken = maskSensitive(safe.gateway.authToken);
  if (safe.channels) {
    for (const ch of Object.values(safe.channels)) {
      for (const [k, v] of Object.entries(ch.config)) {
        if (typeof v === "string" && (k.toLowerCase().includes("token") || k.toLowerCase().includes("secret") || k.toLowerCase().includes("key") || k.toLowerCase().includes("password"))) {
          ch.config[k] = maskSensitive(v);
        }
      }
    }
  }
  return safe;
}

export async function validateApiKey(apiKey: string, provider: string): Promise<{ valid: boolean; error?: string }> {
  const baseUrl = resolveBaseUrl(provider);
  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
    };
    // Anthropic uses a different header
    if (provider.toLowerCase() === "anthropic") {
      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
      delete headers.Authorization;
    }
    const res = await fetch(`${baseUrl}/models`, { method: "GET", headers, signal: AbortSignal.timeout(15000) });
    if (res.ok) return { valid: true };
    const body = await res.text().catch(() => "");
    return { valid: false, error: `HTTP ${res.status}: ${body.slice(0, 200)}` };
  } catch (err) {
    return { valid: false, error: (err as Error).message };
  }
}

export async function listModels(apiKey: string, provider: string): Promise<{ models: string[]; error?: string }> {
  const baseUrl = resolveBaseUrl(provider);
  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
    };
    if (provider.toLowerCase() === "anthropic") {
      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
      delete headers.Authorization;
    }
    const res = await fetch(`${baseUrl}/models`, { method: "GET", headers, signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
      return { models: [], error: `HTTP ${res.status}` };
    }
    const json = (await res.json()) as { data?: Array<{ id: string }> };
    const models = (json.data ?? []).map((m) => m.id).sort();
    return { models };
  } catch (err) {
    return { models: [], error: (err as Error).message };
  }
}

export function updateAIConfig(apiKey: string, model: string, provider: string): void {
  const config = readConfig();
  config.ai = {
    ...config.ai,
    apiKey,
    model,
    provider,
    baseUrl: resolveBaseUrl(provider),
  };
  writeConfig(config);
}

export function getProviders(): AIProvider[] {
  return Object.entries(PROVIDERS).map(([id, p]) => ({
    id,
    name: p.name,
    baseUrl: p.baseUrl,
    models: [],
  }));
}

export function getChannels(): ChannelConfig[] {
  const config = readConfig();
  return CHANNEL_DEFINITIONS.map((def) => {
    const saved = config.channels?.[def.id];
    return {
      ...def,
      enabled: saved?.enabled ?? false,
    };
  });
}

export function getChannel(channelId: string): (ChannelConfig & { values: Record<string, string | boolean> }) | null {
  const def = CHANNEL_DEFINITIONS.find((d) => d.id === channelId);
  if (!def) return null;
  const config = readConfig();
  const saved = config.channels?.[channelId];
  // Mask sensitive values
  const values: Record<string, string | boolean> = {};
  if (saved?.config) {
    for (const [k, v] of Object.entries(saved.config)) {
      const field = def.fields.find((f) => f.key === k);
      if (field && field.type === "password" && typeof v === "string") {
        values[k] = maskSensitive(v);
      } else {
        values[k] = v;
      }
    }
  }
  return { ...def, enabled: saved?.enabled ?? false, values };
}

export function updateChannel(channelId: string, update: { enabled?: boolean; config?: Record<string, string | boolean> }): { ok: boolean; error?: string } {
  const def = CHANNEL_DEFINITIONS.find((d) => d.id === channelId);
  if (!def) return { ok: false, error: "Unknown channel" };
  if (channelId === "wechat") return { ok: false, error: "微信渠道即将支持" };

  // Validate required fields if enabling
  if (update.enabled && update.config) {
    for (const field of def.fields) {
      if (field.required) {
        const val = update.config[field.key];
        if (val === undefined || val === "" || val === null) {
          return { ok: false, error: `字段 "${field.label}" 为必填项` };
        }
      }
    }
  }

  const config = readConfig();
  if (!config.channels) config.channels = {};

  const existing = config.channels[channelId] ?? { enabled: false, config: {} };

  // Merge — if a password field value looks masked, keep the old value
  const mergedConfig = { ...existing.config };
  if (update.config) {
    for (const [k, v] of Object.entries(update.config)) {
      if (typeof v === "string" && v.includes("***")) {
        // Masked value — skip, keep existing
        continue;
      }
      mergedConfig[k] = v;
    }
  }

  config.channels[channelId] = {
    enabled: update.enabled ?? existing.enabled,
    config: mergedConfig,
  } satisfies ChannelInstanceConfig;

  writeConfig(config);
  return { ok: true };
}

export function completeSetup(apiKey: string, model: string, provider: string, workspace?: string): { ok: boolean; gatewayToken: string } {
  const config = readConfig();
  const gatewayToken = generateToken(48);

  config.ai = {
    apiKey,
    model,
    provider,
    baseUrl: resolveBaseUrl(provider),
  };
  config.gateway = {
    authToken: gatewayToken,
    port: 18789,
  };
  config.workspace = workspace || path.join(os.homedir(), ".openclaw", "workspace");

  // Ensure workspace directory
  const wsDir = config.workspace;
  if (!fs.existsSync(wsDir)) {
    fs.mkdirSync(wsDir, { recursive: true });
  }

  writeConfig(config);
  return { ok: true, gatewayToken };
}

export async function testAIConnection(apiKey: string, provider: string): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  const result = await validateApiKey(apiKey, provider);
  const latencyMs = Date.now() - start;
  return { ok: result.valid, latencyMs, error: result.error };
}

/** Get stored AI credentials (for server-side use only — never expose raw key to frontend) */
export function getStoredAICredentials(): { apiKey: string; provider: string; baseUrl: string } | null {
  const config = readConfig();
  if (!config.ai?.apiKey || !config.ai?.provider) return null;
  return {
    apiKey: config.ai.apiKey,
    provider: config.ai.provider,
    baseUrl: config.ai.baseUrl || resolveBaseUrl(config.ai.provider),
  };
}
