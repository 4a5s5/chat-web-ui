import { useState, useEffect } from 'react';
import { ApiProfile, AppConfig, SearchProvider } from '@/lib/types';
import { X, Plus, Trash2, Check, Edit2, Search, Globe } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: ApiProfile[];
  currentProfileId: string | null;
  onSaveProfiles: (profiles: ApiProfile[], activeId: string | null) => void;
  
  // Search Config
  config: AppConfig;
  onSaveConfig: (config: AppConfig) => void;
}

export function SettingsModal({ 
    isOpen, 
    onClose, 
    profiles, 
    currentProfileId, 
    onSaveProfiles,
    config,
    onSaveConfig
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'api' | 'search'>('api');
  
  // API Profiles State
  const [localProfiles, setLocalProfiles] = useState<ApiProfile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formBaseUrl, setFormBaseUrl] = useState('');
  const [formApiKey, setFormApiKey] = useState('');

  // Search Config State
  const [searchProvider, setSearchProvider] = useState<SearchProvider>('tavily');
  const [tavilyKey, setTavilyKey] = useState('');
  const [bingKey, setBingKey] = useState('');
  const [searxngUrl, setSearxngUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLocalProfiles(profiles);
      setActiveId(currentProfileId);
      setEditingId(null);
      resetForm();
      
      // Load search config
      setSearchProvider(config.searchProvider || 'tavily');
      setTavilyKey(config.tavilyKey || '');
      setBingKey(config.bingKey || '');
      setSearxngUrl(config.searxngUrl || '');
    }
  }, [isOpen, profiles, currentProfileId, config]);

  const resetForm = () => {
    setFormName('');
    setFormBaseUrl('');
    setFormApiKey('');
    setEditingId(null);
  };

  const handleEdit = (profile: ApiProfile) => {
    setEditingId(profile.id);
    setFormName(profile.name);
    setFormBaseUrl(profile.baseUrl);
    setFormApiKey(profile.apiKey);
  };

  const handleDelete = (id: string) => {
    const newProfiles = localProfiles.filter(p => p.id !== id);
    setLocalProfiles(newProfiles);
    if (activeId === id) {
      setActiveId(newProfiles.length > 0 ? newProfiles[0].id : null);
    }
  };

  const handleSelect = (id: string) => {
    setActiveId(id);
  };

  const handleSaveForm = () => {
    if (!formName || !formBaseUrl || !formApiKey) return;

    if (editingId) {
      setLocalProfiles(prev => prev.map(p => 
        p.id === editingId 
          ? { ...p, name: formName, baseUrl: formBaseUrl, apiKey: formApiKey }
          : p
      ));
    } else {
      const newProfile: ApiProfile = {
        id: uuidv4(),
        name: formName,
        baseUrl: formBaseUrl,
        apiKey: formApiKey
      };
      setLocalProfiles(prev => [...prev, newProfile]);
      if (!activeId) setActiveId(newProfile.id);
    }
    resetForm();
  };

  const handleSaveAll = () => {
    onSaveProfiles(localProfiles, activeId);
    
    // Save Search Config
    onSaveConfig({
        ...config, 
        searchProvider,
        tavilyKey,
        bingKey,
        searxngUrl
    });

    onClose();
  };

  const providers: { id: SearchProvider; name: string; desc: string; isFree?: boolean }[] = [
      { id: 'tavily', name: 'Tavily', desc: '专为 LLM 优化 (推荐)', isFree: false },
      { id: 'bing_api', name: 'Bing API', desc: '官方 API (稳定)', isFree: false },
      { id: 'bing_free', name: 'Bing (Free)', desc: '网页抓取 (无需Key)', isFree: true },
      { id: 'google_free', name: 'Google (Free)', desc: '网页抓取 (无需Key)', isFree: true },
      { id: 'baidu_free', name: 'Baidu (Free)', desc: '网页抓取 (无需Key)', isFree: true },
      { id: 'searxng', name: 'Searxng', desc: '元搜索引擎 (开源)', isFree: true },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex h-[600px] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl dark:bg-gray-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">设置</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X size={24} />
          </button>
        </div>

        {/* Sidebar Tabs */}
        <div className="flex flex-1 overflow-hidden">
            <div className="w-48 border-r bg-gray-50 p-2 dark:bg-gray-900 dark:border-gray-700 flex flex-col gap-1">
                <button
                    onClick={() => setActiveTab('api')}
                    className={`flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        activeTab === 'api' 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                        : 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800'
                    }`}
                >
                    <Globe size={16} />
                    模型服务
                </button>
                <button
                    onClick={() => setActiveTab('search')}
                    className={`flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        activeTab === 'search' 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                        : 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800'
                    }`}
                >
                    <Search size={16} />
                    网络搜索
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6 overflow-y-auto bg-white dark:bg-gray-800">
                
                {/* API TAB Content */}
                {activeTab === 'api' && (
                    <div className="space-y-6">
                        {/* List Area */}
                        <div className="rounded-md border dark:border-gray-700">
                            <div className="bg-gray-50 p-2 text-xs font-semibold text-gray-500 dark:bg-gray-900 dark:text-gray-400 flex justify-between items-center">
                                <span>配置列表</span>
                                <button onClick={resetForm} className="text-blue-600 hover:text-blue-700 flex items-center gap-1">
                                    <Plus size={14} /> 新建
                                </button>
                            </div>
                            <div className="divide-y dark:divide-gray-700 max-h-40 overflow-y-auto">
                                {localProfiles.map(profile => (
                                    <div
                                        key={profile.id}
                                        onClick={() => handleSelect(profile.id)}
                                        className={`flex cursor-pointer items-center justify-between p-3 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                                            activeId === profile.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            {activeId === profile.id && <Check size={14} className="text-blue-600" />}
                                            <span className="font-medium text-gray-900 dark:text-white">{profile.name}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={(e) => { e.stopPropagation(); handleEdit(profile); }} className="text-gray-400 hover:text-blue-600"><Edit2 size={14} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(profile.id); }} className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                ))}
                                {localProfiles.length === 0 && <div className="p-4 text-center text-gray-500 text-xs">暂无配置</div>}
                            </div>
                        </div>

                        {/* Form Area */}
                        <div className="space-y-4 border-t pt-4 dark:border-gray-700">
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                                {editingId ? '编辑配置' : '添加新配置'}
                            </h3>
                            <div className="grid gap-4">
                                <input
                                    type="text"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder="名称 (如 OpenAI)"
                                    className="rounded-md border border-gray-300 p-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                                <input
                                    type="text"
                                    value={formBaseUrl}
                                    onChange={(e) => setFormBaseUrl(e.target.value)}
                                    placeholder="Base URL (如 https://api.openai.com)"
                                    className="rounded-md border border-gray-300 p-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                                <input
                                    type="password"
                                    value={formApiKey}
                                    onChange={(e) => setFormApiKey(e.target.value)}
                                    placeholder="API Key"
                                    className="rounded-md border border-gray-300 p-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                                <div className="flex justify-end">
                                    <button
                                        onClick={handleSaveForm}
                                        disabled={!formName || !formBaseUrl || !formApiKey}
                                        className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-white"
                                    >
                                        {editingId ? '更新' : '添加'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* SEARCH TAB Content */}
                {activeTab === 'search' && (
                    <div className="space-y-6">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
                                默认搜索引擎
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {providers.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => setSearchProvider(p.id)}
                                        className={`rounded-lg border p-3 text-left transition-all ${
                                            searchProvider === p.id
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                                                : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                                        }`}
                                    >
                                        <div className="font-semibold text-sm text-gray-900 dark:text-white flex justify-between">
                                            {p.name}
                                            {p.isFree && <span className="text-green-600 text-xs bg-green-100 px-1.5 py-0.5 rounded">Free</span>}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">{p.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4 border-t pt-4 dark:border-gray-700">
                            {searchProvider === 'tavily' && (
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Tavily API Key
                                    </label>
                                    <input
                                        type="password"
                                        value={tavilyKey}
                                        onChange={(e) => setTavilyKey(e.target.value)}
                                        placeholder="tvly-..."
                                        className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                </div>
                            )}

                            {searchProvider === 'bing_api' && (
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Bing Search API Key (Azure)
                                    </label>
                                    <input
                                        type="password"
                                        value={bingKey}
                                        onChange={(e) => setBingKey(e.target.value)}
                                        placeholder="Azure Bing Resource Key"
                                        className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                </div>
                            )}

                            {searchProvider === 'searxng' && (
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Searxng Instance URL
                                    </label>
                                    <input
                                        type="text"
                                        value={searxngUrl}
                                        onChange={(e) => setSearxngUrl(e.target.value)}
                                        placeholder="https://searx.be"
                                        className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">请提供一个公开的 Searxng 实例地址。</p>
                                </div>
                            )}

                            {(searchProvider.includes('free')) && (
                                <div className="p-3 bg-yellow-50 text-yellow-800 rounded-md text-xs dark:bg-yellow-900/20 dark:text-yellow-200">
                                    注意：Free 模式通过网页抓取实现，可能因服务器 IP 被目标网站封禁而失效。建议优先使用 Tavily 或 Bing API。
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t bg-gray-50 p-4 dark:bg-gray-900 dark:border-gray-700">
            <button
                onClick={onClose}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
                取消
            </button>
            <button
                onClick={handleSaveAll}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
                保存并应用
            </button>
        </div>
      </div>
    </div>
  );
}
