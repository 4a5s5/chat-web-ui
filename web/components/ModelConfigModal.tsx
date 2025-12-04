import { useState, useEffect } from 'react';
import { Model } from '@/lib/types';
import { X, Save } from 'lucide-react';

interface ModelConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: Model | null;
  onSave: (model: Model) => void;
}

export function ModelConfigModal({ isOpen, onClose, model, onSave }: ModelConfigModalProps) {
  const [editedModel, setEditedModel] = useState<Model | null>(null);

  useEffect(() => {
    if (model) {
      setEditedModel({ ...model });
    }
  }, [model]);

  if (!isOpen || !editedModel) return null;

  const handleSave = () => {
    if (editedModel) {
      onSave(editedModel);
      onClose();
    }
  };

  const toggleCapability = (cap: 'vision' | 'reasoning' | 'imageGeneration') => {
    setEditedModel(prev => {
      if (!prev) return null;
      const capabilities = prev.capabilities || {};
      return {
        ...prev,
        capabilities: {
          ...capabilities,
          [cap]: !capabilities[cap]
        }
      };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">编辑模型</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Model ID (Read only) */}
          <div className="flex items-center gap-4">
            <div className="w-24 shrink-0 text-sm font-medium text-gray-500">模型 ID</div>
            <div className="flex-1 rounded-md bg-gray-100 p-2 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              {editedModel.id}
            </div>
          </div>

          {/* Model Name */}
          <div className="flex items-center gap-4">
            <div className="w-24 shrink-0 text-sm font-medium text-gray-900 dark:text-gray-300">模型名称</div>
            <input
              type="text"
              value={editedModel.name || editedModel.id}
              onChange={(e) => setEditedModel({ ...editedModel, name: e.target.value })}
              className="flex-1 rounded-md border border-gray-300 p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          {/* Group Name */}
          <div className="flex items-center gap-4">
            <div className="w-24 shrink-0 text-sm font-medium text-gray-900 dark:text-gray-300">分组名称</div>
            <input
              type="text"
              value={editedModel.group || 'Default'}
              onChange={(e) => setEditedModel({ ...editedModel, group: e.target.value })}
              className="flex-1 rounded-md border border-gray-300 p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          {/* Model Type / Capabilities */}
          <div className="flex items-start gap-4">
            <div className="mt-2 w-24 shrink-0 text-sm font-medium text-gray-900 dark:text-gray-300">模型类型</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => toggleCapability('vision')}
                className={`rounded-full px-4 py-1 text-sm transition-colors ${editedModel.capabilities?.vision
                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  }`}
              >
                👁 视觉
              </button>
              <button
                onClick={() => toggleCapability('imageGeneration')}
                className={`rounded-full px-4 py-1 text-sm transition-colors ${editedModel.capabilities?.imageGeneration
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  }`}
              >
                🎨 生图
              </button>
              {/* Add more capabilities as needed to match Cherry Studio UI */}
              <button
                className="cursor-not-allowed rounded-full bg-gray-100 px-4 py-1 text-sm text-gray-400 dark:bg-gray-700"
                disabled
              >
                🌐 联网
              </button>
              <button
                className="cursor-not-allowed rounded-full bg-gray-100 px-4 py-1 text-sm text-gray-400 dark:bg-gray-700"
                disabled
              >
                ☀ 推理
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-md bg-green-600 px-6 py-2 text-white hover:bg-green-700"
          >
            <Save size={18} />
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

