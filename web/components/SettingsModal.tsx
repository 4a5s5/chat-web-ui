import { useState, useEffect } from 'react';
import { ApiProfile, AppConfig } from '@/lib/types';
import { X, Plus, Trash2, Check, Edit2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: ApiProfile[];
  currentProfileId: string | null;
  onSaveProfiles: (profiles: ApiProfile[], activeId: string | null) => void;
}

export function SettingsModal({ isOpen, onClose, profiles, currentProfileId, onSaveProfiles }: SettingsModalProps) {
  const [localProfiles, setLocalProfiles] = useState<ApiProfile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formBaseUrl, setFormBaseUrl] = useState('');
  const [formApiKey, setFormApiKey] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLocalProfiles(profiles);
      setActiveId(currentProfileId);
      setEditingId(null);
      resetForm();
    }
  }, [isOpen, profiles, currentProfileId]);

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
      // Update existing
      setLocalProfiles(prev => prev.map(p => 
        p.id === editingId 
          ? { ...p, name: formName, baseUrl: formBaseUrl, apiKey: formApiKey }
          : p
      ));
    } else {
      // Add new
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
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex h-[600px] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl dark:bg-gray-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">API 设置</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar: List of Profiles */}
          <div className="w-1/3 border-r bg-gray-50 p-2 dark:bg-gray-900 dark:border-gray-700 overflow-y-auto">
            <div className="mb-2 flex justify-between items-center px-2">
                <span className="text-xs font-semibold text-gray-500">配置列表</span>
                <button 
                    onClick={resetForm}
                    className="text-blue-600 hover:text-blue-700 text-xs flex items-center"
                >
                    <Plus size={14} className="mr-1" /> 新建
                </button>
            </div>
            <div className="space-y-1">
              {localProfiles.map(profile => (
                <div
                  key={profile.id}
                  onClick={() => {
                      // If we are not editing, select as active
                      // If we want to edit, click edit button
                      // But typically clicking row selects it as "current active candidate"
                      handleSelect(profile.id);
                  }}
                  className={`group flex cursor-pointer items-center justify-between rounded-md p-2 text-sm transition-colors ${
                    activeId === profile.id
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="truncate font-medium">
                    {profile.name}
                    {activeId === profile.id && <span className="ml-2 text-xs text-blue-500">(当前)</span>}
                  </div>
                  <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEdit(profile); }}
                      className="mr-1 p-1 hover:text-blue-600"
                      title="编辑"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(profile.id); }}
                      className="p-1 hover:text-red-600"
                      title="删除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {localProfiles.length === 0 && (
                  <div className="p-4 text-center text-gray-500 text-xs">
                      暂无配置，请在右侧添加
                  </div>
              )}
            </div>
          </div>

          {/* Main: Edit Form */}
          <div className="flex-1 p-6 overflow-y-auto bg-white dark:bg-gray-800">
            <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
              {editingId ? '编辑配置' : '添加新配置'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  配置名称
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="例如：OpenAI, Local, Cherry..."
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  API Base URL
                </label>
                <input
                  type="text"
                  value={formBaseUrl}
                  onChange={(e) => setFormBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com"
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  API Key
                </label>
                <input
                  type="password"
                  value={formApiKey}
                  onChange={(e) => setFormApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSaveForm}
                  disabled={!formName || !formBaseUrl || !formApiKey}
                  className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                >
                  {editingId ? '更新配置' : '添加到列表'}
                </button>
              </div>
            </div>

             <div className="mt-8 border-t pt-4 dark:border-gray-700">
                <p className="text-sm text-gray-500 mb-2">说明：</p>
                <ul className="text-xs text-gray-400 list-disc pl-4 space-y-1">
                    <li>点击左侧列表项可选择当前使用的配置。</li>
                    <li>添加或修改后，需要点击下方的“保存并应用”才会生效。</li>
                    <li>Base URL 请填写完整的地址，如 <code>https://api.openai.com</code>。</li>
                </ul>
             </div>
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
