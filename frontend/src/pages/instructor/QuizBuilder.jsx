import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { mockAssessments } from '../../data/mockAssessments';

export default function QuizBuilder() {
  const [quizTitle, setQuizTitle] = useState('Deep Learning Tensors & Autograd Quiz');
  const [passingScore, setPassingScore] = useState(75);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(25);
  const [attemptsAllowed, setAttemptsAllowed] = useState(3);
  const [questions, setQuestions] = useState([
    {
      id: 'q-1',
      prompt: 'Which component computes mathematical gradients dynamically on backward passes?',
      type: 'Multiple Choice',
      points: 25,
      options: ['torch.autograd', 'torch.nn.Module', 'torch.optim', 'torch.cuda'],
      correctAnswer: 'torch.autograd',
      explanation: 'torch.autograd powers PyTorch reverse-mode automatic differentiation engine.'
    },
    {
      id: 'q-2',
      prompt: 'PyTorch tensors require contiguous memory layout when applying views or reshaping.',
      type: 'True/False',
      points: 25,
      options: ['True', 'False'],
      correctAnswer: 'True',
      explanation: 'Calling .view() on sliced non-contiguous tensors requires calling .contiguous() first.'
    }
  ]);

  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const currentQ = questions[activeQuestionIndex] || questions[0];

  const handleUpdateQuestion = (field, value) => {
    setQuestions(prev => prev.map((q, idx) => {
      if (idx === activeQuestionIndex) {
        return { ...q, [field]: value };
      }
      return q;
    }));
  };

  const handleAddOption = () => {
    if (!currentQ) return;
    const currentOptions = currentQ.options || [];
    const newOptions = [...currentOptions, `Option ${currentOptions.length + 1}`];
    handleUpdateQuestion('options', newOptions);
  };

  const handleRemoveOption = (oIdx) => {
    if (!currentQ || (currentQ.options || []).length <= 2) {
      alert('A question must have at least 2 options.');
      return;
    }
    const newOptions = currentQ.options.filter((_, i) => i !== oIdx);
    handleUpdateQuestion('options', newOptions);
  };

  const handleAddNewQuestion = () => {
    const newQ = {
      id: `q-${Date.now().toString().slice(-4)}`,
      prompt: 'New Question Prompt...',
      type: 'Multiple Choice',
      points: 25,
      options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
      correctAnswer: 'Option 1',
      explanation: 'Explanation for correct answer rationale.'
    };
    setQuestions(prev => [...prev, newQ]);
    setActiveQuestionIndex(questions.length);
  };

  const handleDeleteCurrentQuestion = () => {
    if (questions.length <= 1) {
      alert('A quiz must contain at least 1 question.');
      return;
    }
    const filtered = questions.filter((_, i) => i !== activeQuestionIndex);
    setQuestions(filtered);
    setActiveQuestionIndex(Math.max(0, activeQuestionIndex - 1));
  };

  const handleSaveQuiz = (e) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const totalPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in font-sans">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#B6AA9A]/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#EAE3DA] text-[#D92D2D] border border-[#B6AA9A]">
              Assessment Studio
            </span>
            <span className="text-xs text-[#71675D]">
              Author interactive multiple-choice, true/false & scenario assessments
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#211E1A] tracking-tight mt-1">
            Quiz & Test Question Authoring
          </h1>
        </div>

        <button
          type="button"
          onClick={handleSaveQuiz}
          className="px-6 py-2.5 bg-[#D92D2D] hover:bg-[#B91C1C] text-white font-extrabold text-xs rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2"
        >
          <span>Save Quiz Specifications</span>
          <span>✓</span>
        </button>
      </div>

      {/* Quiz Configuration Settings Bar */}
      <div className="bg-white border-2 border-[#B6AA9A] rounded-3xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-black text-[#211E1A] uppercase tracking-wider border-b border-[#B6AA9A]/50 pb-2">
          Global Quiz Parameters
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="q-title" className="block text-xs font-bold text-[#211E1A] mb-1">
              Assessment Title
            </label>
            <input
              id="q-title"
              type="text"
              value={quizTitle}
              onChange={(e) => setQuizTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] font-bold focus:outline-none focus:border-[#D92D2D]"
            />
          </div>

          <div>
            <label htmlFor="q-pass" className="block text-xs font-bold text-[#211E1A] mb-1">
              Passing Threshold (%)
            </label>
            <input
              id="q-pass"
              type="number"
              min="40"
              max="100"
              value={passingScore}
              onChange={(e) => setPassingScore(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] focus:outline-none focus:border-[#D92D2D]"
            />
          </div>

          <div>
            <label htmlFor="q-time" className="block text-xs font-bold text-[#211E1A] mb-1">
              Time Limit (Minutes)
            </label>
            <input
              id="q-time"
              type="number"
              min="5"
              max="180"
              value={timeLimitMinutes}
              onChange={(e) => setTimeLimitMinutes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] focus:outline-none focus:border-[#D92D2D]"
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-[#514940] pt-1 font-semibold">
          <span>Total Questions: <strong className="text-[#211E1A]">{questions.length}</strong></span>
          <span>Cumulative Points: <strong className="text-[#D92D2D]">{totalPoints} pts</strong></span>
          <span>Max Student Attempts: <strong className="text-[#211E1A]">{attemptsAllowed} attempts</strong></span>
        </div>
      </div>

      {/* Main 2-Col Question Authoring Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Question Navigator (4 cols) */}
        <div className="lg:col-span-4 bg-white border-2 border-[#B6AA9A] rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#B6AA9A]/50 pb-2">
            <h3 className="font-black text-xs uppercase tracking-wider text-[#211E1A]">
              Questions List ({questions.length})
            </h3>
            <button
              type="button"
              onClick={handleAddNewQuestion}
              className="px-2.5 py-1 bg-[#211E1A] hover:bg-black text-white text-[11px] font-bold rounded-lg transition-colors shadow-2xs"
            >
              + Add Question
            </button>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {questions.map((q, idx) => (
              <button
                key={q.id || idx}
                type="button"
                onClick={() => setActiveQuestionIndex(idx)}
                className={`w-full text-left p-3 rounded-2xl border text-xs transition-all flex items-start gap-2.5 ${
                  idx === activeQuestionIndex
                    ? 'bg-[#211E1A] text-white border-[#211E1A] shadow-xs'
                    : 'bg-[#EAE3DA]/50 border-[#B6AA9A] text-[#514940] hover:bg-[#EAE3DA] hover:text-[#211E1A]'
                }`}
              >
                <span className="font-bold text-xs shrink-0">Q{idx + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold truncate text-xs">{q.prompt}</p>
                  <p className="text-[10px] opacity-75 mt-0.5">{q.type} • {q.points} pts</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Question Editor (8 cols) */}
        {currentQ && (
          <div className="lg:col-span-8 bg-white border-2 border-[#B6AA9A] rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-[#B6AA9A]/50 pb-3">
              <span className="text-xs font-black text-[#211E1A]">
                Editing Question {activeQuestionIndex + 1} of {questions.length}
              </span>
              <button
                type="button"
                onClick={handleDeleteCurrentQuestion}
                className="text-xs font-bold text-red-700 hover:underline"
              >
                Delete This Question
              </button>
            </div>

            {/* Prompt */}
            <div>
              <label htmlFor="q-prompt" className="block text-xs font-bold text-[#211E1A] mb-1">
                Question Statement / Prompt <span className="text-[#D92D2D]">*</span>
              </label>
              <textarea
                id="q-prompt"
                value={currentQ.prompt}
                onChange={(e) => handleUpdateQuestion('prompt', e.target.value)}
                rows={3}
                className="w-full p-3 text-xs bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] font-semibold focus:outline-none focus:border-[#D92D2D]"
              />
            </div>

            {/* Question Type & Points */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="q-type" className="block text-xs font-bold text-[#211E1A] mb-1">
                  Question Format
                </label>
                <select
                  id="q-type"
                  value={currentQ.type}
                  onChange={(e) => handleUpdateQuestion('type', e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] font-bold focus:outline-none focus:border-[#D92D2D]"
                >
                  <option value="Multiple Choice">Multiple Choice (Single Answer)</option>
                  <option value="True/False">True / False</option>
                  <option value="Multiple Select">Multiple Select</option>
                </select>
              </div>

              <div>
                <label htmlFor="q-pts" className="block text-xs font-bold text-[#211E1A] mb-1">
                  Marks Allocation
                </label>
                <input
                  id="q-pts"
                  type="number"
                  min="5"
                  max="100"
                  value={currentQ.points}
                  onChange={(e) => handleUpdateQuestion('points', e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] focus:outline-none focus:border-[#D92D2D]"
                />
              </div>
            </div>

            {/* Options List */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#211E1A]">Answer Options & Correct Key</span>
                {currentQ.type !== 'True/False' && (
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="text-xs font-bold text-[#D92D2D] hover:underline"
                  >
                    + Add Option Choice
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {(currentQ.options || []).map((opt, oIdx) => {
                  const isCorrect = currentQ.correctAnswer === opt;
                  return (
                    <div
                      key={oIdx}
                      className="flex items-center gap-2 p-2 bg-[#EAE3DA]/40 border border-[#B6AA9A] rounded-xl"
                    >
                      <button
                        type="button"
                        onClick={() => handleUpdateQuestion('correctAnswer', opt)}
                        className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs shrink-0 transition-colors ${
                          isCorrect
                            ? 'bg-emerald-600 border-emerald-600 text-white font-bold'
                            : 'bg-white border-[#B6AA9A] text-transparent hover:border-[#D92D2D]'
                        }`}
                        title="Mark as correct answer"
                      >
                        ✓
                      </button>

                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...currentQ.options];
                          newOpts[oIdx] = e.target.value;
                          handleUpdateQuestion('options', newOpts);
                          if (isCorrect) {
                            handleUpdateQuestion('correctAnswer', e.target.value);
                          }
                        }}
                        className="flex-1 px-3 py-1.5 text-xs bg-white border border-[#B6AA9A] rounded-lg text-[#211E1A] focus:outline-none focus:border-[#D92D2D]"
                      />

                      {currentQ.type !== 'True/False' && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(oIdx)}
                          className="text-[#71675D] hover:text-[#D92D2D] px-2 text-xs font-bold"
                          title="Delete option"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Explanation */}
            <div>
              <label htmlFor="q-expl" className="block text-xs font-bold text-[#211E1A] mb-1">
                Explanation for Student Review
              </label>
              <textarea
                id="q-expl"
                value={currentQ.explanation || ''}
                onChange={(e) => handleUpdateQuestion('explanation', e.target.value)}
                placeholder="Explain why the chosen option is correct for student post-assessment review..."
                rows={2}
                className="w-full p-2.5 text-xs bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] focus:outline-none focus:border-[#D92D2D]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Success Notification */}
      {saveSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#211E1A] text-white border-2 border-emerald-500 rounded-2xl p-4 shadow-2xl flex items-center gap-3 animate-slide-up">
          <span className="text-2xl">✓</span>
          <div>
            <p className="font-extrabold text-xs">Quiz Specifications Saved!</p>
            <p className="text-[10px] text-stone-300">Assessment ready for enrollment linking.</p>
          </div>
        </div>
      )}
    </div>
  );
}
