'use client';

import { useState, useEffect, useRef } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ChatInterface } from '@/components/ChatInterface';
import { SettingsModal } from '@/components/SettingsModal';
import { ModelConfigModal } from '@/components/ModelConfigModal';
import { ApiProfile, AppConfig, ChatMessage, ChatSession, Model } from '@/lib/types';
import { fetchModels, sendChat } from '@/lib/api';
import { v4 as uuidv4 } from 'uuid';
import { Menu } from 'lucide-react';

export default function Home() {
  // State
  const [config, setConfig] = useState<AppConfig>({ apiKey: '', baseUrl: '' });
  const [profiles, setProfiles] = useState<ApiProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Session State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]); // Derived from current session, but kept for immediate UI updates

  // Mobile sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Load initial state
  useEffect(() => {
    // Load profiles
    const savedProfiles = localStorage.getItem('chat_profiles');
    const savedActiveId = localStorage.getItem('chat_active_profile_id');
    const savedLegacyConfig = localStorage.getItem('chat_config');

    let initialProfiles: ApiProfile[] = [];
    let initialActiveId: string | null = null;

    if (savedProfiles) {
        try {
            initialProfiles = JSON.parse(savedProfiles);
            initialActiveId = savedActiveId;
        } catch (e) { console.error(e); }
    }
    
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
                localStorage.setItem('chat_profiles', JSON.stringify(initialProfiles));
                localStorage.setItem('chat_active_profile_id', newId);
            }
        } catch (e) { console.error(e); }
    }

    setProfiles(initialProfiles);
    setActiveProfileId(initialActiveId);
    
    const active = initialProfiles.find(p => p.id === initialActiveId);
    if (active) {
        setConfig({ baseUrl: active.baseUrl, apiKey: active.apiKey });
    }

    // Load Sessions
    const savedSessions = localStorage.getItem('chat_sessions');
    if (savedSessions) {
        try {
            const parsedSessions: ChatSession[] = JSON.parse(savedSessions);
            setSessions(parsedSessions);
            // Optionally restore last session
            const lastSessionId = localStorage.getItem('chat_current_session_id');
            if (lastSessionId && parsedSessions.some(s => s.id === lastSessionId)) {
                setCurrentSessionId(lastSessionId);
            }
        } catch (e) { console.error(e); }
    }
  }, []);

  // Sync messages with current session when session changes
  useEffect(() => {
      if (currentSessionId) {
          const session = sessions.find(s => s.id === currentSessionId);
          if (session) {
              setMessages(session.messages);
              if (session.modelId) {
                  // Only update model if we have the list available, otherwise it might be a ghost selection
                  // But we should try to respect the session's model choice
                  setSelectedModelId(session.modelId);
              }
              localStorage.setItem('chat_current_session_id', currentSessionId);
          }
      } else {
          setMessages([]);
          localStorage.removeItem('chat_current_session_id');
      }
  }, [currentSessionId, sessions]); // Only strictly depend on ID change or sessions array update

  // Fetch models
  useEffect(() => {
    if (config.apiKey && config.baseUrl) {
      const savedCustomizations = JSON.parse(localStorage.getItem('chat_custom_models') || '{}');
      
      fetchModels(config)
        .then(fetchedModels => {
          const mergedModels = fetchedModels.map(m => {
            const saved = savedCustomizations[m.id];
            if (saved) return { ...m, ...saved };
            return m;
          });
          setModels(mergedModels);
          
          // Auto-select first if none selected and NO session is active
          // If session is active, we preserve its model ID (handled in session effect)
          // But if current selectedModelId is invalid in new list, fallback.
          if (!currentSessionId && !selectedModelId && mergedModels.length > 0) {
            setSelectedModelId(mergedModels[0].id);
          }
        })
        .catch(err => {
            console.error(err);
            setModels([]);
        });
    } else {
        setModels([]);
    }
  }, [config]);

  // Save sessions helper
  const saveSessions = (newSessions: ChatSession[]) => {
      setSessions(newSessions);
      localStorage.setItem('chat_sessions', JSON.stringify(newSessions));
  };

  const updateCurrentSession = (newMessages: ChatMessage[], modelId?: string) => {
      if (!currentSessionId) {
          // If no session exists but we have messages, CREATE one immediately
          // This happens on first send of a "New Chat"
          const newSessionId = uuidv4();
          const firstUserMsg = newMessages.find(m => m.role === 'user')?.content || 'New Chat';
          const title = firstUserMsg.slice(0, 30) + (firstUserMsg.length > 30 ? '...' : '');
          
          const newSession: ChatSession = {
              id: newSessionId,
              title,
              messages: newMessages,
              modelId: modelId || selectedModelId || '',
              updatedAt: Date.now()
          };
          
          saveSessions([newSession, ...sessions]);
          setCurrentSessionId(newSessionId);
      } else {
          // Update existing
          const updatedSessions = sessions.map(s => {
              if (s.id === currentSessionId) {
                  return {
                      ...s,
                      messages: newMessages,
                      modelId: modelId || s.modelId, // Update model if changed?
                      updatedAt: Date.now(),
                      // Update title if it was default 'New Chat' and we have content now
                      title: (s.messages.length === 0 && newMessages.length > 0) 
                        ? (newMessages[0].content.slice(0, 30) + (newMessages[0].content.length > 30 ? '...' : '')) 
                        : s.title
                  };
              }
              return s;
          });
          // Sort by latest? usually yes.
          const sorted = updatedSessions.sort((a, b) => b.updatedAt - a.updatedAt);
          saveSessions(sorted);
      }
  };

  const handleNewChat = () => {
      setCurrentSessionId(null);
      setMessages([]);
      // Keep selected model
  };

  const handleDeleteSession = (id: string) => {
      const newSessions = sessions.filter(s => s.id !== id);
      saveSessions(newSessions);
      if (currentSessionId === id) {
          setCurrentSessionId(null);
          setMessages([]);
      }
  };

  const handleSendMessage = async (content: string, images?: string[]) => {
    if (!selectedModelId) return;

    const newUserMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content,
      images,
      timestamp: Date.now()
    };

    const newMessages = [...messages, newUserMsg];
    // Immediate state update for UI
    setMessages(newMessages); 
    // Persist to session
    updateCurrentSession(newMessages, selectedModelId);

    setIsLoading(true);

    const assistantMsgId = uuidv4();
    const placeholderMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now()
    };
    
    // Add placeholder
    const messagesWithPlaceholder = [...newMessages, placeholderMsg];
    setMessages(messagesWithPlaceholder);
    
    // NOTE: We do NOT save the empty placeholder to session yet, 
    // or we can, but usually we wait for some content. 
    // Let's NOT save placeholder to session storage to avoid empty glitchy sessions if reload.
    
    try {
      await sendChat(
        newMessages, 
        selectedModelId,
        config,
        (streamedContent) => {
          setMessages(prev => {
              const updated = prev.map(m => 
                m.id === assistantMsgId ? { ...m, content: streamedContent } : m
              );
              return updated;
          });
          // Optimistically update session storage occasionally? 
          // For performance, maybe only on completion.
        }
      );
      
      // On completion, save final state
      setMessages(current => {
          // 'current' here has the fully streamed content ideally, but React state updates might be batched.
          // The safest way is to read the latest state. 
          // Actually, 'streamedContent' callback closure issue:
          // We rely on the fact that `sendChat` finishes.
          // Let's re-read the latest messages from state in a timeout or assume the last update was correct?
          // Better: The onUpdate updates state. After await sendChat, we need the final content.
          // `sendChat` returns fullContent.
          return current;
      });
      
    } catch (error) {
       // Error handling...
    } finally {
      // Need to capture the final state of messages including the assistant response to save it
      // Since sendChat returns the full content, we can reconstruct
      // But we need the ID.
      setIsLoading(false);
    }
  };

  // Improved Send Handler to properly save completed message
  const handleSendMessageWrapper = async (content: string, images?: string[]) => {
      if (!selectedModelId) return;
      
      const newUserMsg: ChatMessage = {
          id: uuidv4(),
          role: 'user',
          content,
          images,
          timestamp: Date.now()
      };
      
      const messagesAfterUser = [...messages, newUserMsg];
      setMessages(messagesAfterUser);
      updateCurrentSession(messagesAfterUser, selectedModelId); // Save user msg
      
      setIsLoading(true);
      const assistantId = uuidv4();
      const placeholder: ChatMessage = { id: assistantId, role: 'assistant', content: '', timestamp: Date.now() };
      
      setMessages([...messagesAfterUser, placeholder]);

      try {
          const fullContent = await sendChat(messagesAfterUser, selectedModelId, config, (chunk) => {
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: chunk } : m));
          });
          
          // Final Save
          const finalMessages = [...messagesAfterUser, { ...placeholder, content: fullContent }];
          setMessages(finalMessages);
          updateCurrentSession(finalMessages, selectedModelId);
          
      } catch (err) {
          const errorMsg = { ...placeholder, content: 'Error: Failed to generate.' };
          setMessages([...messagesAfterUser, errorMsg]);
          // Don't save error sessions? Or do?
      } finally {
          setIsLoading(false);
      }
  };

  const handleRegenerateWrapper = async () => {
      if (isLoading || messages.length === 0 || !selectedModelId) return;
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role !== 'assistant') return;

      const messagesToKeep = messages.slice(0, -1);
      setMessages(messagesToKeep);
      updateCurrentSession(messagesToKeep, selectedModelId); // Save state before regen

      setIsLoading(true);
      const assistantId = uuidv4();
      const placeholder: ChatMessage = { id: assistantId, role: 'assistant', content: '', timestamp: Date.now() };
      setMessages([...messagesToKeep, placeholder]);

      try {
          const fullContent = await sendChat(messagesToKeep, selectedModelId, config, (chunk) => {
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: chunk } : m));
          });
          
          const finalMessages = [...messagesToKeep, { ...placeholder, content: fullContent }];
          setMessages(finalMessages);
          updateCurrentSession(finalMessages, selectedModelId);

      } catch (err) {
          // Error
      } finally {
          setIsLoading(false);
      }
  };

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

  const currentModel = models.find(m => m.id === selectedModelId) || null;

  return (
    <main className="flex h-screen w-full overflow-hidden bg-white text-gray-900 dark:bg-gray-900 dark:text-white">
      {/* Mobile Header Trigger */}
      <div className="md:hidden fixed top-4 left-4 z-30">
        <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 bg-white dark:bg-gray-800 rounded-md shadow-md"
        >
            <Menu size={24} />
        </button>
      </div>

      <Sidebar
        models={models}
        selectedModelId={selectedModelId}
        onSelectModel={setSelectedModelId}
        onEditModel={setEditingModel}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
        // Session props
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={setCurrentSessionId}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
      />
      
      <div className="flex-1 flex flex-col h-full min-w-0">
        <ChatInterface
          messages={messages}
          currentModel={currentModel}
          onSendMessage={handleSendMessageWrapper}
          onRegenerate={handleRegenerateWrapper}
          isLoading={isLoading}
        />
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        profiles={profiles}
        currentProfileId={activeProfileId}
        onSaveProfiles={handleSaveProfiles}
        config={config}
        onSaveConfig={setConfig}
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
