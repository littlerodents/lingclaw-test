import { useState, useEffect, useCallback } from 'react';
import {
  Play,
  Square,
  RotateCw,
  Settings,
  MessageSquare,
  Stethoscope,
  Loader2,
  Clock,
  Cpu,
  HardDrive,
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import LogViewer from '../components/LogViewer';

interface ServiceStatus {
  running: boolean;
  pid?: number;
  memory?: string;
  uptime?: string;
}

export default function Dashboard() {
  const [status, setStatus] = useState<ServiceStatus>({ running: false });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [diagnosticResult, setDiagnosticResult] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/service/status');
      const data = await res.json();
      if (data.ok && data.data) {
        const d = data.data;
        setStatus({
          running: d.running,
          pid: d.pid,
          memory: d.memory ? `${Math.round(d.memory / 1024)} MB` : undefined,
          uptime: d.uptime ? `${Math.floor(d.uptime / 60)}m ${d.uptime % 60}s` : undefined,
        });
      } else {
        setStatus({ running: false });
      }
    } catch {
      setStatus({ running: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  async function serviceAction(action: 'start' | 'stop' | 'restart') {
    setActionLoading(action);
    try {
      await fetch(`/api/service/${action}`, { method: 'POST' });
      // Wait a moment then refresh
      setTimeout(fetchStatus, 1000);
    } catch {
      // Silently handle
    } finally {
      setActionLoading(null);
    }
  }

  async function runDiagnostics() {
    setDiagnosticResult(null);
    setActionLoading('diagnostics');
    try {
      const res = await fetch('/api/diagnostics/run', { method: 'POST' });
      const data = await res.json();
      if (data.ok && data.data) {
        setDiagnosticResult(
          data.data.success ? '所有诊断检测通过' : `发现问题：${data.data.message}`
        );
      } else {
        setDiagnosticResult(`诊断失败：${data.error || '未知错误'}`);
      }
    } catch {
      setDiagnosticResult('诊断请求失败');
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">控制台</h1>
        <p className="text-sm text-gray-500 mt-1">监控和管理 OpenClaw 服务</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Service Status Card */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-semibold text-gray-900">
              服务状态
            </h2>
            <StatusBadge running={status.running} />
          </div>

          {/* Status metrics */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-1">
                <Cpu size={14} />
                <span className="text-xs font-medium uppercase tracking-wide">
                  PID
                </span>
              </div>
              <p className="text-lg font-semibold text-gray-900 font-mono">
                {status.running && status.pid ? status.pid : '--'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-1">
                <HardDrive size={14} />
                <span className="text-xs font-medium uppercase tracking-wide">
                  内存
                </span>
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {status.running && status.memory ? status.memory : '--'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-1">
                <Clock size={14} />
                <span className="text-xs font-medium uppercase tracking-wide">
                  运行时间
                </span>
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {status.running && status.uptime ? status.uptime : '--'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            {!status.running ? (
              <button
                onClick={() => serviceAction('start')}
                disabled={!!actionLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading === 'start' ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Play size={16} />
                )}
                启动
              </button>
            ) : (
              <button
                onClick={() => serviceAction('stop')}
                disabled={!!actionLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading === 'stop' ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Square size={16} />
                )}
                停止
              </button>
            )}
            <button
              onClick={() => serviceAction('restart')}
              disabled={!!actionLoading || !status.running}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {actionLoading === 'restart' ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RotateCw size={16} />
              )}
              重启
            </button>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            快捷操作
          </h2>
          <div className="space-y-2">
            <a
              href="#/wizard"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors group"
            >
              <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <Settings size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">AI 配置</p>
                <p className="text-xs text-gray-400">重新运行配置向导</p>
              </div>
            </a>
            <a
              href="#/channels"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors group"
            >
              <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                <MessageSquare size={16} className="text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium">渠道管理</p>
                <p className="text-xs text-gray-400">配置消息渠道</p>
              </div>
            </a>
            <button
              onClick={runDiagnostics}
              disabled={actionLoading === 'diagnostics'}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors group text-left"
            >
              <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center group-hover:bg-green-100 transition-colors">
                {actionLoading === 'diagnostics' ? (
                  <Loader2 size={16} className="text-green-600 animate-spin" />
                ) : (
                  <Stethoscope size={16} className="text-green-600" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">诊断检测</p>
                <p className="text-xs text-gray-400">检查服务运行状态</p>
              </div>
            </button>

            {diagnosticResult && (
              <div
                className={`
                  p-3 rounded-lg text-sm animate-fade-in
                  ${
                    diagnosticResult.includes('通过')
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  }
                `}
              >
                {diagnosticResult}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Logs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          实时日志
        </h2>
        <LogViewer />
      </div>
    </div>
  );
}
