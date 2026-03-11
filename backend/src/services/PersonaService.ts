import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { PersonaTemplate, PersonaConfig, OpenClawConfig } from "../types/index.js";

// ── Paths ──
const CONFIG_DIR = path.join(os.homedir(), ".openclaw");
const CONFIG_FILE = path.join(CONFIG_DIR, "openclaw.json");

// ── Preset persona templates ──
const PERSONA_TEMPLATES: PersonaTemplate[] = [
  {
    id: "assistant",
    name: "通用助手",
    description: "友好、高效的通用 AI 助手",
    icon: "🤖",
    systemPrompt:
      "你是一个友好、高效的 AI 助手。用简洁清晰的中文回答用户问题，必要时给出具体的建议和步骤。",
  },
  {
    id: "customer-service",
    name: "客服专员",
    description: "耐心、专业的客户服务代表",
    icon: "🎧",
    systemPrompt:
      "你是一位专业的客服代表。请用礼貌、耐心的态度回答客户问题。对于无法解决的问题，提供明确的升级路径。始终保持积极态度，站在客户角度思考。",
  },
  {
    id: "tech-advisor",
    name: "技术顾问",
    description: "精通各领域的技术专家",
    icon: "💻",
    systemPrompt:
      "你是一位资深技术顾问，精通软件开发、系统架构和技术选型。请用专业但易懂的方式回答技术问题，提供最佳实践和代码示例。必要时评估不同方案的利弊。",
  },
  {
    id: "translator",
    name: "翻译助手",
    description: "精通中英双语翻译",
    icon: "🌐",
    systemPrompt:
      "你是一位专业翻译。将中文翻译为地道的英文，将英文翻译为流畅的中文。保持原文的语气和风格，对专业术语给出注释。如果原文有歧义，给出多种翻译选项。",
  },
  {
    id: "writer",
    name: "写作助手",
    description: "擅长各类文案和内容创作",
    icon: "✍️",
    systemPrompt:
      "你是一位出色的写作助手，擅长各类文案、文章和内容创作。根据用户需求调整风格和语气。注重结构清晰、用词精准、逻辑连贯。可以进行润色、改写和创意写作。",
  },
  {
    id: "data-analyst",
    name: "数据分析师",
    description: "擅长数据分析和洞察提取",
    icon: "📊",
    systemPrompt:
      "你是一位专业的数据分析师。帮助用户理解数据、发现趋势、提取洞察。用清晰的图表建议和统计方法回答问题。关注数据的实际业务含义。",
  },
  {
    id: "custom",
    name: "自定义角色",
    description: "完全自定义的 AI 角色和行为",
    icon: "⚙️",
    systemPrompt: "",
    isCustom: true,
  },
];

// ── Helpers ──

function readConfig(): OpenClawConfig {
  if (!fs.existsSync(CONFIG_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8")) as OpenClawConfig;
  } catch {
    return {};
  }
}

function writeConfig(config: OpenClawConfig): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

// ── Public API ──

export function getTemplates(): PersonaTemplate[] {
  return PERSONA_TEMPLATES;
}

export function getActivePersona(): { template: PersonaTemplate; config: PersonaConfig } {
  const config = readConfig();
  const personaConfig = config.persona ?? { activeId: "assistant" };
  const template =
    PERSONA_TEMPLATES.find((t) => t.id === personaConfig.activeId) ?? PERSONA_TEMPLATES[0];

  return {
    template: {
      ...template,
      // For custom persona, use stored custom prompt
      systemPrompt:
        template.isCustom && personaConfig.customPrompt
          ? personaConfig.customPrompt
          : template.systemPrompt,
    },
    config: personaConfig,
  };
}

export function updatePersona(activeId: string, customPrompt?: string): { ok: boolean; error?: string } {
  const template = PERSONA_TEMPLATES.find((t) => t.id === activeId);
  if (!template) {
    return { ok: false, error: `未知角色: ${activeId}` };
  }

  if (template.isCustom && (!customPrompt || !customPrompt.trim())) {
    return { ok: false, error: "自定义角色需要填写系统提示词" };
  }

  const config = readConfig();
  config.persona = {
    activeId,
    customPrompt: template.isCustom ? customPrompt : undefined,
  };
  writeConfig(config);
  return { ok: true };
}
