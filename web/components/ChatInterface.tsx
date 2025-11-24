import { useEffect, useRef, useState, SetStateAction } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage, Model } from '@/lib/types';
import { Send, Image as ImageIcon, X, Download, PlayCircle, RefreshCw } from 'lucide-react';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  currentModel: Model | null;
  onSendMessage: (content: string, images?: string[]) => void;
  onRegenerate: () => void;
  isLoading: boolean;
}

export function ChatInterface({ messages, currentModel, onSendMessage, onRegenerate, isLoading }: ChatInterfaceProps) {
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
      // On mobile, Enter usually creates a newline, we might want to keep that behavior or not.
      // Typically on desktop Enter sends, Shift+Enter new line.
      // On mobile it's often better to just let the button do the sending to avoid accidental sends.
      // We can check window width or just stick to desktop convention.
      if (window.innerWidth >= 768) {
         handleSend();
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
              className={`max-w-[95%] sm:max-w-[85%] rounded-lg p-3 sm:p-4 ${
                msg.role === 'user'
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
                    img: ({node, ...props}) => {
                        const src = typeof props.src === 'string' ? props.src : '';
                        // Use the media proxy for remote URLs to ensure visibility and caching
                        const proxySrc = src.startsWith('http') 
                            ? `/api/media?url=${encodeURIComponent(src)}` 
                            : src;

                        // Check if it looks like a video
                        if (isVideo(src)) {
                            return (
                                <div className="my-2 rounded-lg overflow-hidden shadow-md max-w-full">
                                    <video 
                                        src={proxySrc} 
                                        controls 
                                        className="max-h-80 w-auto max-w-full"
                                        preload="metadata"
                                    />
                                    <div className="bg-gray-100 dark:bg-gray-800 p-2 text-xs text-center text-gray-500 flex justify-center gap-2">
                                        <span>Video detected</span>
                                        <a href={proxySrc} download className="text-blue-600 hover:underline">Download</a>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <img 
                                {...props} 
                                src={proxySrc}
                                onClick={() => setPreviewImage(proxySrc)}
                                className="max-h-80 w-auto max-w-full rounded-lg shadow-md my-2 cursor-pointer hover:opacity-90 transition-opacity" 
                            />
                        );
                    },
                    // Also intercept links that might be media
                    a: ({node, ...props}) => {
                        const href = typeof props.href === 'string' ? props.href : '';
                        if (isVideo(href)) {
                             const proxySrc = href.startsWith('http') 
                                ? `/api/media?url=${encodeURIComponent(href)}` 
                                : href;
                             return (
                                 <span className="inline-flex items-center gap-1 text-blue-600">
                                     <PlayCircle size={14} />
                                     <a {...props} href={proxySrc} target="_blank" rel="noopener noreferrer">
                                         {props.children} (Video)
                                     </a>
                                 </span>
                             );
                        }
                        return <a {...props} target="_blank" rel="noopener noreferrer" />;
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
              className={`flex h-10 w-10 sm:h-10 sm:w-10 cursor-pointer items-center justify-center rounded-md transition-colors ${
                isVisionEnabled
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
            placeholder={isVisionEnabled ? "输入消息..." : "输入消息..."}
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
