import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatProps {
  onAction?: (action: string, data: any) => void;
}

export const AIChat: React.FC<AIChatProps> = ({ onAction }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((state) => state.user);

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem(`chat_history_${user?.id}`);
  };

  useEffect(() => {
    // Load chat history from localStorage
    const savedHistory = localStorage.getItem(`chat_history_${user?.id}`);
    if (savedHistory) {
      setMessages(JSON.parse(savedHistory));
    }
  }, [user?.id]);

  useEffect(() => {
    // Save chat history to localStorage
    localStorage.setItem(`chat_history_${user?.id}`, JSON.stringify(messages));
    
    // Scroll to bottom when messages update
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, user?.id]);

  const fetchDatabaseContext = async () => {
    try {
      // Fetch user's produces
      const { data: produces } = await supabase
        .from('produce')
        .select('*')
        .eq('farmer_id', user?.id);

      // Fetch user's orders
      const { data: orders } = await supabase
        .from('orders')
        .select('*, produce(*), buyer:profiles!orders_buyer_id_fkey(*)')
        .eq('seller_id', user?.id);

      return { produces, orders };
    } catch (error) {
      console.error('Error fetching database context:', error);
      return { produces: [], orders: [] };
    }
  };

  const formatMessagesContext = (messages: Message[]) => {
    return messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent form submission from refreshing the page
    
    if (!input.trim()) return;
    setIsLoading(true);

    try {
      const userMessage: Message = { role: 'user', content: input };
      setMessages(prev => [...prev, userMessage]);
      setInput('');

      // Get database context
      const dbContext = await fetchDatabaseContext();

      // Generate AI response
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      const prompt = `
        You are an AI assistant for a farmer's marketplace platform. Your role is to help farmers manage their produce and operations.
        Maintain context of the entire conversation and refer back to previous interactions when relevant.

        Current context:
        - Farmer: ${user?.name}
        - Current Produce: ${JSON.stringify(dbContext.produces)}
        - Current Orders: ${JSON.stringify(dbContext.orders)}

        STRICT CONVERSATION RULES:
        1. DO NOT show the welcome menu more than once in a conversation
        2. When user wants to add produce:
           - If they provide all details (name, description, quantity, unit, price) in one message:
             * Format the details
             * Ask for confirmation
             * When confirmed, trigger ADD_PRODUCE action
           - If they just say "add produce" or similar:
             * Ask for the details in a clear format
           - If they provide partial details:
             * Ask for the missing details specifically
        3. After executing an action:
           * Confirm the action was successful
           * Ask if they need anything else
        4. Never repeat the welcome menu unless explicitly asked

        ORDER MANAGEMENT RULES:
        1. When user wants to accept/reject orders:
           - Use ACTION: UPDATE_ORDER({"id": "order_id", "status": "accepted"/"rejected"})
           - For accepting pending orders, find orders with status "pending" and trigger the action
        2. When showing orders:
           - Format using the order display format below
           - Highlight pending orders that need attention

        ORDER DISPLAY FORMAT:
        When showing orders, format them like this:
        📦 **Order #[last 6 chars of ID]**
        • Product: [product name]
        • Quantity: [quantity] [unit]
        • Price: ₹[price]
        • Status: [status in uppercase]
        ─────────────────

        PRODUCE ADDITION FORMAT:
        When user confirms, IMMEDIATELY trigger this exact format:
        ACTION: ADD_PRODUCE({"name": "product_name", "description": "product_description", "quantity": number, "unit": "unit_type", "price": number})

        Previous conversation:
        ${formatMessagesContext(messages)}

        Current user message: ${input}

        Respond concisely and stay focused on the current task. Don't repeat the welcome menu unnecessarily.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse and handle actions
      let messageContent = text;
      if (text.includes('ACTION:')) {
        const actionMatch = text.match(/ACTION: (\w+)\((.*)\)/);
        if (actionMatch && onAction) {
          const [_, action, dataStr] = actionMatch;
          try {
            const data = JSON.parse(dataStr);
            await onAction(action, data);
            
            if (action === 'ADD_PRODUCE') {
              messageContent = "✅ Successfully added your produce! Here's what I've added:\n\n" +
                `• Name: ${data.name}\n` +
                `• Description: ${data.description}\n` +
                `• Quantity: ${data.quantity} ${data.unit}\n` +
                `• Price: ₹${data.price}\n\n` +
                "Is there anything else you'd like me to help you with?";
            } else if (action === 'UPDATE_ORDER') {
              messageContent = `✅ Successfully ${data.status} order #${data.id.slice(-6)}!\n\n` +
                "Is there anything else you'd like me to help you with?";
            }
          } catch (e) {
            console.error('Error parsing action data:', e);
            messageContent = "❌ Sorry, I encountered an error. Please try again.";
          }
        }
      }

      const assistantMessage: Message = { 
        role: 'assistant', 
        content: messageContent
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error in chat:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I apologize, but I encountered an error. Please try again." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg border border-gray-200">
      <div className="flex justify-between items-center p-4 bg-white border-b">
        <h2 className="text-lg font-semibold">AI Assistant</h2>
        <button
          onClick={clearChat}
          className="px-3 py-1 text-sm text-red-600 hover:text-red-800 border border-red-600 rounded-md hover:bg-red-50 transition-colors"
        >
          Clear Chat
        </button>
      </div>
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[500px] max-h-[600px]"
      >
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-4">
            <p>👋 Hi! I'm your AI assistant.</p>
            <p className="text-sm mt-2">I can help you manage your produce, orders, and more.</p>
          </div>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3 text-gray-800">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="p-4 bg-white border-t">
        <form onSubmit={handleSend} className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your farm operation..."
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};
