import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage, Model } from '@/lib/types';
import { Send, Image as ImageIcon, X, Download } from 'lucide-react';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  currentModel: Model | null;
  onSendMessage: (content: string, images?: string[]) => void;
  isLoading: boolean;
}

export function ChatInterface({ messages, currentModel, onSendMessage, isLoading }: ChatInterfaceProps) {
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
      handleSend();
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

  // Image saving helper
  const downloadImage = (src: string) => {
      const link = document.createElement('a');
      link.href = src;
      link.download = `image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50 dark:bg-gray-900 min-w-0 relative">
      {/* Full Screen Image Preview Modal */}
      {previewImage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90" onClick={() => setPreviewImage(null)}>
              <div className="relative max-h-[90vh] max-w-[90vw]">
                  <img src={previewImage} alt="Full Preview" className="max-h-[90vh] max-w-[90vw] object-contain" />
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
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-gray-500">
            <p>选择模型并开始对话...</p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[90%] rounded-lg p-4 ${
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
                      className="h-32 w-auto rounded-md object-cover border border-white/20 cursor-pointer hover:opacity-90 transition-opacity"
                    />
                  ))}
                </div>
              )}

              {/* Message Content */}
              <div className="prose prose-sm dark:prose-invert break-words overflow-hidden">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Custom image renderer to ensure external links (like user provided) work
                    img: ({node, ...props}) => {
                        const src = props.src || '';
                        return (
                            <img 
                                {...props} 
                                onClick={() => setPreviewImage(src)}
                                className="max-h-96 w-auto max-w-full rounded-lg shadow-md my-2 cursor-pointer hover:opacity-90 transition-opacity" 
                            />
                        );
                    },
                    // Code block styling could go here
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
             <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
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
      <div className="border-t bg-white p-4 dark:border-gray-700 dark:bg-gray-800 shrink-0">
        {/* Image Preview Area */}
        {attachedImages.length > 0 && (
          <div className="mb-2 flex gap-2 overflow-x-auto pb-2">
            {attachedImages.map((img, i) => (
              <div key={i} className="relative h-20 w-20 shrink-0">
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
              className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-md transition-colors ${
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
            placeholder={isVisionEnabled ? "输入消息 (支持图片)..." : "输入消息..."}
            className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            rows={1}
            disabled={isLoading}
          />

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={isLoading || (!input.trim() && attachedImages.length === 0)}
            className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-900"
          >
            <Send size={18} />
          </button>
        </div>
        <div className="mt-1 text-xs text-gray-400 text-center">
          {currentModel ? `${currentModel.name || currentModel.id} (${isVisionEnabled ? 'Vision' : 'Text'})` : 'No model selected'}
        </div>
      </div>
    </div>
  );
}
