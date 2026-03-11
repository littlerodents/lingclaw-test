// ── Channel field definition ──
export interface ChannelField {
  key: string;
  label: string;
  type: "text" | "password" | "textarea" | "boolean";
  required: boolean;
  placeholder?: string;
  hint?: string;
}

// ── Channel configuration ──
export interface ChannelConfig {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
  fields: ChannelField[];
}

// ── AI Provider ──
export interface AIProvider {
  id: string;
  name: string;
  baseUrl: string;
  models: string[];
}

// ── Setup state ──
export interface SetupState {
  isConfigured: boolean;
  hasApiKey: boolean;
  workspace: string | null;
  model: string | null;
}

// ── Gateway status ──
export interface GatewayStatus {
  running: boolean;
  pid: number | null;
  port: number;
  memory: number | null; // RSS in KB
  uptime: number | null; // seconds
  gatewayUrl: string | null;
}

// ── Service log entry ──
export interface ServiceLogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
}

// ── OpenClaw config file shape (partial) ──
export interface OpenClawConfig {
  ai?: {
    apiKey?: string;
    model?: string;
    provider?: string;
    baseUrl?: string;
  };
  gateway?: {
    authToken?: string;
    port?: number;
  };
  workspace?: string;
  channels?: Record<string, ChannelInstanceConfig>;
  persona?: PersonaConfig;
}

export interface ChannelInstanceConfig {
  enabled: boolean;
  config: Record<string, string | boolean>;
}

// ── Persona / AI Role ──
export interface PersonaTemplate {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  icon: string;
  isCustom?: boolean;
}

export interface PersonaConfig {
  activeId: string;
  customPrompt?: string;
}

// ── API response wrapper ──
export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}
