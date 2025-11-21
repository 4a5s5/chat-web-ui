'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ChatInterface } from '@/components/ChatInterface';
import { SettingsModal } from '@/components/SettingsModal';
import { ModelConfigModal } from '@/components/ModelConfigModal';
import { ApiProfile, AppConfig, ChatMessage, Model } from '@/lib/types';
import { fetchModels, sendChat } from '@/lib/api';
import { v4 as uuidv4 } from 'uuid';

export default function Home() {
  // State
  const [config, setConfig] = useState<AppConfig>({ apiKey: '', baseUrl: '' });
  const [profiles, setProfiles] = useState<ApiProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load initial state
  useEffect(() => {
    // Load profiles
    const savedProfiles = localStorage.getItem('chat_profiles');
    const savedActiveId = localStorage.getItem('chat_active_profile_id');
    // Legacy config support
    const savedLegacyConfig = localStorage.getItem('chat_config');

    let initialProfiles: ApiProfile[] = [];
    let initialActiveId: string | null = null;

    if (savedProfiles) {
        try {
            initialProfiles = JSON.parse(savedProfiles);
            initialActiveId = savedActiveId;
        } catch (e) { console.error(e); }
    }
    
    // Migrate legacy config if no profiles exist
    if (initialProfiles.length === 0 && savedLegacyConfig) {
        try {
            const legacy = JSON.parse(savedLegacyConfig);
            if (legacy.baseUrl && legacy.apiKey) {
                const newId = uuidv4();
                const legacyProfile: ApiProfile = {
                    id: newId,
                    name: 'Default',
                    baseUrl: legacy.baseUrl,
                    apiKey: legacy.apiKey
                };
                initialProfiles = [legacyProfile];
                initialActiveId = newId;
                // Save immediately
                localStorage.setItem('chat_profiles', JSON.stringify(initialProfiles));
                localStorage.setItem('chat_active_profile_id', newId);
            }
        } catch (e) { console.error(e); }
    }

    setProfiles(initialProfiles);
    setActiveProfileId(initialActiveId);

    // Set initial config
    const active = initialProfiles.find(p => p.id === initialActiveId);
    if (active) {
        setConfig({ baseUrl: active.baseUrl, apiKey: active.apiKey });
    }
  }, []);

  // Fetch models when config changes
  useEffect(() => {
    if (config.apiKey && config.baseUrl) {
      const savedCustomizations = JSON.parse(localStorage.getItem('chat_custom_models') || '{}');
      
      fetchModels(config)
        .then(fetchedModels => {
          // Merge with saved customizations (name, group, capabilities)
          const mergedModels = fetchedModels.map(m => {
            const saved = savedCustomizations[m.id];
            if (saved) {
              return { ...m, ...saved };
            }
            return m;
          });
          setModels(mergedModels);
          
          // Auto-select first if none selected or if current selection is invalid
          const currentExists = mergedModels.find(m => m.id === selectedModelId);
          if (!currentExists && mergedModels.length > 0) {
            setSelectedModelId(mergedModels[0].id);
          }
        })
        .catch(err => {
            console.error(err);
            setModels([]); // Clear models on error
        });
    } else {
        setModels([]);
    }
  }, [config]); // Relying on config object reference or values change

  const handleSaveProfiles = (newProfiles: ApiProfile[], newActiveId: string | null) => {
    setProfiles(newProfiles);
    setActiveProfileId(newActiveId);
    
    localStorage.setItem('chat_profiles', JSON.stringify(newProfiles));
    if (newActiveId) {
        localStorage.setItem('chat_active_profile_id', newActiveId);
    } else {
        localStorage.removeItem('chat_active_profile_id');
    }

    const active = newProfiles.find(p => p.id === newActiveId);
    if (active) {
        // Update config to trigger refetch
        setConfig({ baseUrl: active.baseUrl, apiKey: active.apiKey });
    } else {
        setConfig({ baseUrl: '', apiKey: '' });
    }
  };

  const handleSaveModel = (updatedModel: Model) => {
    // Update local state
    const newModels = models.map(m => m.id === updatedModel.id ? updatedModel : m);
    setModels(newModels);
    setEditingModel(null);

    // Save customizations to localStorage
    const customizations = JSON.parse(localStorage.getItem('chat_custom_models') || '{}');
    customizations[updatedModel.id] = {
      name: updatedModel.name,
      group: updatedModel.group,
      capabilities: updatedModel.capabilities
    };
    localStorage.setItem('chat_custom_models', JSON.stringify(customizations));
  };

  const handleSendMessage = async (content: string, images?: string[]) => {
    if (!selectedModelId) return;

    const newUserMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content,
      images, // pass images
      timestamp: Date.now()
    };

    const newMessages = [...messages, newUserMsg];
    setMessages(newMessages);
    setIsLoading(true);

    // Placeholder for AI response
    const assistantMsgId = uuidv4();
    const placeholderMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now()
    };
    setMessages([...newMessages, placeholderMsg]);

    try {
      await sendChat(
        newMessages.filter(m => m.id !== assistantMsgId), // Don't send the empty placeholder
        selectedModelId,
        config,
        (streamedContent) => {
          setMessages(prev => prev.map(m => 
            m.id === assistantMsgId 
              ? { ...m, content: streamedContent }
              : m
          ));
        }
      );
    } catch (error) {
      setMessages(prev => prev.map(m => 
        m.id === assistantMsgId 
          ? { ...m, content: 'Error: Failed to generate response.' }
          : m
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const currentModel = models.find(m => m.id === selectedModelId) || null;

  return (
    <main className="flex h-screen w-full overflow-hidden bg-white text-gray-900 dark:bg-gray-900 dark:text-white">
      <Sidebar
        models={models}
        selectedModelId={selectedModelId}
        onSelectModel={setSelectedModelId}
        onEditModel={setEditingModel}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      
      <div className="flex-1 flex flex-col h-full min-w-0">
        <ChatInterface
          messages={messages}
          currentModel={currentModel}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        profiles={profiles}
        currentProfileId={activeProfileId}
        onSaveProfiles={handleSaveProfiles}
      />

      <ModelConfigModal
        isOpen={!!editingModel}
        onClose={() => setEditingModel(null)}
        model={editingModel}
        onSave={handleSaveModel}
      />
    </main>
  );
}
