import './AIAssistant.css';
import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your LiquorPOS AI Assistant. I can help you with:\n\n• Product information and features\n• Pricing and plans\n• Technical questions\n• Store operations\n• Compliance requirements\n\nWhat would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Knowledge base (ContextIQ-style RAG simulation)
  const knowledgeBase = {
    pricing: {
      keywords: ['price', 'cost', 'pricing', 'how much', 'fee', 'payment', 'subscription'],
      response: "LiquorPOS pricing is simple and transparent:\n\n💰 **Starter Plan**: $249/month\n• 1 store, 1 register\n• All core features included\n• Email support\n\n💰 **Growth Plan**: $399/month\n• 2-5 stores, 5 registers\n• Multi-location management\n• Phone support\n\n✅ **What's included**: Offline mode, age verification, omnichannel, compliance, real-time reporting\n\n❌ **What you WON'T pay**: No setup fees, no hidden charges, no long-term contracts\n\nSave $200-300/month compared to competitors!",
    },
    offline: {
      keywords: ['offline', 'internet', 'connection', 'network', 'down', 'outage'],
      response: "✅ **100% Offline Capability**\n\nLiquorPOS works completely offline:\n\n• Process unlimited sales without internet\n• Cash and card payments work\n• All data stored locally\n• Auto-sync when reconnected\n• Zero downtime\n\n**Result**: $0 lost sales during outages. Your store never stops, even when the internet does.",
    },
    compliance: {
      keywords: ['compliance', 'age', 'verification', 'license', 'ttb', 'audit', 'legal', 'regulation'],
      response: "🔒 **Compliance Built-In**\n\nWe take compliance seriously:\n\n• Real-time ID verification\n• TTB compliant from day 1\n• State-specific regulations built-in\n• 7-year audit trail (export in 2 clicks)\n• Automatic updates when laws change\n• Zero liability to you\n\n**Result**: Pass TTB audits with confidence. Your liquor license is safe.",
    },
    inventory: {
      keywords: ['inventory', 'stock', 'reorder', 'sku', 'tracking', 'management'],
      response: "📦 **Smart Inventory Management**\n\nAI-powered inventory that learns YOUR store:\n\n• Real-time sync across all locations\n• Smart reorder suggestions\n• Overstock alerts\n• Stockout prevention\n• Purchase tracking + margin calculator\n\n**Results**:\n• Reduce overstock by 30% = Free up $15K+\n• Reduce stockouts by 60% = Capture lost sales\n• Cut inventory labor by 60% = Save $15K/year",
    },
    omnichannel: {
      keywords: ['omnichannel', 'online', 'ecommerce', 'doordash', 'instacart', 'delivery', 'website'],
      response: "🌐 **Omnichannel from Day One**\n\nSell everywhere at once:\n\n✅ DoorDash integration: $0\n✅ Instacart integration: $0\n✅ Shopify/WooCommerce: $0\n✅ Your own website: Built-in\n✅ All inventory synced in real-time\n\n**Typical results**:\n• $2K/month from DoorDash\n• $1.5K/month from Instacart\n• $3K/month from own website\n= **$78,000/year in NEW revenue**\n\nNo $5K integration fees like competitors charge!",
    },
    switching: {
      keywords: ['switch', 'migration', 'data', 'transfer', 'move', 'change', 'heartland'],
      response: "🔄 **Switching is Easy (3 Days)**\n\n**Day 1**: Data Migration\n• We export from your old POS\n• We import into LiquorPOS\n• You verify (4 hours of your time)\n\n**Day 2**: Training\n• 2-hour team training\n• Practice on demo store\n\n**Day 3**: Go Live\n• Run both systems for 1 day\n• Cut over to LiquorPOS\n• We handle everything\n\n**Zero Risk**: 30-day money-back guarantee. If you're not happier, we'll help you switch back (you won't want to).",
    },
    demo: {
      keywords: ['demo', 'trial', 'test', 'try', 'free', 'preview'],
      response: "🎯 **Get Started Today**\n\nWe offer:\n\n1. **Free 30-Day Trial**\n   • Full access to all features\n   • No credit card required\n   • Cancel anytime\n\n2. **Live Demo**\n   • 30-minute personalized walkthrough\n   • See your specific use case\n   • Ask any questions\n\n3. **Free Migration**\n   • We handle all data export/import\n   • Zero downtime\n   • Full support\n\nReady to start? Email: hello@liquorpos.store",
    },
  };

  const findBestResponse = (userInput: string): string => {
    const lowerInput = userInput.toLowerCase();
    
    // Check each knowledge category
    for (const [, data] of Object.entries(knowledgeBase)) {
      if (data.keywords.some(keyword => lowerInput.includes(keyword))) {
        return data.response;
      }
    }

    // Default response if no match
    return "I'd be happy to help! Here are some topics I can assist with:\n\n• **Pricing & Plans** - How much does it cost?\n• **Offline Mode** - Works without internet?\n• **Compliance** - Age verification & TTB\n• **Inventory** - Smart management features\n• **Omnichannel** - DoorDash, Instacart, etc.\n• **Switching** - How to migrate from your current POS\n• **Demo & Trial** - Try it free for 30 days\n\nYou can also email us directly at: hello@liquorpos.store";
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI thinking time (ContextIQ-style)
    await new Promise(resolve => setTimeout(resolve, 800));

    const response = findBestResponse(input);

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsTyping(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickQuestions = [
    "How much does it cost?",
    "Does it work offline?",
    "How do I switch from Heartland?",
    "What about age verification?",
  ];

  return (
    <>
      {/* Floating Chat Button */}
      <button
        className={`chat-button ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open AI Assistant"
      >
        {isOpen ? '✕' : '💬'}
        {!isOpen && <span className="chat-badge">AI</span>}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <div className="chat-header-content">
              <div className="chat-avatar">🤖</div>
              <div>
                <h3>LiquorPOS AI Assistant</h3>
                <p className="chat-status">
                  <span className="status-dot"></span>
                  Online • Instant answers
                </p>
              </div>
            </div>
          </div>

          <div className="chat-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.role}`}
              >
                {message.role === 'assistant' && (
                  <div className="message-avatar">🤖</div>
                )}
                <div className="message-content">
                  {message.content.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="message assistant">
                <div className="message-avatar">🤖</div>
                <div className="message-content typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {messages.length === 1 && (
            <div className="quick-questions">
              <p className="quick-label">Quick questions:</p>
              {quickQuestions.map((question, i) => (
                <button
                  key={i}
                  className="quick-question"
                  onClick={() => {
                    setInput(question);
                    setTimeout(() => handleSend(), 100);
                  }}
                >
                  {question}
                </button>
              ))}
            </div>
          )}

          <div className="chat-input-container">
            <textarea
              className="chat-input"
              placeholder="Ask me anything about LiquorPOS..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              rows={1}
            />
            <button
              className="send-button"
              onClick={handleSend}
              disabled={!input.trim()}
            >
              ➤
            </button>
          </div>

          <div className="chat-footer">
            <p>Powered by AI • Instant responses • Email: hello@liquorpos.store</p>
          </div>
        </div>
      )}
    </>
  );
};

export default AIAssistant;

