import React, { useState } from 'react';

export default function PracticeTestModal({ isOpen, onClose }) {
  const [mode, setMode] = useState('timed'); // 'timed' or 'untimed'
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const sampleQuestions = [
    {
      id: 'pt-1',
      topic: 'Tensor Strides & Layouts',
      prompt: 'When a tensor is sliced with non-unit step strides, which method restores memory contiguity?',
      options: ['.contiguous()', '.clone()', '.detach()', '.stride_sync()'],
      correct: '.contiguous()'
    },
    {
      id: 'pt-2',
      topic: 'Gradient Accumulation',
      prompt: 'What command must be called on optimizers before computing backwards gradients to avoid accumulation across batches?',
      options: ['optimizer.zero_grad()', 'optimizer.step()', 'optimizer.reset()', 'torch.cuda.empty_cache()'],
      correct: 'optimizer.zero_grad()'
    },
    {
      id: 'pt-3',
      topic: 'Loss Function Stability',
      prompt: 'CrossEntropyLoss in PyTorch mathematically combines which two sequential operations?',
      options: ['LogSoftmax + NLLLoss', 'Softmax + MSELoss', 'Sigmoid + BCELoss', 'ReLU + HuberLoss'],
      correct: 'LogSoftmax + NLLLoss'
    }
  ];

  const currentQ = sampleQuestions[currentIdx];

  const handleSelect = (opt) => {
    setSelectedAnswers(prev => ({ ...prev, [currentQ.id]: opt }));
  };

  const handleFinish = () => {
    setSubmitted(true);
  };

  const scoreCount = sampleQuestions.filter(q => selectedAnswers[q.id] === q.correct).length;
  const scorePercent = Math.round((scoreCount / sampleQuestions.length) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in font-sans">
      <div className="bg-white border-2 border-[#B6AA9A] rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-scale-in my-8">
        <div className="flex items-center justify-between border-b border-[#B6AA9A]/50 pb-3">
          <div>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#EAE3DA] text-[#D92D2D] border border-[#B6AA9A]">
              Adaptive Practice Test
            </span>
            <h2 className="text-lg font-black text-[#211E1A] mt-1">
              Diagnostic Knowledge Check
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#71675D] hover:text-[#211E1A] text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {submitted ? (
          <div className="space-y-4 animate-scale-in text-center">
            <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center text-3xl ${
              scorePercent >= 70 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {scorePercent >= 70 ? '🎯' : '📊'}
            </div>

            <div>
              <h3 className="text-2xl font-black text-[#211E1A]">Score: {scorePercent}%</h3>
              <p className="text-xs text-[#514940] mt-0.5">
                {scoreCount} of {sampleQuestions.length} practice problems answered accurately.
              </p>
            </div>

            {/* Weak Topic Detection Breakdown (PROJECT.md §24) */}
            <div className="p-4 bg-[#EAE3DA]/50 rounded-2xl border border-[#B6AA9A] text-left space-y-2 text-xs">
              <h4 className="font-extrabold text-[#211E1A] uppercase tracking-wider text-[10px]">
                Adaptive Topic Diagnostics:
              </h4>

              {sampleQuestions.map(q => {
                const isCorrect = selectedAnswers[q.id] === q.correct;
                return (
                  <div key={q.id} className="flex items-center justify-between">
                    <span className="font-bold text-[#211E1A]">{q.topic}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      isCorrect ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900'
                    }`}>
                      {isCorrect ? 'Mastered' : 'Needs Review'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedAnswers({});
                  setSubmitted(false);
                  setCurrentIdx(0);
                }}
                className="px-4 py-2 bg-white hover:bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] rounded-xl text-xs font-bold"
              >
                Retake Diagnostic
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-[#211E1A] hover:bg-black text-white rounded-xl text-xs font-bold"
              >
                Close Diagnostic
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mode Selector */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 p-1 bg-[#EAE3DA] rounded-xl border border-[#B6AA9A]">
                <button
                  type="button"
                  onClick={() => setMode('timed')}
                  className={`px-2.5 py-1 rounded-lg font-bold ${
                    mode === 'timed' ? 'bg-[#211E1A] text-white' : 'text-[#514940]'
                  }`}
                >
                  Timed (10m)
                </button>
                <button
                  type="button"
                  onClick={() => setMode('untimed')}
                  className={`px-2.5 py-1 rounded-lg font-bold ${
                    mode === 'untimed' ? 'bg-[#211E1A] text-white' : 'text-[#514940]'
                  }`}
                >
                  Untimed Practice
                </button>
              </div>

              <span className="font-mono text-[#71675D]">
                Q{currentIdx + 1} of {sampleQuestions.length}
              </span>
            </div>

            {/* Question Prompt */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-[#D92D2D] uppercase">
                {currentQ.topic}
              </span>
              <p className="text-sm font-black text-[#211E1A]">
                {currentQ.prompt}
              </p>
            </div>

            {/* Options */}
            <div className="space-y-2">
              {currentQ.options.map((opt, i) => {
                const isSelected = selectedAnswers[currentQ.id] === opt;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={`w-full text-left p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#EAE3DA] border-[#D92D2D] text-[#211E1A]'
                        : 'bg-white border-[#B6AA9A] text-[#514940] hover:border-[#211E1A]'
                    }`}
                  >
                    <span>{opt}</span>
                    <span className="text-xs">{isSelected ? '●' : '○'}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                disabled={currentIdx === 0}
                className="px-3 py-1.5 bg-[#EAE3DA] text-xs font-bold rounded-lg disabled:opacity-40"
              >
                Previous
              </button>

              {currentIdx < sampleQuestions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIdx(prev => prev + 1)}
                  className="px-4 py-1.5 bg-[#211E1A] text-white text-xs font-bold rounded-lg"
                >
                  Next Problem →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinish}
                  className="px-4 py-1.5 bg-[#D92D2D] text-white text-xs font-black rounded-lg shadow-sm"
                >
                  Submit Diagnostic Check
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
