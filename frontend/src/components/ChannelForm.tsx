import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'password' | 'textarea' | 'boolean';
  placeholder?: string;
  hint?: string;
  required?: boolean;
}

interface ChannelFormProps {
  channelId: string;
  channelName: string;
  fields: FieldDef[];
  values: Record<string, string | boolean>;
  onChange: (key: string, value: string | boolean) => void;
  onSave: () => void;
  onTest: () => void;
  saving: boolean;
  testing: boolean;
  testResult?: { success: boolean; message: string } | null;
}

export default function ChannelForm({
  channelName,
  fields,
  values,
  onChange,
  onSave,
  onTest,
  saving,
  testing,
  testResult,
}: ChannelFormProps) {
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  function togglePassword(key: string) {
    setShowPasswords((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="space-y-5">
      <h3 className="text-base font-semibold text-gray-900">
        {channelName} 配置
      </h3>

      {fields.map((field) => (
        <div key={field.key}>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {field.label}
            {field.required && <span className="text-danger ml-0.5">*</span>}
          </label>

          {field.type === 'boolean' ? (
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={!!values[field.key]}
                onChange={(e) => onChange(field.key, e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
            </label>
          ) : field.type === 'textarea' ? (
            <textarea
              value={(values[field.key] as string) || ''}
              onChange={(e) => onChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none transition-colors"
            />
          ) : (
            <div className="relative">
              <input
                type={
                  field.type === 'password' && !showPasswords[field.key]
                    ? 'password'
                    : 'text'
                }
                value={(values[field.key] as string) || ''}
                onChange={(e) => onChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors pr-10"
              />
              {field.type === 'password' && (
                <button
                  type="button"
                  onClick={() => togglePassword(field.key)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords[field.key] ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              )}
            </div>
          )}

          {field.hint && (
            <p className="mt-1 text-xs text-gray-400">{field.hint}</p>
          )}
        </div>
      ))}

      {testResult && (
        <div
          className={`
            p-3 rounded-lg text-sm
            ${testResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}
          `}
        >
          {testResult.success ? '连接成功' : '连接失败'}：{testResult.message}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? '保存中...' : '保存'}
        </button>
        <button
          onClick={onTest}
          disabled={testing}
          className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {testing ? '测试中...' : '测试连接'}
        </button>
      </div>
    </div>
  );
}
