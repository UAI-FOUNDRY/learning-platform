import React, { useState } from 'react';

/**
 * AIAssistantDrawer
 * -------------------------------------------------------------
 * NOTE: As per mentor guidelines, AI features are deferred to a 
 * future phase (PROJECT.md Phase 7 Roadmap) and are NOT enabled 
 * in the active learner workflow yet.
 * 
 * This component is kept as a reference implementation for when 
 * the mentor approves AI integration.
 * -------------------------------------------------------------
 */
export default function AIAssistantDrawer({ isOpen, onClose, contextLesson }) {
  const [messages, setMessages] = useState([
    {
      id: 'msg-1',
      sender: 'ai',
      text: `Hello! I'm your LearnSpace Academic & Coding Assistant preview. I can explain complex formulas, diagnose execution errors, or provide progressive hints for: "${contextLesson?.title || 'Course Lecture'}". How can I assist you?`
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  if (!isOpen) return null;

  const quickPrompts = [
    '💡 Give me a hint for the coding challenge',
    '📖 Summarize this lecture in 3 key takeaways',
    '🔍 Explain how autograd dynamically builds graphs',
    '⚡ Explain why numerical stability needs max logit subtraction'
  ];

  const handleSend = (textToSend) => {
    const query = textToSend || inputText;
    if (!query.trim()) return;

    const userMsg = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: query.trim()
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsThinking(true);

    setTimeout(() => {
      setIsThinking(false);
      let replyText = '';

      if (query.toLowerCase().includes('hint')) {
        replyText = `**Progressive Hint**: Remember that for numerical stability with exponential functions $\\exp(x)$, subtracting $c = \\max(x)$ ensures the largest exponent is $\\exp(0) = 1$. This completely eliminates floating-point overflow into \`inf\`!`;
      } else if (query.toLowerCase().includes('summarize') || query.toLowerCase().includes('takeaway')) {
        replyText = `**Lecture Summary**:
1. PyTorch tensors maintain underlying memory layout in contiguous blocks along dimension strides.
2. Computational graphs are created dynamically on the fly during the forward pass (\`requires_grad=True\`).
3. Calling \`.backward()\` traverses nodes in reverse topological order applying the chain rule of calculus.`;
      } else {
        replyText = `That's an insightful question about ${contextLesson?.title || 'this topic'}! In high-performance deep learning systems, PyTorch combines operators via fused CUDA kernels to eliminate intermediate memory round-trips. Focus on implementing the mathematical formulation cleanly first, then benchmark execution runtime in the integrated console.`;
      }

      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          sender: 'ai',
          text: replyText
        }
      ]);
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end font-sans animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-2xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Body */}
      <div className="relative w-full max-w-md bg-white border-l-2 border-[#B6AA9A] shadow-2xl flex flex-col h-full z-10 animate-slide-right">
        {/* Drawer Header */}
        <div className="p-4 bg-[#211E1A] text-white flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#D92D2D] flex items-center justify-center font-bold text-sm shadow-md">
              AI
            </div>
            <div>
              <h3 className="font-extrabold text-sm leading-none">LearnSpace AI Scholar</h3>
              <p className="text-[10px] text-stone-300 mt-0.5">Contextual Learning & Coding Co-pilot (Preview)</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="p-3 bg-[#EAE3DA]/80 border-b border-[#B6AA9A]/60 space-y-1.5 overflow-x-auto">
          <p className="text-[10px] font-bold text-[#71675D] uppercase tracking-wider">Suggested Questions:</p>
          <div className="flex flex-col gap-1">
            {quickPrompts.map((qp, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(qp.replace(/^[^\w]+/, ''))}
                className="text-left px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#211E1A] hover:bg-white bg-white/70 border border-[#B6AA9A] transition-colors truncate"
              >
                {qp}
              </button>
            ))}
          </div>
        </div>

        {/* Chat History Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#FAF8F5]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-[#211E1A] text-white shadow-xs'
                    : 'bg-white border border-[#B6AA9A] text-[#211E1A] shadow-2xs whitespace-pre-line'
                }`}
              >
                {msg.text}
              </div>
              <span className="text-[9px] text-[#71675D] mt-1 px-1">
                {msg.sender === 'user' ? 'You' : 'AI Assistant'}
              </span>
            </div>
          ))}

          {isThinking && (
            <div className="flex items-center gap-2 text-xs text-[#71675D] p-2 bg-white/60 rounded-xl border border-[#B6AA9A] w-fit">
              <span className="w-2 h-2 rounded-full bg-[#D92D2D] animate-ping" />
              <span>Analyzing academic context...</span>
            </div>
          )}
        </div>

        {/* Chat Input Bar */}
        <div className="p-3 bg-white border-t border-[#B6AA9A]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask anything about this lecture or code..."
              className="flex-1 px-3 py-2 text-xs bg-[#EAE3DA]/40 border border-[#B6AA9A] rounded-xl text-[#211E1A] focus:outline-none focus:border-[#D92D2D]"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isThinking}
              className="p-2 bg-[#D92D2D] hover:bg-[#B91C1C] disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
