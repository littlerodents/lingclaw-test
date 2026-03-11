import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import ChannelForm, { type FieldDef } from '../components/ChannelForm';

interface Channel {
  id: string;
  name: string;
  emoji: string;
  enabled: boolean;
  comingSoon?: boolean;
  fields: FieldDef[];
}

const CHANNELS: Channel[] = [
  {
    id: 'telegram',
    name: 'Telegram',
    emoji: '\uD83D\uDCF1',
    enabled: false,
    fields: [
      {
        key: 'bot_token',
        label: 'Bot Token',
        type: 'password',
        placeholder: '123456:ABC-DEF...',
        hint: '从 @BotFather 获取的 Token',
        required: true,
      },
      {
        key: 'proxy',
        label: '代理地址',
        type: 'text',
        placeholder: 'http://127.0.0.1:7890',
        hint: '如果服务器在国内，可能需要代理访问 Telegram',
      },
    ],
  },
  {
    id: 'discord',
    name: 'Discord',
    emoji: '\uD83C\uDFAE',
    enabled: false,
    fields: [
      {
        key: 'bot_token',
        label: 'Bot Token',
        type: 'password',
        placeholder: 'MTA...',
        hint: '从 Discord Developer Portal 获取',
        required: true,
      },
      {
        key: 'application_id',
        label: 'Application ID',
        type: 'text',
        placeholder: '1234567890',
        hint: '应用程序 ID',
        required: true,
      },
    ],
  },
  {
    id: 'slack',
    name: 'Slack',
    emoji: '\uD83D\uDCBC',
    enabled: false,
    fields: [
      {
        key: 'bot_token',
        label: 'Bot Token',
        type: 'password',
        placeholder: 'xoxb-...',
        hint: 'Slack App 的 Bot User OAuth Token',
        required: true,
      },
      {
        key: 'app_token',
        label: 'App Token',
        type: 'password',
        placeholder: 'xapp-...',
        hint: 'Socket Mode 需要的 App-Level Token',
        required: true,
      },
      {
        key: 'signing_secret',
        label: 'Signing Secret',
        type: 'password',
        placeholder: '...',
        hint: '用于验证请求签名',
      },
    ],
  },
  {
    id: 'feishu',
    name: '飞书',
    emoji: '\uD83D\uDC26',
    enabled: false,
    fields: [
      {
        key: 'app_id',
        label: 'App ID',
        type: 'text',
        placeholder: 'cli_...',
        hint: '飞书开放平台应用凭证',
        required: true,
      },
      {
        key: 'app_secret',
        label: 'App Secret',
        type: 'password',
        placeholder: '...',
        hint: '飞书开放平台应用密钥',
        required: true,
      },
      {
        key: 'verification_token',
        label: 'Verification Token',
        type: 'password',
        placeholder: '...',
        hint: '事件订阅验证令牌',
      },
      {
        key: 'encrypt_key',
        label: 'Encrypt Key',
        type: 'password',
        placeholder: '...',
        hint: '事件加密密钥（可选）',
      },
    ],
  },
  {
    id: 'dingtalk',
    name: '钉钉',
    emoji: '\uD83D\uDD14',
    enabled: false,
    fields: [
      {
        key: 'client_id',
        label: 'Client ID (AppKey)',
        type: 'text',
        placeholder: 'ding...',
        hint: '钉钉开放平台应用 AppKey',
        required: true,
      },
      {
        key: 'client_secret',
        label: 'Client Secret (AppSecret)',
        type: 'password',
        placeholder: '...',
        hint: '钉钉开放平台应用 AppSecret',
        required: true,
      },
      {
        key: 'robot_code',
        label: '机器人编码',
        type: 'text',
        placeholder: 'ding...',
        hint: '机器人的 robotCode',
      },
    ],
  },
  {
    id: 'wecom',
    name: '企业微信',
    emoji: '\uD83C\uDFE2',
    enabled: false,
    fields: [
      {
        key: 'corp_id',
        label: '企业 ID (CorpID)',
        type: 'text',
        placeholder: 'ww...',
        hint: '在企业微信管理后台获取',
        required: true,
      },
      {
        key: 'agent_id',
        label: 'Agent ID',
        type: 'text',
        placeholder: '1000002',
        hint: '应用的 AgentId',
        required: true,
      },
      {
        key: 'secret',
        label: 'Secret',
        type: 'password',
        placeholder: '...',
        hint: '应用的 Secret',
        required: true,
      },
      {
        key: 'token',
        label: 'Token',
        type: 'password',
        placeholder: '...',
        hint: '接收消息的 Token',
      },
      {
        key: 'encoding_aes_key',
        label: 'EncodingAESKey',
        type: 'password',
        placeholder: '...',
        hint: '消息加解密密钥',
      },
    ],
  },
  {
    id: 'qq',
    name: 'QQ',
    emoji: '\uD83D\uDC27',
    enabled: false,
    fields: [
      {
        key: 'app_id',
        label: 'App ID',
        type: 'text',
        placeholder: '102...',
        hint: 'QQ 机器人 App ID',
        required: true,
      },
      {
        key: 'app_secret',
        label: 'App Secret',
        type: 'password',
        placeholder: '...',
        hint: 'QQ 机器人密钥',
        required: true,
      },
      {
        key: 'token',
        label: 'Token',
        type: 'password',
        placeholder: '...',
        hint: '机器人 Token',
        required: true,
      },
      {
        key: 'sandbox',
        label: '沙箱模式',
        type: 'boolean',
        hint: '启用后连接沙箱环境进行测试',
      },
    ],
  },
  {
    id: 'wechat',
    name: '微信',
    emoji: '\uD83D\uDCAC',
    enabled: false,
    comingSoon: true,
    fields: [
      {
        key: 'placeholder',
        label: '微信渠道',
        type: 'text',
        hint: '微信渠道正在开发中，敬请期待',
      },
    ],
  },
];

export default function Channels() {
  const [channels, setChannels] = useState<Channel[]>(CHANNELS);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, Record<string, string | boolean>>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [closing, setClosing] = useState(false);

  // Load channel configs from API on mount
  useEffect(() => {
    fetch('/api/config/channels')
      .then((r) => r.json())
      .then((data) => {
        if (data.data) {
          const channelList = data.data as Array<{ id: string; enabled: boolean; values?: Record<string, string | boolean> }>;
          setChannels((prev) =>
            prev.map((ch) => {
              const remote = channelList.find((rc) => rc.id === ch.id);
              if (remote) {
                if (remote.values) {
                  setFormValues((fv) => ({
                    ...fv,
                    [ch.id]: remote.values!,
                  }));
                }
                return { ...ch, enabled: remote.enabled };
              }
              return ch;
            })
          );
        }
      })
      .catch(() => {
        // Use defaults
      });
  }, []);

  const toggleChannel = useCallback(
    async (channelId: string) => {
      const channel = channels.find((c) => c.id === channelId);
      if (!channel || channel.comingSoon) return;

      const newEnabled = !channel.enabled;
      setChannels((prev) =>
        prev.map((c) => (c.id === channelId ? { ...c, enabled: newEnabled } : c))
      );

      try {
        await fetch(`/api/config/channels/${channelId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: newEnabled }),
        });
      } catch {
        // Revert on error
        setChannels((prev) =>
          prev.map((c) =>
            c.id === channelId ? { ...c, enabled: !newEnabled } : c
          )
        );
      }
    },
    [channels]
  );

  function openPanel(channelId: string) {
    if (channels.find((c) => c.id === channelId)?.comingSoon) return;
    setTestResult(null);
    setClosing(false);
    setActiveChannel(channelId);
  }

  function closePanel() {
    setClosing(true);
    setTimeout(() => {
      setActiveChannel(null);
      setClosing(false);
    }, 250);
  }

  function handleFieldChange(channelId: string, key: string, value: string | boolean) {
    setFormValues((prev) => ({
      ...prev,
      [channelId]: { ...(prev[channelId] || {}), [key]: value },
    }));
  }

  async function handleSave(channelId: string) {
    setSaving(true);
    try {
      await fetch(`/api/config/channels/${channelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: formValues[channelId] || {} }),
      });
    } catch {
      // Handle error silently
    } finally {
      setSaving(false);
    }
  }

  async function handleTest(channelId: string) {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/diagnostics/test-channel/${channelId}`, {
        method: 'POST',
      });
      const data = await res.json();
      setTestResult({ success: data.success, message: data.message || '' });
    } catch {
      setTestResult({ success: false, message: '请求失败' });
    } finally {
      setTesting(false);
    }
  }

  const activeChannelData = channels.find((c) => c.id === activeChannel);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">渠道管理</h1>
        <p className="text-sm text-gray-500 mt-1">
          配置和管理消息渠道，连接您的 AI 助手到各个平台
        </p>
      </div>

      {/* Channel grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {channels.map((channel) => (
          <div
            key={channel.id}
            className={`
              bg-white rounded-xl shadow-sm border border-gray-200 p-5
              transition-all duration-200 hover:shadow-md
              ${channel.comingSoon ? 'opacity-60' : ''}
            `}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="text-3xl">{channel.emoji}</div>
              {channel.comingSoon ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                  即将支持
                </span>
              ) : (
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={channel.enabled}
                    onChange={() => toggleChannel(channel.id)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                </label>
              )}
            </div>

            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              {channel.name}
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              {channel.enabled ? '已启用' : '未启用'}
            </p>

            <button
              onClick={() => openPanel(channel.id)}
              disabled={channel.comingSoon}
              className="w-full py-2 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              配置
            </button>
          </div>
        ))}
      </div>

      {/* Slide-over panel */}
      {activeChannel && activeChannelData && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={closePanel}
          />

          {/* Panel */}
          <div
            className={`
              fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col
              ${closing ? 'animate-slide-out-right' : 'animate-slide-in-right'}
            `}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 h-16 border-b border-gray-200 shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xl">{activeChannelData.emoji}</span>
                <h2 className="text-base font-semibold text-gray-900">
                  {activeChannelData.name}
                </h2>
              </div>
              <button
                onClick={closePanel}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto p-6">
              <ChannelForm
                channelId={activeChannel}
                channelName={activeChannelData.name}
                fields={activeChannelData.fields}
                values={formValues[activeChannel] || {}}
                onChange={(key, value) =>
                  handleFieldChange(activeChannel, key, value)
                }
                onSave={() => handleSave(activeChannel)}
                onTest={() => handleTest(activeChannel)}
                saving={saving}
                testing={testing}
                testResult={testResult}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
