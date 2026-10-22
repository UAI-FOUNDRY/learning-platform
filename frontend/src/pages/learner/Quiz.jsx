import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { learnerService } from '../../services/learnerService';

/**
 * Animated Circular Score Meter
 */
function CircularScore({ percent, size = 96, strokeWidth = 8 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;
  const isPassing = percent >= 85;

  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#EAE3DA"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isPassing ? '#059669' : '#D92D2D'}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-xl font-black text-[#211E1A] leading-none">{percent}%</span>
        <span className="text-[9px] font-bold text-[#71675D] uppercase mt-0.5">
          {isPassing ? 'Passed' : 'Failed'}
        </span>
      </div>
    </div>
  );
}

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
  const [reviewFilter, setReviewFilter] = useState('all'); // 'all', 'correct', 'incorrect'
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

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
    setShowSubmitConfirm(false);
  };

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).length;
  const completionPercentage = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in font-sans">
      {/* Quiz Top Bar */}
      <div className="bg-white border-2 border-[#B6AA9A] rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A]">
              Course Evaluation Assessment
            </span>
            <span className="text-xs text-[#71675D]">
              Passing Standard: 85% Required
            </span>
          </div>
          <h1 className="text-lg font-black text-[#211E1A] mt-1">
            {quiz?.title || 'Concept Mastery Assessment'}
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
              onClick={() => {
                if (answeredCount < questions.length) {
                  setShowSubmitConfirm(true);
                } else {
                  handleSubmitQuiz();
                }
              }}
              className="px-4 py-2 bg-[#D92D2D] hover:bg-[#B91C1C] text-white rounded-xl text-xs font-black transition-all shadow-md hover:scale-102"
            >
              Submit Assessment
            </button>
          </div>
        )}
      </div>

      {/* Progress Strip during Quiz */}
      {!isSubmitted && (
        <div className="bg-white border border-[#B6AA9A] rounded-2xl p-3 shadow-2xs flex items-center justify-between gap-4 text-xs font-bold">
          <div className="flex items-center gap-2">
            <span className="text-[#514940]">Assessment Progress:</span>
            <span className="text-[#211E1A]">{answeredCount} of {questions.length} answered</span>
          </div>

          <div className="flex-1 max-w-xs bg-[#EAE3DA] h-2 rounded-full overflow-hidden border border-[#B6AA9A]/50">
            <div
              className="bg-[#D92D2D] h-full rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>

          <span className="text-[#D92D2D] font-mono">{completionPercentage}%</span>
        </div>
      )}

      {/* ========================================================
          RESULTS / EVALUATION SCREEN
         ======================================================== */}
      {isSubmitted && result ? (
        <div className="space-y-6 animate-scale-in">
          {/* Score Header Card */}
          <div className="bg-white border-2 border-[#B6AA9A] rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-sm">
            <div className="flex justify-center">
              <CircularScore percent={result.scorePercent} />
            </div>

            <div>
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                result.passed ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-red-100 text-red-900 border border-red-300'
              }`}>
                {result.passed ? 'Assessment Passed' : 'Passing Threshold Not Met (85% Needed)'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#211E1A] mt-2">
                Score: {result.scorePercent}%
              </h2>
              <p className="text-xs text-[#514940] mt-1 max-w-md mx-auto">
                You earned <span className="font-bold text-[#211E1A]">{result.earnedPoints}</span> out of <span className="font-bold text-[#211E1A]">{result.totalMarks} points</span> ({result.correctCount} of {result.totalQuestions} questions correct).
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
                ↺ Retake Assessment
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
            <div className="flex items-center justify-between border-b border-[#B6AA9A]/60 pb-3">
              <h3 className="text-base font-black text-[#211E1A]">
                Question-by-Question Diagnostic Review
              </h3>

              {/* Review Filter */}
              <div className="flex items-center gap-1 bg-[#EAE3DA] p-1 rounded-xl border border-[#B6AA9A] text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setReviewFilter('all')}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    reviewFilter === 'all' ? 'bg-white text-[#211E1A] shadow-2xs' : 'text-[#514940]'
                  }`}
                >
                  All ({result.breakdown.length})
                </button>
                <button
                  type="button"
                  onClick={() => setReviewFilter('correct')}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    reviewFilter === 'correct' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-[#514940]'
                  }`}
                >
                  Correct ({result.correctCount})
                </button>
                <button
                  type="button"
                  onClick={() => setReviewFilter('incorrect')}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    reviewFilter === 'incorrect' ? 'bg-white text-red-800 shadow-2xs' : 'text-[#514940]'
                  }`}
                >
                  Incorrect ({result.breakdown.length - result.correctCount})
                </button>
              </div>
            </div>

            {result.breakdown
              .filter(item => {
                if (reviewFilter === 'correct') return item.isCorrect;
                if (reviewFilter === 'incorrect') return !item.isCorrect;
                return true;
              })
              .map((item, idx) => (
                <div
                  key={item.questionId || idx}
                  className={`p-5 rounded-2xl border-2 shadow-2xs space-y-3 bg-white transition-all ${
                    item.isCorrect ? 'border-emerald-300' : 'border-red-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#514940]">
                      Question Review
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                      item.isCorrect ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-red-100 text-red-900 border border-red-300'
                    }`}>
                      {item.isCorrect ? '✓ Correct (+Points)' : '✗ Incorrect'}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-[#211E1A]">
                    {item.prompt}
                  </p>

                  <div className="space-y-1 text-xs">
                    <p className="text-[#514940]">
                      <span className="font-bold">Your Selection: </span>
                      <span className={item.isCorrect ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>
                        {item.selected || 'No answer selected'}
                      </span>
                    </p>

                    {!item.isCorrect && (
                      <p className="text-[#514940]">
                        <span className="font-bold">Standard Correct Key: </span>
                        <span className="text-emerald-700 font-bold">{item.correctAnswer}</span>
                      </p>
                    )}
                  </div>

                  {item.explanation && (
                    <div className="p-3 bg-[#EAE3DA]/60 border border-[#B6AA9A] rounded-xl text-xs text-[#514940] leading-relaxed">
                      <span className="font-bold text-[#211E1A]">Theoretical Justification: </span>
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
                <span className="text-xs font-bold text-[#D92D2D] bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                  {currentQuestion?.points || 20} pts
                </span>
                <button
                  type="button"
                  onClick={handleToggleFlag}
                  className={`text-xs font-bold flex items-center gap-1 transition-colors ${
                    flagged[currentQuestion?.id] ? 'text-amber-700 font-black' : 'text-[#71675D] hover:text-[#211E1A]'
                  }`}
                >
                  <span>{flagged[currentQuestion?.id] ? '🚩 Marked for Review' : '🏳️ Mark for Review'}</span>
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
                        ? 'bg-[#EAE3DA] border-[#D92D2D] text-[#211E1A] shadow-xs scale-101'
                        : 'bg-white border-[#B6AA9A] text-[#514940] hover:border-[#211E1A] hover:bg-[#FAF8F5]'
                    }`}
                  >
                    <div className="flex items-center gap-3 pr-2">
                      <span className={`w-6 h-6 rounded-lg border flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
                        isSelected ? 'bg-[#D92D2D] text-white border-[#D92D2D]' : 'bg-[#EAE3DA] text-[#514940] border-[#B6AA9A]'
                      }`}>
                        {String.fromCharCode(65 + oIdx)}
                      </span>
                      <span>{opt}</span>
                    </div>

                    <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs shrink-0 ${
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
                ← Previous Question
              </button>

              <button
                type="button"
                onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                disabled={currentQuestionIndex === questions.length - 1}
                className="px-5 py-2 bg-[#211E1A] hover:bg-black disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
              >
                Next Question →
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

            <div className="pt-3 border-t border-[#B6AA9A]/50 text-[11px] space-y-1.5 text-[#71675D]">
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

      {/* Confirmation Modal for Unanswered Questions */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border-2 border-[#B6AA9A] rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4 animate-scale-in">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 mx-auto flex items-center justify-center text-2xl">
              ⚠️
            </div>
            <div>
              <h3 className="text-lg font-black text-[#211E1A]">Unanswered Questions!</h3>
              <p className="text-xs text-[#514940] mt-1 leading-relaxed">
                You have {questions.length - answeredCount} unanswered questions remaining. Do you still wish to finalize your score submission?
              </p>
            </div>
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#EAE3DA] text-[#211E1A] text-xs font-bold"
              >
                Continue Quiz
              </button>
              <button
                type="button"
                onClick={handleSubmitQuiz}
                className="flex-1 py-2.5 rounded-xl bg-[#D92D2D] text-white text-xs font-bold"
              >
                Submit Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
