import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

interface PersonaTemplate {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  icon: string;
  isCustom?: boolean;
}

export default function Persona() {
  const [templates, setTemplates] = useState<PersonaTemplate[]>([]);
  const [activeId, setActiveId] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [templatesRes, activeRes] = await Promise.all([
          fetch('/api/config/persona/templates'),
          fetch('/api/config/persona'),
        ]);
        const templatesData = await templatesRes.json();
        const activeData = await activeRes.json();

        if (templatesData.ok && templatesData.data) {
          setTemplates(templatesData.data);
        }
        if (activeData.ok && activeData.data) {
          setActiveId(activeData.data.config?.activeId || 'assistant');
          setCustomPrompt(activeData.data.config?.customPrompt || '');
        }
      } catch {
        // Use defaults
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/config/persona', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeId, customPrompt }),
      });
      const data = await res.json();
      if (data.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        alert(data.error || '保存失败');
      }
    } catch {
      alert('网络错误');
    } finally {
      setSaving(false);
    }
  }, [activeId, customPrompt]);

  const selectedTemplate = templates.find((t) => t.id === activeId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">AI 角色设定</h1>
        <p className="text-sm text-gray-500 mt-1">
          选择或自定义 AI 助手的角色和行为风格
        </p>
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => {
              setActiveId(template.id);
              setSaved(false);
            }}
            className={`
              text-left p-5 rounded-xl border-2 transition-all duration-200
              ${
                activeId === template.id
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }
            `}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-2xl">{template.icon}</span>
              {activeId === template.id && (
                <CheckCircle2 size={18} className="text-primary shrink-0" />
              )}
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              {template.name}
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              {template.description}
            </p>
          </button>
        ))}
      </div>

      {/* System prompt preview / editor */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">
          系统提示词
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          {selectedTemplate?.isCustom
            ? '编写自定义的系统提示词，定义 AI 的行为和风格'
            : '当前角色的系统提示词（只读）。选择「自定义角色」可自由编辑'}
        </p>

        <textarea
          value={
            selectedTemplate?.isCustom
              ? customPrompt
              : selectedTemplate?.systemPrompt || ''
          }
          onChange={(e) => {
            if (selectedTemplate?.isCustom) {
              setCustomPrompt(e.target.value);
              setSaved(false);
            }
          }}
          readOnly={!selectedTemplate?.isCustom}
          rows={6}
          placeholder={
            selectedTemplate?.isCustom
              ? '请输入自定义系统提示词...\n\n例如：你是一个专注于健康饮食的营养顾问，用专业但通俗的语言为用户提供饮食建议。'
              : ''
          }
          className={`
            w-full px-4 py-3 border border-gray-300 rounded-lg text-sm leading-relaxed
            focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none
            transition-colors resize-none
            ${!selectedTemplate?.isCustom ? 'bg-gray-50 text-gray-600 cursor-default' : 'bg-white'}
          `}
        />

        {/* Save button */}
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleSave}
            disabled={saving || (selectedTemplate?.isCustom && !customPrompt.trim())}
            className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                保存中...
              </>
            ) : (
              '保存角色设定'
            )}
          </button>

          {saved && (
            <span className="text-sm text-green-600 flex items-center gap-1.5 animate-fade-in">
              <CheckCircle2 size={16} />
              已保存
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
