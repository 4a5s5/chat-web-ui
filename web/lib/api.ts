import { AppConfig, ChatMessage, Model } from './types';

export async function fetchModels(config: AppConfig): Promise<Model[]> {
  if (!config.baseUrl || !config.apiKey) return [];

  let url = config.baseUrl;
  if (url.endsWith('/')) url = url.slice(0, -1);
  if (!url.endsWith('/v1')) url += '/v1';
  const targetUrl = `${url}/models`;

  try {
    // Use internal proxy to avoid CORS
    const response = await fetch(`/api/proxy?url=${encodeURIComponent(targetUrl)}`, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching models:', error);
    throw error;
  }
}

async function performSearch(query: string, config: AppConfig): Promise<string> {
    if (!config.searchProvider) return '';
    
    const apiKey = config.searchProvider === 'tavily' ? config.tavilyKey : config.bingKey;
    if (!apiKey) return '';

    try {
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query,
                provider: config.searchProvider,
                apiKey
            })
        });

        if (!response.ok) return '';
        const data = await response.json();
        return data.results || '';
    } catch (e) {
        console.error('Search failed:', e);
        return '';
    }
}

export async function sendChat(
  messages: ChatMessage[],
  modelId: string,
  config: AppConfig,
  onUpdate: (content: string) => void
) {
  let url = config.baseUrl;
  if (url.endsWith('/')) url = url.slice(0, -1);
  if (!url.endsWith('/v1')) url += '/v1';
  const targetUrl = `${url}/chat/completions`;

  // Check for model capability - we need to know if 'networking' is enabled for this model
  // BUT, sendChat doesn't receive the full 'Model' object, only ID. 
  // We rely on the caller to check capability or pass it. 
  // Wait, we can just check localStorage here as a fallback or simpler approach?
  // No, clean way: sendChat should logic internally or caller handles it.
  // Let's hack: read local storage for custom model config to see if networking is enabled.
  // OR better: Assume caller handles context injection?
  // No, user asked for "Networking" feature.
  // Let's modify sendChat to do search if needed.
  // We need to check if 'networking' is active for this modelId.
  
  let apiMessages = [...messages];
  
  // --- Networking Logic ---
  try {
      const savedCustomizations = JSON.parse(localStorage.getItem('chat_custom_models') || '{}');
      const modelConfig = savedCustomizations[modelId];
      
      // Logic: Only search if it's the LAST message and it's from USER
      const lastMsg = messages[messages.length - 1];
      
      if (modelConfig?.capabilities?.networking && lastMsg?.role === 'user') {
          onUpdate('🔍 Searching the web...');
          const searchResults = await performSearch(lastMsg.content, config);
          
          if (searchResults) {
              onUpdate('🔍 Analyzing search results...');
              // Inject search results into a system message or augment the user message
              // Augmenting user message is usually better for context retention
              const augmentedContent = `Context from web search:\n${searchResults}\n\nUser Query: ${lastMsg.content}`;
              
              // Replace the last message content for the API call (not for the UI history)
              apiMessages[apiMessages.length - 1] = {
                  ...lastMsg,
                  content: augmentedContent
              };
          }
      }
  } catch (e) {
      console.error('Networking check failed', e);
  }
  // ------------------------

  // Format messages for OpenAI API
  const formattedMessages = apiMessages.map(msg => {
    if (msg.images && msg.images.length > 0) {
      return {
        role: msg.role,
        content: [
          { type: 'text', text: msg.content },
          ...msg.images.map(img => ({
            type: 'image_url',
            image_url: {
              url: img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}`
            }
          }))
        ]
      };
    }
    return {
      role: msg.role,
      content: msg.content
    };
  });

  try {
    // Use internal proxy to avoid CORS
    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targetUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: {
          model: modelId,
          messages: formattedMessages,
          stream: true,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    if (!response.body) throw new Error('No response body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; 

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;
        
        if (trimmedLine.startsWith('data: ')) {
          const data = trimmedLine.slice(6);
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content || '';
            if (content) {
              fullContent += content;
              onUpdate(fullContent);
            }
          } catch (e) {
            console.warn('Error parsing SSE chunk:', e);
          }
        }
      }
    }
    
    return fullContent;
  } catch (error) {
    console.error('Chat error:', error);
    throw error;
  }
}
