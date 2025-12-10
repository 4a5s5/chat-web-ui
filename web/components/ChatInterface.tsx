import { useEffect, useRef, useState, SetStateAction } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage, ImageGenerationConfig, Model } from '@/lib/types';
import { Send, Image as ImageIcon, X, Download, PlayCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  currentModel: Model | null;
  onSendMessage: (content: string, images?: string[]) => void;
  onRegenerate: () => void;
  isLoading: boolean;
  imageConfig: ImageGenerationConfig;
  onImageConfigChange: (config: ImageGenerationConfig) => void;
  apiBaseUrl?: string; // API base URL for resolving relative image paths
}

export function ChatInterface({ messages, currentModel, onSendMessage, onRegenerate, isLoading, imageConfig, onImageConfigChange, apiBaseUrl }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null); // For full screen preview
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = () => {
    if ((!input.trim() && attachedImages.length === 0) || isLoading) return;
    onSendMessage(input, attachedImages);
    setInput('');
    setAttachedImages([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (window.innerWidth >= 768) {
        handleSend();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            setAttachedImages(prev => [...prev, base64]);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setAttachedImages([...attachedImages, base64]);
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setAttachedImages(attachedImages.filter((_, i) => i !== index));
  };

  const isVisionEnabled = currentModel?.capabilities?.vision;
  const isImageGenEnabled = currentModel?.capabilities?.imageGeneration;
  const [showAdvanced, setShowAdvanced] = useState(false);
  const lastMessage = messages[messages.length - 1];
  const canRegenerate = !isLoading && messages.length > 0 && lastMessage?.role === 'assistant';

  // Image saving helper
  const downloadImage = (src: string) => {
    const link = document.createElement('a');
    link.href = src;
    link.download = `media-${Date.now()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isVideo = (url: string) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    // Check common extensions or simple heuristic
    return lower.match(/\.(mp4|webm|mov|m4v)(\/|\?|$)/) || lower.includes('video');
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50 dark:bg-gray-900 min-w-0 relative">
      {/* Full Screen Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-h-[90vh] max-w-[90vw] flex justify-center">
            <img src={previewImage} alt="Full Preview" className="max-h-[90vh] max-w-full object-contain" />
            <div className="absolute top-4 right-4 flex gap-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  downloadImage(previewImage);
                }}
                className="rounded-full bg-white/20 p-2 text-white hover:bg-white/40 backdrop-blur-sm"
                title="Save Image"
              >
                <Download size={24} />
              </button>
              <button
                onClick={() => setPreviewImage(null)}
                className="rounded-full bg-white/20 p-2 text-white hover:bg-white/40 backdrop-blur-sm"
              >
                <X size={24} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-4 sm:space-y-6">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-gray-500 px-4 text-center">
            <p>选择模型并开始对话...</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[95%] sm:max-w-[85%] rounded-lg p-3 sm:p-4 ${msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-white shadow-sm dark:bg-gray-800 dark:text-gray-100'
                }`}
            >
              {/* Display attached images for user messages */}
              {msg.role === 'user' && msg.images && msg.images.length > 0 && (
                <div className="mb-2 flex gap-2 flex-wrap">
                  {msg.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}`}
                      alt="Upload"
                      onClick={() => setPreviewImage(img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}`)}
                      className="h-24 w-24 sm:h-32 sm:w-auto rounded-md object-cover border border-white/20 cursor-pointer hover:opacity-90 transition-opacity"
                    />
                  ))}
                </div>
              )}

              {/* Message Content */}
              <div className="prose prose-sm dark:prose-invert break-words overflow-hidden max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Handle standard images and "fake" images that are actually videos
                    img: ({ node, ...props }) => {
                      const src = typeof props.src === 'string' ? props.src : '';

                      // Resolve the image URL
                      let resolvedSrc = src;
                      if (src.startsWith('http')) {
                        // Absolute URL - proxy it
                        resolvedSrc = `/api/media?url=${encodeURIComponent(src)}`;
                      } else if (src.startsWith('/') && !src.startsWith('/api/') && !src.startsWith('/data/')) {
                        // Relative path (like /images/xxx) - need to prepend API base URL
                        if (apiBaseUrl) {
                          let baseUrl = apiBaseUrl;
                          // Remove /v1 suffix if present
                          if (baseUrl.endsWith('/v1')) baseUrl = baseUrl.slice(0, -3);
                          if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
                          const fullUrl = `${baseUrl}${src}`;
                          resolvedSrc = `/api/media?url=${encodeURIComponent(fullUrl)}`;
                        }
                      }
                      // else: local paths like /data/xxx.png or data URIs - use as-is

                      // Check if it looks like a video
                      if (isVideo(resolvedSrc)) {
                        return (
                          <div className="my-2 rounded-lg overflow-hidden shadow-md max-w-full">
                            <video
                              src={resolvedSrc}
                              controls
                              className="max-h-80 w-auto max-w-full"
                              preload="metadata"
                            />
                            <div className="bg-gray-100 dark:bg-gray-800 p-2 text-xs text-center text-gray-500 flex justify-center gap-2">
                              <span>Video detected</span>
                              <a href={resolvedSrc} download className="text-blue-600 hover:underline">Download</a>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <img
                          {...props}
                          src={resolvedSrc}
                          onClick={() => setPreviewImage(resolvedSrc)}
                          className="max-h-80 w-auto max-w-full rounded-lg shadow-md my-2 cursor-pointer hover:opacity-90 transition-opacity"
                        />
                      );
                    },
                    // Also intercept links that might be media
                    a: ({ node, ...props }) => {
                      const href = typeof props.href === 'string' ? props.href : '';

                      // Resolve the link URL
                      let resolvedHref = href;
                      if (href.startsWith('http')) {
                        resolvedHref = `/api/media?url=${encodeURIComponent(href)}`;
                      } else if (href.startsWith('/') && !href.startsWith('/api/') && !href.startsWith('/data/')) {
                        if (apiBaseUrl) {
                          let baseUrl = apiBaseUrl;
                          if (baseUrl.endsWith('/v1')) baseUrl = baseUrl.slice(0, -3);
                          if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
                          const fullUrl = `${baseUrl}${href}`;
                          resolvedHref = `/api/media?url=${encodeURIComponent(fullUrl)}`;
                        }
                      }

                      if (isVideo(href)) {
                        return (
                          <span className="inline-flex items-center gap-1 text-blue-600">
                            <PlayCircle size={14} />
                            <a {...props} href={resolvedHref} target="_blank" rel="noopener noreferrer" download>
                              {props.children} (Video)
                            </a>
                          </span>
                        );
                      }
                      return <a {...props} href={resolvedHref} target="_blank" rel="noopener noreferrer" />;
                    }
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-sm">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="border-t bg-white p-2 sm:p-4 dark:border-gray-700 dark:bg-gray-800 shrink-0">

        {/* Regenerate Button (Floating or inline?) - Let's put it above input if available */}
        {canRegenerate && (
          <div className="flex justify-center mb-2">
            <button
              onClick={onRegenerate}
              className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs sm:text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <RefreshCw size={14} />
              重新生成
            </button>
          </div>
        )}

        {/* Image Generation Parameters Panel */}
        {isImageGenEnabled && (
          <div className="mb-3 rounded-lg border border-purple-200 bg-purple-50/50 p-3 dark:border-purple-800 dark:bg-purple-900/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300 flex items-center gap-1">
                🎨 生图参数
              </span>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs text-purple-600 hover:text-purple-800 dark:text-purple-400 flex items-center gap-1"
              >
                {showAdvanced ? '收起' : '展开高级'}
                {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            {/* Size Selector */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <label className="text-xs text-gray-600 dark:text-gray-400 w-16">尺寸:</label>
              <select
                value={imageConfig.size || '1024x1024'}
                onChange={(e) => onImageConfigChange({ ...imageConfig, size: e.target.value })}
                className="flex-1 min-w-[120px] rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="512x512">512×512</option>
                <option value="1024x1024">1024×1024 (1:1)</option>
                <option value="2048x2048">2048×2048 (1:1)</option>
                <option value="1024x768">1024×768 (4:3)</option>
                <option value="768x1024">768×1024 (3:4)</option>
                <option value="1280x720">1280×720 (16:9)</option>
                <option value="720x1280">720×1280 (9:16)</option>
              </select>
            </div>

            {/* Inference Steps Slider */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <label className="text-xs text-gray-600 dark:text-gray-400 w-16">步数:</label>
              <input
                type="range"
                min="1"
                max="50"
                value={imageConfig.num_inference_steps || 9}
                onChange={(e) => onImageConfigChange({ ...imageConfig, num_inference_steps: parseInt(e.target.value) })}
                className="flex-1 min-w-[100px]"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">
                {imageConfig.num_inference_steps || 9}
              </span>
            </div>

            {/* Advanced Options */}
            {showAdvanced && (
              <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-700 space-y-2">
                {/* Negative Prompt */}
                <div className="flex flex-wrap items-start gap-2">
                  <label className="text-xs text-gray-600 dark:text-gray-400 w-16 pt-1">反向提示:</label>
                  <input
                    type="text"
                    value={imageConfig.negative_prompt || ''}
                    onChange={(e) => onImageConfigChange({ ...imageConfig, negative_prompt: e.target.value })}
                    placeholder="不想出现的内容..."
                    className="flex-1 min-w-[150px] rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                {/* Seed */}
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-xs text-gray-600 dark:text-gray-400 w-16">种子:</label>
                  <input
                    type="number"
                    value={imageConfig.seed ?? ''}
                    onChange={(e) => onImageConfigChange({ ...imageConfig, seed: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="随机"
                    className="flex-1 min-w-[100px] rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Image Preview Area */}
        {attachedImages.length > 0 && (
          <div className="mb-2 flex gap-2 overflow-x-auto pb-2">
            {attachedImages.map((img, i) => (
              <div key={i} className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0">
                <img
                  src={img}
                  alt="Preview"
                  className="h-full w-full rounded-md object-cover"
                />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white shadow-sm hover:bg-red-600"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Image Upload Button */}
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageUpload}
              disabled={!isVisionEnabled || isLoading}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className={`flex h-10 w-10 sm:h-10 sm:w-10 cursor-pointer items-center justify-center rounded-md transition-colors ${isVisionEnabled
                ? 'text-gray-500 hover:bg-gray-100 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-gray-700'
                : 'cursor-not-allowed text-gray-300 dark:text-gray-600'
                }`}
              title={isVisionEnabled ? "Upload Image" : "Vision not supported by this model"}
            >
              <ImageIcon size={20} />
            </label>
          </div>

          {/* Text Input */}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={isImageGenEnabled ? "输入图片描述..." : "输入消息..."}
            className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-md border border-gray-300 p-2 text-sm sm:text-base focus:border-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            rows={1}
            disabled={isLoading}
          />

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={isLoading || (!input.trim() && attachedImages.length === 0)}
            className="flex h-10 w-10 sm:h-10 sm:w-10 items-center justify-center rounded-md bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-900"
          >
            <Send size={18} />
          </button>
        </div>
        <div className="mt-1 text-xs text-gray-400 text-center truncate px-2">
          {currentModel ? `${currentModel.name || currentModel.id}` : 'No model selected'}
        </div>
      </div>
    </div>
  );
}
