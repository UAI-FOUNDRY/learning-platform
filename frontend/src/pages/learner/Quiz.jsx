import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { learnerService } from '../../services/learnerService';

export default function Quiz() {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(() => learnerService.getQuizById(quizId || 'asm-101'));
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(20 * 60); // 20 minutes
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const loaded = learnerService.getQuizById(quizId || 'asm-101');
    setQuiz(loaded);
    setTimeLeftSeconds((loaded.timeLimitMinutes || 20) * 60);
  }, [quizId]);

  // Timer countdown
  useEffect(() => {
    if (isSubmitted) return;
    const interval = setInterval(() => {
      setTimeLeftSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isSubmitted]);

  const questions = quiz?.questions || [];
  const currentQuestion = questions[currentQuestionIndex] || questions[0];

  const handleSelectOption = (option) => {
    if (isSubmitted) return;
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: option
    }));
  };

  const handleToggleFlag = () => {
    setFlagged(prev => ({
      ...prev,
      [currentQuestion.id]: !prev[currentQuestion.id]
    }));
  };

  const handleSubmitQuiz = () => {
    const evalResult = learnerService.submitQuizAttempt(quiz?.id || 'asm-101', answers);
    setResult(evalResult);
    setIsSubmitted(true);
  };

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in font-sans">
      {/* Quiz Top Bar */}
      <div className="bg-white border-2 border-[#B6AA9A] rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A]">
            Interactive Course Quiz
          </span>
          <h1 className="text-lg font-black text-[#211E1A] mt-1">
            {quiz?.title || 'Concept Mastery Quiz'}
          </h1>
        </div>

        {!isSubmitted && (
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {/* Timer Badge */}
            <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-mono text-xs font-bold ${
              timeLeftSeconds < 180
                ? 'bg-red-100 text-red-900 border-red-300 animate-pulse'
                : 'bg-[#EAE3DA] text-[#211E1A] border-[#B6AA9A]'
            }`}>
              <span>⏱️</span>
              <span>{formatTimer(timeLeftSeconds)}</span>
            </div>

            <button
              type="button"
              onClick={handleSubmitQuiz}
              className="px-4 py-2 bg-[#D92D2D] hover:bg-[#B91C1C] text-white rounded-xl text-xs font-black transition-all shadow-md hover:shadow-lg"
            >
              Submit Assessment
            </button>
          </div>
        )}
      </div>

      {/* ========================================================
          RESULTS / EVALUATION SCREEN
         ======================================================== */}
      {isSubmitted && result ? (
        <div className="space-y-6 animate-scale-in">
          {/* Score Header Card */}
          <div className="bg-white border-2 border-[#B6AA9A] rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-sm">
            <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center text-4xl shadow-md ${
              result.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
            }`}>
              {result.passed ? '🏆' : '⚠️'}
            </div>

            <div>
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                result.passed ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-red-100 text-red-900 border border-red-300'
              }`}>
                {result.passed ? 'Assessment Passed' : 'Passing Score Not Met'}
              </span>
              <h2 className="text-3xl font-black text-[#211E1A] mt-2">
                Score: {result.scorePercent}%
              </h2>
              <p className="text-xs text-[#514940] mt-1">
                You scored <span className="font-bold text-[#211E1A]">{result.earnedPoints}</span> out of <span className="font-bold text-[#211E1A]">{result.totalMarks} points</span> ({result.correctCount} of {result.totalQuestions} questions correct).
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setAnswers({});
                  setIsSubmitted(false);
                  setResult(null);
                  setCurrentQuestionIndex(0);
                  setTimeLeftSeconds((quiz.timeLimitMinutes || 20) * 60);
                }}
                className="px-5 py-2.5 bg-white hover:bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] rounded-xl text-xs font-bold transition-colors"
              >
                ↺ Retake Quiz
              </button>

              <Link
                to="/learner/my-learning"
                className="px-5 py-2.5 bg-[#211E1A] hover:bg-black text-white rounded-xl text-xs font-extrabold transition-colors shadow-2xs"
              >
                Return to My Learning →
              </Link>
            </div>
          </div>

          {/* Question Breakdown Review */}
          <div className="space-y-4">
            <h3 className="text-base font-black text-[#211E1A]">
              Detailed Question Review & Explanations
            </h3>

            {result.breakdown.map((item, idx) => (
              <div
                key={item.questionId || idx}
                className={`p-5 rounded-2xl border-2 shadow-2xs space-y-3 bg-white ${
                  item.isCorrect ? 'border-emerald-300' : 'border-red-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#514940]">
                    Question {idx + 1}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-black ${
                    item.isCorrect ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900'
                  }`}>
                    {item.isCorrect ? '✓ Correct (+Points)' : '✗ Incorrect'}
                  </span>
                </div>

                <p className="text-sm font-bold text-[#211E1A]">
                  {item.prompt}
                </p>

                <div className="space-y-1.5 text-xs">
                  <p className="text-[#514940]">
                    <span className="font-bold">Your Answer: </span>
                    <span className={item.isCorrect ? 'text-emerald-700 font-bold' : 'text-red-700 line-through'}>
                      {item.selected || 'No answer selected'}
                    </span>
                  </p>

                  {!item.isCorrect && (
                    <p className="text-[#514940]">
                      <span className="font-bold">Correct Answer: </span>
                      <span className="text-emerald-700 font-bold">{item.correctAnswer}</span>
                    </p>
                  )}
                </div>

                {item.explanation && (
                  <div className="p-3 bg-[#EAE3DA]/60 border border-[#B6AA9A] rounded-xl text-xs text-[#514940] leading-relaxed">
                    <span className="font-bold text-[#211E1A]">Rationale: </span>
                    {item.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ========================================================
            ACTIVE QUESTION SESSION
           ======================================================== */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Question Card (8 cols) */}
          <div className="lg:col-span-8 bg-white border-2 border-[#B6AA9A] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-[#B6AA9A]/50 pb-3">
              <span className="text-xs font-bold text-[#514940]">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-[#D92D2D]">
                  {currentQuestion?.points || 20} pts
                </span>
                <button
                  type="button"
                  onClick={handleToggleFlag}
                  className={`text-xs font-bold flex items-center gap-1 ${
                    flagged[currentQuestion?.id] ? 'text-amber-700' : 'text-[#71675D] hover:text-[#211E1A]'
                  }`}
                >
                  <span>{flagged[currentQuestion?.id] ? '🚩 Flagged' : '🏳️ Flag'}</span>
                </button>
              </div>
            </div>

            {/* Prompt */}
            <h2 className="text-base sm:text-lg font-black text-[#211E1A] leading-relaxed">
              {currentQuestion?.prompt}
            </h2>

            {/* Options List */}
            <div className="space-y-3">
              {(currentQuestion?.options || []).map((opt, oIdx) => {
                const isSelected = answers[currentQuestion.id] === opt;
                return (
                  <button
                    key={oIdx}
                    type="button"
                    onClick={() => handleSelectOption(opt)}
                    className={`w-full text-left p-4 rounded-2xl border-2 text-xs sm:text-sm font-semibold transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#EAE3DA] border-[#D92D2D] text-[#211E1A] shadow-xs'
                        : 'bg-white border-[#B6AA9A] text-[#514940] hover:border-[#211E1A]'
                    }`}
                  >
                    <span>{opt}</span>
                    <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs ${
                      isSelected
                        ? 'border-[#D92D2D] bg-[#D92D2D] text-white'
                        : 'border-[#B6AA9A] bg-transparent'
                    }`}>
                      {isSelected ? '✓' : ''}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Bottom Nav */}
            <div className="pt-4 border-t border-[#B6AA9A]/50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                disabled={currentQuestionIndex === 0}
                className="px-4 py-2 bg-[#EAE3DA] hover:bg-[#D6D0C8] disabled:opacity-40 text-[#211E1A] rounded-xl text-xs font-bold transition-colors"
              >
                ← Previous
              </button>

              <button
                type="button"
                onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                disabled={currentQuestionIndex === questions.length - 1}
                className="px-5 py-2 bg-[#211E1A] hover:bg-black disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
              >
                Next →
              </button>
            </div>
          </div>

          {/* Right Navigator Panel (4 cols) */}
          <div className="lg:col-span-4 bg-white border-2 border-[#B6AA9A] rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="font-black text-sm text-[#211E1A] border-b border-[#B6AA9A]/50 pb-2">
              Question Navigator
            </h3>

            <div className="grid grid-cols-4 gap-2">
              {questions.map((q, idx) => {
                const isAnswered = answers[q.id] !== undefined;
                const isCurrent = idx === currentQuestionIndex;
                const isFlagged = flagged[q.id];

                return (
                  <button
                    key={q.id || idx}
                    type="button"
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`p-2.5 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center relative ${
                      isCurrent
                        ? 'bg-[#211E1A] text-white shadow-xs scale-105'
                        : isAnswered
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-[#EAE3DA] text-[#514940] hover:text-[#211E1A]'
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isFlagged && (
                      <span className="absolute -top-1 -right-1 text-[10px]">🚩</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-[#B6AA9A]/50 text-[11px] space-y-1 text-[#71675D]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300 inline-block" />
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-[#EAE3DA] inline-block" />
                <span>Unanswered ({questions.length - answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-[#211E1A] inline-block" />
                <span>Current Question</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
