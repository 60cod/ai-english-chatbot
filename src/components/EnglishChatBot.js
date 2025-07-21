import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, BookOpen, Copy, Check } from 'lucide-react';

const EnglishChatBot = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: "Hello! I'm here to help you practice English conversation. Feel free to talk about anything - work, hobbies, current events, or daily life. I'll help you with grammar and suggest better expressions when needed.",
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedText, setCopiedText] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const analyzeAndRespond = async (userMessage) => {
    // Add retry logic with exponential backoff
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.REACT_APP_CLAUDE_API_KEY,
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 600,
            messages: [
              {
                role: "user",
                content: `Analyze this English message: "${userMessage}"

Return JSON format:
{
  "corrections": ["corrected sentence: reason"],
  "suggestions": ["improved expression"],
  "response": "brief 2-3 line reply with a follow-up question"
}

Rules:
- corrections: show corrected sentence with brief reason
- suggestions: just the improved expression, no extra words
- response: keep short, ask follow-up question
- Use professional but friendly tone`
              }
            ]
          })
        });

        if (response.status === 529) {
          // Server overloaded, wait and retry
          retryCount++;
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            continue;
          } else {
            throw new Error("Server temporarily unavailable");
          }
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        let responseText = data.content[0].text;
        
        // Clean up markdown
        responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        
        const botResponse = JSON.parse(responseText);
        return botResponse;
        
      } catch (parseError) {
        console.log(`Attempt ${retryCount + 1} failed:`, parseError);
        retryCount++;
        
        if (retryCount >= maxRetries) {
          // Fallback to simple pattern-based analysis
          return getSimpleResponse(userMessage);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
  };

  const getSimpleResponse = (message) => {
    const corrections = [];
    const suggestions = [];
    
    // Basic grammar checks
    if (message.match(/\bi am\b/gi) && !message.match(/\bI am\b/)) {
      corrections.push("I am: capitalize personal pronoun 'I'");
    }
    if (message.match(/\bdont\b/gi)) {
      corrections.push("don't: add apostrophe for contractions");
    }
    if (message.match(/\bcant\b/gi)) {
      corrections.push("can't: add apostrophe for contractions");
    }
    if (message.match(/\bwont\b/gi)) {
      corrections.push("won't: add apostrophe for contractions");
    }
    
    // Simple suggestions
    if (message.toLowerCase().includes('very good')) {
      suggestions.push("excellent");
    }
    if (message.toLowerCase().includes('a lot of')) {
      suggestions.push("many");
    }
    
    // Generate simple response
    const responses = [
      "That's interesting! What made you think about this?",
      "I see. How do you usually handle this?",
      "Good point. Could you tell me more?",
      "That makes sense. What's your experience with it?",
      "I understand. How important is this to you?",
      "Interesting perspective. Want to share more details?",
      "That's thoughtful. Have you tried this before?",
      "Makes sense. What would you like to know more about?"
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    return {
      corrections,
      suggestions,
      response: randomResponse
    };
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputText.trim(),
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    const analysis = await analyzeAndRespond(inputText.trim());

    const botMessage = {
      id: Date.now() + 1,
      type: 'bot',
      content: analysis.response,
      corrections: analysis.corrections,
      suggestions: analysis.suggestions,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, botMessage]);
    setIsLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[480px] flex flex-col bg-gray-50 border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="text-blue-600" size={20} />
          <h1 className="text-lg font-semibold text-gray-800">English Practice</h1>
        </div>
        <p className="text-xs text-gray-600 mt-1">Grammar correction and expression suggestions</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-2xl rounded-lg px-4 py-3 ${
              message.type === 'user' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white shadow-sm border'
            }`}>
              <div className="text-sm">{message.content}</div>
              
              {/* Corrections and Suggestions for bot messages */}
              {message.type === 'bot' && (message.corrections?.length > 0 || message.suggestions?.length > 0) && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  {message.corrections?.length > 0 && (
                    <div className="mb-2">
                      <div className="flex items-center gap-1 text-red-600 text-xs font-medium mb-1">
                        <BookOpen size={12} />
                        Grammar Corrections:
                      </div>
                      {message.corrections.map((correction, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-red-600 ml-4 mb-1">
                          <span className="flex-1">• {correction}</span>
                          <button
                            onClick={() => copyToClipboard(correction)}
                            className="flex-shrink-0 p-1 hover:bg-red-50 rounded transition-colors"
                            title="Copy to clipboard"
                          >
                            {copiedText === correction ? (
                              <Check size={12} className="text-red-700" />
                            ) : (
                              <Copy size={12} className="text-red-500 hover:text-red-700" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {message.suggestions?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 text-green-600 text-xs font-medium mb-1">
                        <BookOpen size={12} />
                        Better Expressions:
                      </div>
                      {message.suggestions.map((suggestion, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-green-600 ml-4 mb-1">
                          <span className="flex-1">• {suggestion}</span>
                          <button
                            onClick={() => copyToClipboard(suggestion)}
                            className="flex-shrink-0 p-1 hover:bg-green-50 rounded transition-colors"
                            title="Copy to clipboard"
                          >
                            {copiedText === suggestion ? (
                              <Check size={12} className="text-green-700" />
                            ) : (
                              <Copy size={12} className="text-green-500 hover:text-green-700" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              <div className={`text-xs mt-2 ${
                message.type === 'user' ? 'text-blue-100' : 'text-gray-400'
              }`}>
                {message.timestamp}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white shadow-sm border rounded-lg px-4 py-3">
              <div className="flex items-center gap-2 text-gray-500">
                <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
                <span className="text-sm">Analyzing your message...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t px-4 py-3">
        <div className="flex gap-2">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message in English..."
            className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows="2"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isLoading}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
};

export default EnglishChatBot;