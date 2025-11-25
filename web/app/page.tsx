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
          const fullContent = await sendChat(
              messagesAfterUser, 
              selectedModelId, 
              config, 
              (chunk) => {
                  setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: chunk } : m));
              },
              (searchResults) => {
                  // Update the placeholder message with search results immediately when available
                  setMessages(prev => prev.map(m => 
                      m.id === assistantId ? { ...m, searchResults: searchResults } : m
                  ));
              }
          );
          
          // Final Save
          setMessages(current => {
              // We need to find the message in current state to preserve searchResults if any
              const currentMsg = current.find(m => m.id === assistantId);
              const finalMsg = { 
                  ...placeholder, 
                  content: fullContent,
                  searchResults: currentMsg?.searchResults // Preserve results
              };
              
              const finalMessages = [...messagesAfterUser, finalMsg];
              updateCurrentSession(finalMessages, selectedModelId);
              return finalMessages;
          });
          
      } catch (err) {
          const errorMsg = { ...placeholder, content: 'Error: Failed to generate.' };
          setMessages([...messagesAfterUser, errorMsg]);
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
          const fullContent = await sendChat(
              messagesToKeep, 
              selectedModelId, 
              config, 
              (chunk) => {
                  setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: chunk } : m));
              },
              (searchResults) => {
                  setMessages(prev => prev.map(m => 
                      m.id === assistantId ? { ...m, searchResults: searchResults } : m
                  ));
              }
          );
          
          setMessages(current => {
              const currentMsg = current.find(m => m.id === assistantId);
              const finalMsg = { 
                  ...placeholder, 
                  content: fullContent,
                  searchResults: currentMsg?.searchResults
              };
              const finalMessages = [...messagesToKeep, finalMsg];
              updateCurrentSession(finalMessages, selectedModelId);
              return finalMessages;
          });

      } catch (err) {
          // Error
      } finally {
          setIsLoading(false);
      }
  };
