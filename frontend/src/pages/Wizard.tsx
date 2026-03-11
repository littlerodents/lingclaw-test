import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  Loader2,
  Sparkles,
  Server,
  Key,
  ChevronRight,
} from 'lucide-react';
import StepIndicator from '../components/StepIndicator';

interface WizardProps {
  onComplete: () => void;
}

interface ModelOption {
  id: string;
  name: string;
  recommended?: boolean;
}

const PROVIDERS = [
  { id: 'qnaigc', name: 'QnAIGC (七牛)', description: '七牛云 MaaS 平台' },
  { id: 'openai', name: 'OpenAI', description: 'GPT 系列模型' },
  { id: 'deepseek', name: 'DeepSeek', description: 'DeepSeek 系列模型' },
  { id: 'moonshot', name: 'Moonshot (月之暗面)', description: 'Kimi 系列模型' },
  { id: 'anthropic', name: 'Anthropic', description: 'Claude 系列模型' },
];

const STEP_LABELS = ['配置 API Key', '选择模型', '确认启动'];

export default function Wizard({ onComplete }: WizardProps) {
  const [step, setStep] = useState(-1); // -1 = welcome screen, 0/1/2 = wizard steps
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Welcome / API Key state
  const [hasStoredKey, setHasStoredKey] = useState<boolean | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState('qnaigc');
  const [validating, setValidating] = useState(false);
  const [apiKeyError, setApiKeyError] = useState('');

  // Step 1 state — Model selection
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelError, setModelError] = useState('');

  // Step 2 state — Confirm & launch
  const [completing, setCompleting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Check if API key already exists on mount
  useEffect(() => {
    async function checkState() {
      try {
        const res = await fetch('/api/setup/state');
        const data = await res.json();
        if (data.ok && data.data?.hasApiKey) {
          setHasStoredKey(true);
          // Skip to model selection
          setCompletedSteps([0]);
          setStep(1);
          fetchModels();
        } else {
          setHasStoredKey(false);
        }
      } catch {
        setHasStoredKey(false);
      }
    }
    checkState();
  }, []);

  const fetchModels = useCallback(async (key?: string, prov?: string) => {
    setLoadingModels(true);
    setModelError('');
    try {
      let url = '/api/setup/models';
      if (key && prov) {
        url += `?apiKey=${encodeURIComponent(key)}&provider=${encodeURIComponent(prov)}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.ok && data.data?.models?.length > 0) {
        const modelList = data.data.models.map((id: string) => ({
          id,
          name: id,
        }));
        setModels(modelList);
        setSelectedModel(modelList[0].id);
      } else {
        setModelError(data.data?.error || data.error || '未获取到可用模型，请检查 API Key 是否正确');
      }
    } catch {
      setModelError('网络错误，请检查后端服务是否运行');
    } finally {
      setLoadingModels(false);
    }
  }, []);

  const handleApiKeySubmit = useCallback(async () => {
    if (!apiKey.trim()) {
      setApiKeyError('请输入 API Key');
      return;
    }
    setValidating(true);
    setApiKeyError('');
    try {
      const res = await fetch('/api/setup/validate-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim(), provider }),
      });
      const data = await res.json();
      if (data.ok && data.data?.valid) {
        // Save API key to server config
        await fetch('/api/config/ai', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: apiKey.trim(), provider, model: 'pending' }),
        });
        setCompletedSteps([0]);
        setStep(1);
        fetchModels(apiKey.trim(), provider);
      } else {
        setApiKeyError(data.data?.error || data.error || 'API Key 验证失败，请检查是否正确');
      }
    } catch {
      setApiKeyError('网络错误，请检查后端服务');
    } finally {
      setValidating(false);
    }
  }, [apiKey, provider, fetchModels]);

  const goToConfirm = useCallback(() => {
    if (!selectedModel) return;
    setCompletedSteps((prev) => [...new Set([...prev, 0, 1])]);
    setStep(2);
  }, [selectedModel]);

  const completeSetup = useCallback(async () => {
    setCompleting(true);
    try {
      const body: Record<string, string> = { model: selectedModel, provider };
      // Include apiKey if user manually entered one
      if (apiKey.trim()) {
        body.apiKey = apiKey.trim();
      }
      const res = await fetch('/api/setup/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setCompletedSteps((prev) => [...new Set([...prev, 2])]);
        setShowCelebration(true);
        setTimeout(() => onComplete(), 2000);
      } else {
        const data = await res.json();
        alert(data.error || '配置失败，请重试');
      }
    } catch {
      alert('网络错误，请检查后端服务');
    } finally {
      setCompleting(false);
    }
  }, [selectedModel, provider, apiKey, onComplete]);

  // Loading check
  if (hasStoredKey === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">正在检查配置...</p>
        </div>
      </div>
    );
  }

  // =========== WELCOME / API KEY LOGIN SCREEN ===========
  if (step === -1) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 animate-fade-in">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Server size={28} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">欢迎使用</h1>
              <p className="text-sm text-gray-500 mt-2">
                配置 AI 服务开始使用 OpenClaw
              </p>
            </div>

            {/* Provider selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI 服务商
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                {PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.description}
                  </option>
                ))}
              </select>
            </div>

            {/* API Key input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setApiKeyError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleApiKeySubmit();
                  }}
                  placeholder="输入您的 API Key"
                  className={`w-full px-3 py-2.5 pr-10 border rounded-lg text-sm outline-none transition-colors ${
                    apiKeyError
                      ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
                      : 'border-gray-300 focus:ring-primary/20 focus:border-primary'
                  } focus:ring-2`}
                />
                <Key
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
              </div>
              {apiKeyError && (
                <p className="mt-2 text-xs text-red-600">{apiKeyError}</p>
              )}
            </div>

            {/* Submit button */}
            <button
              onClick={handleApiKeySubmit}
              disabled={validating || !apiKey.trim()}
              className="w-full py-3 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {validating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  验证中...
                </>
              ) : (
                <>
                  开始配置
                  <ChevronRight size={16} />
                </>
              )}
            </button>

            {/* Hint */}
            <p className="mt-4 text-center text-xs text-gray-400">
              API Key 将安全存储在服务器本地，不会上传到其他地方
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
            <Server size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              OpenClaw 配置向导
            </h1>
            <p className="text-xs text-gray-500">
              完成以下步骤开始使用
            </p>
          </div>
        </div>
      </header>

      {/* Step indicator */}
      <div className="bg-white border-b border-gray-100 py-6">
        <div className="max-w-3xl mx-auto px-6">
          <StepIndicator
            steps={STEP_LABELS}
            currentStep={step}
            completedSteps={completedSteps}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center pt-10 pb-20 px-6">
        <div className="w-full max-w-lg animate-fade-in" key={step}>
          {/* =========== STEP 1: Model Selection =========== */}
          {step === 1 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                第二步：选择 AI 模型
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                选择一个适合您需求的模型。推荐使用默认模型开始体验。
              </p>

              {loadingModels ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-primary" />
                  <span className="ml-3 text-sm text-gray-500">
                    正在获取可用模型...
                  </span>
                </div>
              ) : modelError ? (
                <div className="text-center py-12">
                  <p className="text-sm text-red-600 mb-3">{modelError}</p>
                  <button
                    onClick={() => fetchModels(apiKey.trim() || undefined, apiKey.trim() ? provider : undefined)}
                    className="text-primary hover:text-blue-700 text-sm"
                  >
                    重新加载
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-2 mb-6 max-h-80 overflow-y-auto">
                    {models.map((model) => (
                      <label
                        key={model.id}
                        className={`
                          flex items-center gap-3 p-3.5 rounded-lg border cursor-pointer transition-all duration-150
                          ${
                            selectedModel === model.id
                              ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }
                        `}
                      >
                        <input
                          type="radio"
                          name="model"
                          value={model.id}
                          checked={selectedModel === model.id}
                          onChange={() => setSelectedModel(model.id)}
                          className="w-4 h-4 text-primary focus:ring-primary/20"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {model.name}
                            </span>
                            {model.recommended && (
                              <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-amber-700">
                                <Sparkles size={10} />
                                推荐
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            {model.id}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep(-1)}
                      className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      上一步
                    </button>
                    <button
                      onClick={goToConfirm}
                      disabled={!selectedModel}
                      className="flex-1 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      下一步
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* =========== STEP 2: Confirm & Launch =========== */}
          {step === 2 && (
            <div className="relative">
              {showCelebration && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded-xl z-10 animate-celebrate">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 size={32} className="text-green-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      配置完成！
                    </h3>
                    <p className="text-sm text-gray-500">
                      正在跳转到控制台...
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  第三步：确认并启动
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                  确认以下配置信息，然后启动 OpenClaw 服务。
                </p>

                {/* Config summary */}
                <div className="bg-gray-50 rounded-lg p-5 mb-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">AI 服务商</span>
                    <span className="text-sm font-medium text-gray-900">
                      {PROVIDERS.find((p) => p.id === provider)?.name || provider}
                    </span>
                  </div>
                  <div className="border-t border-gray-200" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">API Key</span>
                    <span className="text-sm font-medium text-green-600 flex items-center gap-1.5">
                      <CheckCircle2 size={14} />
                      已验证
                    </span>
                  </div>
                  <div className="border-t border-gray-200" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">AI 模型</span>
                    <span className="text-sm font-medium text-gray-900">
                      {selectedModel}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    上一步
                  </button>
                  <button
                    onClick={completeSetup}
                    disabled={completing}
                    className="flex-1 py-3 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                  >
                    {completing ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        配置中...
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        完成配置并启动 OpenClaw
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
