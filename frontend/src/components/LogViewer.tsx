import { useEffect, useRef, useState } from 'react';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

export default function LogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  useEffect(() => {
    let eventSource: EventSource | null = null;

    function connect() {
      eventSource = new EventSource('/api/service/logs');

      eventSource.onopen = () => setConnected(true);

      eventSource.onmessage = (event) => {
        try {
          const entry: LogEntry = JSON.parse(event.data);
          setLogs((prev) => {
            const next = [...prev, entry];
            // Keep last 500 lines
            if (next.length > 500) return next.slice(-500);
            return next;
          });
        } catch {
          // Plain text log line
          setLogs((prev) => {
            const next = [
              ...prev,
              {
                timestamp: new Date().toISOString(),
                level: 'info',
                message: event.data,
              },
            ];
            if (next.length > 500) return next.slice(-500);
            return next;
          });
        }
      };

      eventSource.onerror = () => {
        setConnected(false);
        eventSource?.close();
        // Reconnect after 3 seconds
        setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      eventSource?.close();
    };
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (autoScrollRef.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  function handleScroll() {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    // If user scrolled up more than 50px from bottom, disable auto-scroll
    autoScrollRef.current = scrollHeight - scrollTop - clientHeight < 50;
  }

  function getLevelColor(level: string): string {
    switch (level.toLowerCase()) {
      case 'error':
      case 'err':
        return 'text-red-400';
      case 'warn':
      case 'warning':
        return 'text-yellow-400';
      case 'debug':
        return 'text-gray-500';
      default:
        return 'text-green-400';
    }
  }

  function formatTime(ts: string): string {
    try {
      return new Date(ts).toLocaleTimeString('zh-CN', { hour12: false });
    } catch {
      return ts;
    }
  }

  return (
    <div className="relative">
      <div className="absolute top-3 right-3 z-10">
        <span
          className={`
            inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium
            ${connected ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}
          `}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`}
          />
          {connected ? '已连接' : '重连中...'}
        </span>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="log-viewer bg-gray-900 rounded-lg p-4 h-80 overflow-y-auto font-mono text-sm leading-6"
      >
        {logs.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            等待日志输出...
          </div>
        ) : (
          logs.map((entry, i) => (
            <div key={i} className="flex gap-3 hover:bg-white/5 px-1 rounded">
              <span className="text-gray-600 shrink-0 select-none">
                {formatTime(entry.timestamp)}
              </span>
              <span
                className={`shrink-0 uppercase w-12 text-right ${getLevelColor(entry.level)}`}
              >
                {entry.level}
              </span>
              <span className="text-gray-300 break-all">{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
