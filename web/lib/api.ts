import { AppConfig, ChatMessage, ImageGenerationConfig, Model } from './types';

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

/**
 * 调用图片生成 API
 * @param prompt 图片描述
 * @param modelId 模型ID
 * @param config API配置
 * @param imageConfig 生图配置参数
 * @returns 生成的图片URL数组 (已通过media proxy代理)
 */
export async function generateImage(
  prompt: string,
  modelId: string,
  config: AppConfig,
  imageConfig?: ImageGenerationConfig
): Promise<string[]> {
  let url = config.baseUrl;
  if (url.endsWith('/')) url = url.slice(0, -1);
  if (!url.endsWith('/v1')) url += '/v1';
  const targetUrl = `${url}/images/generations`;

  // 构建请求体
  const requestBody: Record<string, unknown> = {
    prompt,
    model: modelId,
  };

  // 添加可选参数
  if (imageConfig?.size) {
    requestBody.size = imageConfig.size;
  }
  if (imageConfig?.num_inference_steps !== undefined) {
    requestBody.num_inference_steps = imageConfig.num_inference_steps;
  }
  if (imageConfig?.negative_prompt) {
    requestBody.negative_prompt = imageConfig.negative_prompt;
  }
  if (imageConfig?.width !== undefined) {
    requestBody.width = imageConfig.width;
  }
  if (imageConfig?.height !== undefined) {
    requestBody.height = imageConfig.height;
  }
  if (imageConfig?.seed !== undefined) {
    requestBody.seed = imageConfig.seed;
  }

  try {
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
        body: requestBody,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Image Generation Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Image generation response:', JSON.stringify(data, null, 2));

    // 从响应中提取图片URL
    // OpenAI格式: { data: [{ url: "..." }, ...] }
    // 或者: { data: [{ b64_json: "..." }, ...] }
    const images: string[] = [];
    if (data.data && Array.isArray(data.data)) {
      for (const item of data.data) {
        if (item.url) {
          // 通过 media proxy 代理 URL，这样可以下载并缓存图片
          // 同时解决 CORS 和临时 URL 过期问题
          const proxiedUrl = `/api/media?url=${encodeURIComponent(item.url)}`;
          images.push(proxiedUrl);
        } else if (item.b64_json) {
          // Base64 数据保存到服务器，返回持久化 URL
          try {
            const saveResponse = await fetch('/api/save-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: `data:image/png;base64,${item.b64_json}` })
            });
            if (saveResponse.ok) {
              const saveResult = await saveResponse.json();
              images.push(saveResult.url); // e.g., /data/hash.png
            } else {
              // 如果保存失败，仍然返回 data URI（可能会导致 localStorage 问题）
              console.warn('Failed to save image to server, using data URI');
              images.push(`data:image/png;base64,${item.b64_json}`);
            }
          } catch (saveError) {
            console.error('Error saving image:', saveError);
            images.push(`data:image/png;base64,${item.b64_json}`);
          }
        }
      }
    }

    // 如果没有解析到图片，尝试其他可能的格式
    if (images.length === 0) {
      // 尝试直接从 data 获取 URL（一些 API 可能返回不同格式）
      if (data.url) {
        images.push(`/api/media?url=${encodeURIComponent(data.url)}`);
      } else if (data.image_url) {
        images.push(`/api/media?url=${encodeURIComponent(data.image_url)}`);
      } else if (data.images && Array.isArray(data.images)) {
        for (const imgUrl of data.images) {
          if (typeof imgUrl === 'string') {
            images.push(`/api/media?url=${encodeURIComponent(imgUrl)}`);
          }
        }
      }
    }

    return images;
  } catch (error) {
    console.error('Image generation error:', error);
    throw error;
  }
}
