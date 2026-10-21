import React, { useState } from 'react';
import PageContainer from '../../components/layout/PageContainer';
import { instructorCourseService } from '../../services/instructorCourseService';

const INITIAL_SUBMISSIONS = [
  {
    id: 'sub-1',
    studentName: 'Sarah Chen',
    studentEmail: 'sarah.chen@stanford.edu',
    courseTitle: 'Deep Learning with PyTorch 2.0',
    assignmentTitle: 'Implementing Softmax & Cross-Entropy from Scratch',
    type: 'Coding Exercise',
    submittedAt: '2026-10-21T14:30:00Z',
    status: 'Auto-Evaluated',
    score: 100,
    testCasesPassed: 5,
    totalTestCases: 5,
    codeSnippet: `import torch\n\ndef softmax(logits):\n    exp_logits = torch.exp(logits - torch.max(logits, dim=-1, keepdim=True).values)\n    return exp_logits / torch.sum(exp_logits, dim=-1, keepdim=True)\n\n# All unit tests passed: shape preservation, numerical stability, gradient propagation.`
  },
  {
    id: 'sub-2',
    studentName: 'Marcus Brody',
    studentEmail: 'marcus.brody@mit.edu',
    courseTitle: 'Deep Learning with PyTorch 2.0',
    assignmentTitle: 'CNN Architecture & Overfitting Quiz',
    type: 'Quiz',
    submittedAt: '2026-10-20T18:15:00Z',
    status: 'Graded',
    score: 92,
    testCasesPassed: 11,
    totalTestCases: 12,
    codeSnippet: 'Quiz Score: 92% (11/12 questions correct). Misidentified optimal kernel dilation factor.'
  },
  {
    id: 'sub-3',
    studentName: 'Alex Rivera',
    studentEmail: 'alex.rivera@berkeley.edu',
    courseTitle: 'Deep Learning with PyTorch 2.0',
    assignmentTitle: 'Attention Layer Implementation Exercise',
    type: 'Coding Exercise',
    submittedAt: '2026-10-20T11:00:00Z',
    status: 'Needs Review',
    score: 75,
    testCasesPassed: 3,
    totalTestCases: 4,
    codeSnippet: `def scaled_dot_product_attention(Q, K, V, mask=None):\n    d_k = Q.size(-1)\n    scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(d_k)\n    if mask is not None:\n        scores = scores.masked_fill(mask == 0, -1e9)\n    return torch.matmul(torch.softmax(scores, dim=-1), V)`
  },
  {
    id: 'sub-4',
    studentName: 'Elena Gomez',
    studentEmail: 'elena.gomez@cmu.edu',
    courseTitle: 'Practical Python for Data Science',
    assignmentTitle: 'Data Cleaning & Groupby Mastery',
    type: 'Coding Exercise',
    submittedAt: '2026-10-19T09:45:00Z',
    status: 'Auto-Evaluated',
    score: 100,
    testCasesPassed: 6,
    totalTestCases: 6,
    codeSnippet: `import pandas as pd\n\ndef clean_and_aggregate(df):\n    df_clean = df.dropna(subset=['revenue', 'category'])\n    return df_clean.groupby('category').agg({'revenue': 'sum'}).reset_index()`
  }
];

export default function Submissions() {
  const [submissions, setSubmissions] = useState(INITIAL_SUBMISSIONS);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [reviewComment, setReviewComment] = useState('');
  const [feedbackNotice, setFeedbackNotice] = useState(null);

  const filtered = submissions.filter(sub => {
    if (filterType !== 'all' && sub.type !== filterType) return false;
    if (filterStatus !== 'all' && sub.status !== filterStatus) return false;
    return true;
  });

  const handleGradeSubmission = (id, newScore) => {
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, score: newScore, status: 'Graded', instructorComment: reviewComment } : s));
    setSelectedSubmission(null);
    setReviewComment('');
    setFeedbackNotice('Grade and instructor feedback recorded successfully!');
    setTimeout(() => setFeedbackNotice(null), 4000);
  };

  return (
    <PageContainer>
      {/* Header */}
      <div className="pb-6 border-b border-[#B6AA9A] animate-slide-up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded bg-[#EAE3DA] text-[#D92D2D] border border-[#B6AA9A]">
                Grading Center
              </span>
              <span className="text-xs font-semibold text-[#71675D]">
                Student Assessment Submissions
              </span>
            </div>
            <h1 className="mt-2 text-[26px] sm:text-[32px] font-extrabold tracking-tight text-[#211E1A] font-sans leading-tight">
              Learner Submissions & Code Evaluations
            </h1>
            <p className="mt-1.5 text-[14px] leading-relaxed text-[#514940] max-w-3xl">
              Inspect student code executions, automated test case evaluations, quiz responses, and provide personalized instructor grading.
            </p>
          </div>
        </div>

        {feedbackNotice && (
          <div className="mt-4 p-3.5 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-xl text-xs sm:text-sm font-semibold animate-slide-down">
            ✓ {feedbackNotice}
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#514940]">Type:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-xs py-2 px-3 bg-white border border-[#B6AA9A] rounded-lg text-[#211E1A]"
            >
              <option value="all">All Types</option>
              <option value="Coding Exercise">Coding Exercises</option>
              <option value="Quiz">Quizzes</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#514940]">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs py-2 px-3 bg-white border border-[#B6AA9A] rounded-lg text-[#211E1A]"
            >
              <option value="all">All Statuses</option>
              <option value="Auto-Evaluated">Auto-Evaluated (Passed)</option>
              <option value="Needs Review">Needs Review</option>
              <option value="Graded">Graded</option>
            </select>
          </div>
        </div>
      </div>

      {/* Submissions List */}
      <div className="mt-8 space-y-4 animate-slide-up">
        {filtered.map((sub) => (
          <div
            key={sub.id}
            className="p-5 bg-white border border-[#B6AA9A] rounded-xl shadow-xs interactive-card hover-lift flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                  sub.type === 'Coding Exercise'
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : 'bg-purple-100 text-purple-900 border-purple-300'
                }`}>
                  {sub.type}
                </span>

                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  sub.status === 'Needs Review'
                    ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                    : 'bg-[#EAE3DA] text-[#514940] border-[#B6AA9A]'
                }`}>
                  {sub.status}
                </span>

                <span className="text-xs text-[#71675D] font-mono">
                  {new Date(sub.submittedAt).toLocaleDateString()}
                </span>
              </div>

              <h3 className="mt-2 text-base font-extrabold text-[#211E1A]">
                {sub.assignmentTitle}
              </h3>

              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#514940]">
                <span>Student: <strong className="text-[#211E1A]">{sub.studentName}</strong> ({sub.studentEmail})</span>
                <span>•</span>
                <span>Course: <strong>{sub.courseTitle}</strong></span>
              </div>

              {sub.type === 'Coding Exercise' && (
                <div className="mt-2.5 inline-flex items-center gap-2 text-xs bg-[#EAE3DA] px-2.5 py-1 rounded-md border border-[#B6AA9A]">
                  <span className="font-bold text-emerald-800">✓ {sub.testCasesPassed}/{sub.totalTestCases} Tests Passed</span>
                  <span className="text-[#71675D]">({Math.round((sub.testCasesPassed / sub.totalTestCases) * 100)}% Pass Rate)</span>
                </div>
              )}
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 shrink-0">
              <div className="text-right">
                <span className="text-xs text-[#71675D] block">Score</span>
                <span className="text-2xl font-extrabold text-[#211E1A] font-sans">
                  {sub.score}%
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSubmission(sub)}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-[#211E1A] text-white hover:bg-[#D92D2D] transition-colors shadow-xs"
              >
                Inspect Code & Grade
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Code Inspection & Grading Modal */}
      {selectedSubmission && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in"
          onClick={() => setSelectedSubmission(null)}
        >
          <div
            className="bg-[#EAE3DA] rounded-2xl shadow-2xl border border-[#B6AA9A] max-w-2xl w-full overflow-hidden p-6 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-4 border-b border-[#B6AA9A]">
              <div>
                <span className="text-xs font-extrabold uppercase text-[#D92D2D]">
                  Student Code Inspection
                </span>
                <h3 className="mt-1 text-lg font-extrabold text-[#211E1A]">
                  {selectedSubmission.assignmentTitle}
                </h3>
                <p className="text-xs text-[#514940]">
                  Submitted by {selectedSubmission.studentName} • Score: {selectedSubmission.score}%
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="text-lg font-bold text-[#71675D] hover:text-[#211E1A]"
              >
                ✕
              </button>
            </div>

            <div className="mt-4">
              <span className="text-xs font-bold text-[#211E1A] block mb-1">
                Student Submitted Implementation:
              </span>
              <pre className="p-4 bg-[#211E1A] text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto shadow-inner leading-relaxed">
                <code>{selectedSubmission.codeSnippet}</code>
              </pre>
            </div>

            <div className="mt-4">
              <label htmlFor="inst-comment" className="block text-xs font-bold text-[#211E1A] mb-1">
                Faculty Feedback & Grading Notes:
              </label>
              <textarea
                id="inst-comment"
                rows={3}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Write specific feedback on code efficiency, edge cases, and algorithmic complexity..."
                className="w-full px-3 py-2 text-xs bg-white border border-[#B6AA9A] rounded-lg text-[#211E1A] focus:outline-none focus:border-[#D92D2D]"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-[#B6AA9A]">
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-white text-[#514940] border border-[#B6AA9A]"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleGradeSubmission(selectedSubmission.id, 95)}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-[#D92D2D] text-white hover:bg-[#B91C1C] shadow-md"
              >
                Approve & Record Feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
