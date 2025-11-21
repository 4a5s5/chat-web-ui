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

  // Format messages for OpenAI API
  const apiMessages = messages.map(msg => {
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
          messages: apiMessages,
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
      // The last item in the array is either an empty string (if chunk ended with \n)
      // or an incomplete line. We keep it in the buffer for the next iteration.
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
            // Only log if it's not a known end-stream marker or harmless error
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
