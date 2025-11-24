import { Model } from '@/lib/types';
import { Settings, MessageSquare, Search, Edit2, Menu } from 'lucide-react';
import { useState } from 'react';

interface SidebarProps {
  models: Model[];
  selectedModelId: string | null;
  onSelectModel: (id: string) => void;
  onEditModel: (model: Model) => void;
  onOpenSettings: () => void;
  isOpen: boolean; // Mobile responsive state
  onCloseMobile: () => void;
}

export function Sidebar({ models, selectedModelId, onSelectModel, onEditModel, onOpenSettings, isOpen, onCloseMobile }: SidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredModels = models.filter(m => 
    (m.name || m.id).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group by 'group' field if available, else 'default'
  const groupedModels = filteredModels.reduce((acc, model) => {
    const group = model.group || '默认分组';
    if (!acc[group]) acc[group] = [];
    acc[group].push(model);
    return acc;
  }, {} as Record<string, Model[]>);

  // Helper to close sidebar on mobile when selecting an item
  const handleSelect = (id: string) => {
      onSelectModel(id);
      if (window.innerWidth < 768) {
          onCloseMobile();
      }
  };

  return (
    <>
        {/* Mobile Overlay */}
        {isOpen && (
            <div 
                className="fixed inset-0 z-40 bg-black/50 md:hidden"
                onClick={onCloseMobile}
            />
        )}

        {/* Sidebar Container */}
        <div className={`
            fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-gray-100 transition-transform duration-300 dark:bg-gray-900 dark:border-gray-800 md:relative md:translate-x-0
            ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
            <div className="p-4 border-b dark:border-gray-800">
                <div className="flex items-center justify-between mb-4">
                     <h1 className="text-xl font-bold text-gray-800 dark:text-white">AI Chat</h1>
                     <button onClick={onCloseMobile} className="md:hidden text-gray-500">
                         <Menu size={20} />
                     </button>
                </div>
                
                <div className="relative">
                <Search className="absolute left-2 top-2.5 text-gray-400" size={16} />
                <input
                    type="text"
                    placeholder="搜索模型..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-md border border-gray-300 py-2 pl-8 pr-4 text-sm focus:border-blue-500 focus:outline-none dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                {Object.entries(groupedModels).map(([group, groupModels]) => (
                <div key={group} className="mb-4">
                    <h3 className="mb-2 px-2 text-xs font-semibold uppercase text-gray-500">{group}</h3>
                    <div className="space-y-1">
                    {groupModels.map(model => (
                        <div
                        key={model.id}
                        className={`group relative flex cursor-pointer items-center justify-between rounded-md p-2 text-sm transition-colors ${
                            selectedModelId === model.id
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800'
                        }`}
                        onClick={() => handleSelect(model.id)}
                        >
                        <div className="truncate pr-6">
                            {model.name || model.id}
                            {model.capabilities?.vision && (
                            <span className="ml-2 text-xs text-green-600 dark:text-green-400">👁</span>
                            )}
                        </div>
                        <button
                            onClick={(e) => {
                            e.stopPropagation();
                            onEditModel(model);
                            }}
                            className="absolute right-2 opacity-0 transition-opacity group-hover:opacity-100 hover:text-blue-600 md:group-hover:opacity-100"
                        >
                            <Edit2 size={14} />
                        </button>
                        </div>
                    ))}
                    </div>
                </div>
                ))}
                {models.length === 0 && (
                    <div className="px-2 text-sm text-gray-500">
                        请在设置中配置 API 以获取模型列表。
                    </div>
                )}
            </div>

            <div className="border-t p-4 dark:border-gray-800">
                <button
                onClick={() => { onOpenSettings(); onCloseMobile(); }}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                <Settings size={16} />
                设置
                </button>
            </div>
        </div>
    </>
  );
}
