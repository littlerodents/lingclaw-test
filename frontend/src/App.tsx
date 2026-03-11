import { useState, useEffect, useCallback } from 'react';
import {
  Wand2,
  LayoutDashboard,
  MessageSquare,
  Server,
  Menu,
  X,
  UserCircle,
} from 'lucide-react';
import Wizard from './pages/Wizard';
import Dashboard from './pages/Dashboard';
import Channels from './pages/Channels';
import Persona from './pages/Persona';

type Route = 'wizard' | 'dashboard' | 'channels' | 'persona';

interface NavItem {
  route: Route;
  hash: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { route: 'wizard', hash: '#/wizard', label: '配置向导', icon: <Wand2 size={20} /> },
  { route: 'dashboard', hash: '#/dashboard', label: '控制台', icon: <LayoutDashboard size={20} /> },
  { route: 'channels', hash: '#/channels', label: '渠道管理', icon: <MessageSquare size={20} /> },
  { route: 'persona', hash: '#/persona', label: 'AI 角色', icon: <UserCircle size={20} /> },
];

function getRouteFromHash(): Route {
  const hash = window.location.hash;
  if (hash.startsWith('#/dashboard')) return 'dashboard';
  if (hash.startsWith('#/channels')) return 'channels';
  if (hash.startsWith('#/persona')) return 'persona';
  if (hash.startsWith('#/wizard')) return 'wizard';
  return 'wizard';
}

export default function App() {
  const [route, setRoute] = useState<Route>(getRouteFromHash);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const onHash = () => setRoute(getRouteFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    fetch('/api/setup/state')
      .then((r) => r.json())
      .then((data) => {
        const isConfigured = data.ok && data.data?.isConfigured === true;
        setConfigured(isConfigured);
        if (!isConfigured && route !== 'wizard') {
          window.location.hash = '#/wizard';
        } else if (isConfigured && route === 'wizard') {
          window.location.hash = '#/dashboard';
        }
      })
      .catch(() => {
        setConfigured(false);
        window.location.hash = '#/wizard';
      });
  }, []);

  const navigate = useCallback((r: Route) => {
    window.location.hash = `#/${r}`;
    setSidebarOpen(false);
  }, []);

  if (configured === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">正在加载...</p>
        </div>
      </div>
    );
  }

  if (route === 'wizard') {
    return <Wizard onComplete={() => navigate('dashboard')} />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40 w-60 bg-white border-r border-gray-200
          flex flex-col transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex items-center gap-3 px-5 h-16 border-b border-gray-100">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Server size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-900">OpenClaw</h1>
            <p className="text-xs text-gray-400">管理面板</p>
          </div>
          <button
            className="ml-auto lg:hidden p-1 rounded hover:bg-gray-100"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems
            .filter((item) => item.route !== 'wizard')
            .map((item) => {
              const active = route === item.route;
              return (
                <button
                  key={item.route}
                  onClick={() => navigate(item.route)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                    transition-colors duration-150
                    ${
                      active
                        ? 'bg-primary/5 text-primary'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  {item.icon}
                  {item.label}
                </button>
              );
            })}
        </nav>

        <div className="px-4 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">OpenClaw v1.0.0</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg hover:bg-gray-100"
          >
            <Menu size={20} className="text-gray-600" />
          </button>
          <span className="ml-3 text-sm font-medium text-gray-700">
            {navItems.find((n) => n.route === route)?.label}
          </span>
        </header>

        <div className="flex-1 overflow-y-auto">
          {route === 'dashboard' && <Dashboard />}
          {route === 'channels' && <Channels />}
          {route === 'persona' && <Persona />}
        </div>
      </main>
    </div>
  );
}
