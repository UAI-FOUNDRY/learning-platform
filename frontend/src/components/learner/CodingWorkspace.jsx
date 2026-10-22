import React, { useState } from 'react';

export default function CodingWorkspace({
  lesson,
  onCompleteExercise
}) {
  const initialCode = lesson?.starterCode || `# Python Coding Workspace\ndef solution():\n    return "Hello LearnSpace"\n\nprint(solution())`;
  const [code, setCode] = useState(initialCode);
  const [activeTab, setActiveTab] = useState('problem'); // 'problem', 'hints'
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('Python 3.11');

  const testCases = lesson?.testCases || [
    { id: 'tc-1', input: 'Default sample test', expected: 'Output verified', description: 'Sample validation' }
  ];

  const handleResetCode = () => {
    if (window.confirm('Reset code editor to initial starter template?')) {
      setCode(initialCode);
      setOutput('');
      setTestResults(null);
    }
  };

  const handleRunCode = () => {
    setIsRunning(true);
    setOutput('Executing script in isolated Python sandbox...\n');

    setTimeout(() => {
      setIsRunning(false);
      // Simulate realistic output execution
      let mockOutput = '>>> Running user script:\n';
      if (code.includes('log_softmax_custom')) {
        mockOutput += 'Computed log probabilities: [-0.4076, -1.4076, -2.3076]\nCross-entropy loss: 2.4076\nExecution completed with status code 0.';
      } else if (code.includes('multi_head_attention_summary')) {
        mockOutput += 'Configuration verified: {\'num_heads\': 8, \'d_model\': 512, \'d_k\': 64, \'scale_factor\': 0.125}\nExecution completed with status code 0.';
      } else {
        mockOutput += 'Program Output:\n' + 'Ready to learn!\n\nProcess finished with exit code 0 (execution time: 38ms).';
      }
      setOutput(mockOutput);
    }, 400);
  };

  const handleSubmitSolution = () => {
    setIsRunning(true);
    setOutput('Evaluating submission against 3 test cases...\n');

    setTimeout(() => {
      setIsRunning(false);
      const results = testCases.map((tc, idx) => ({
        id: tc.id || `tc-${idx}`,
        description: tc.description || `Test Case ${idx + 1}`,
        passed: true,
        runtime: `${Math.floor(20 + Math.random() * 25)}ms`,
        input: tc.input,
        expected: tc.expected
      }));

      setTestResults({
        allPassed: true,
        passedCount: results.length,
        totalCount: results.length,
        executionTime: '42ms',
        memoryUsed: '14.2 MB',
        results
      });

      setOutput(
        `>>> All ${results.length} Test Cases Passed Successfully!\n` +
        `Execution time: 42ms | Memory: 14.2 MB\n` +
        `Evaluation score: 100/100 points awarded.\n`
      );

      if (onCompleteExercise) {
        onCompleteExercise();
      }
    }, 600);
  };

  // Generate numbered lines for code editor
  const lineCount = Math.max(12, code.split('\n').length);
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className="bg-[#1E1C1A] text-stone-200 rounded-3xl border-2 border-[#B6AA9A] overflow-hidden shadow-2xl flex flex-col font-mono text-xs">
      {/* Workspace Top Toolbar */}
      <div className="bg-[#2A2622] px-4 py-2.5 border-b border-stone-700 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
          <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" />
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
          <span className="ml-2 font-bold text-stone-300 font-sans text-xs">
            Integrated Coding Sandbox
          </span>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="bg-[#1E1C1A] text-stone-300 text-xs px-2.5 py-1 rounded-lg border border-stone-600 focus:outline-none"
          >
            <option value="Python 3.11">Python 3.11</option>
            <option value="C++ 20">C++ 20</option>
            <option value="JavaScript (Node 20)">JavaScript (Node 20)</option>
          </select>

          <button
            type="button"
            onClick={handleResetCode}
            className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg border border-stone-600 transition-colors"
            title="Reset code"
          >
            ↺ Reset
          </button>
        </div>
      </div>

      {/* Main Split Grid (Problem Details on Left, Code Editor on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px]">
        {/* Left Pane: Problem Statement & Test Cases (5 cols) */}
        <div className="lg:col-span-5 bg-[#25221E] border-r border-stone-700 p-4 sm:p-5 flex flex-col justify-between overflow-y-auto max-h-[500px]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-900/60 text-amber-200 border border-amber-700">
                Coding Exercise
              </span>
              <span className="text-stone-400 text-[11px] font-sans">
                {lesson?.duration || '30 min'}
              </span>
            </div>

            <h3 className="text-base font-extrabold text-white font-sans">
              {lesson?.title || 'Hands-On Implementation Challenge'}
            </h3>

            <p className="text-stone-300 text-xs font-sans leading-relaxed">
              {lesson?.summary || 'Implement the algorithm following the lecture specifications. Make sure your logic satisfies all edge-cases.'}
            </p>

            {/* Test Cases List */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-stone-200 uppercase font-sans tracking-wider">
                Automated Verification Cases
              </h4>
              <div className="space-y-2">
                {testCases.map((tc, idx) => (
                  <div key={tc.id || idx} className="p-2.5 bg-[#1E1C1A] rounded-xl border border-stone-700 text-[11px] space-y-1">
                    <div className="flex items-center justify-between text-stone-400">
                      <span className="font-bold">Case {idx + 1}</span>
                      <span className="text-[10px]">{tc.description}</span>
                    </div>
                    <div className="text-stone-300 text-[11px]">
                      <span className="text-stone-500">Input: </span>
                      <code className="text-amber-300">{tc.input}</code>
                    </div>
                    <div className="text-stone-300 text-[11px]">
                      <span className="text-stone-500">Expected: </span>
                      <code className="text-emerald-400">{tc.expected}</code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {testResults && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-950/70 border border-emerald-600 text-emerald-200 font-sans animate-scale-in">
              <div className="flex items-center gap-2 font-bold text-xs">
                <span>🎉</span>
                <span>All {testResults.passedCount} Test Cases Passed!</span>
              </div>
              <p className="text-[11px] text-emerald-300/80 mt-0.5">
                Lecture exercise completed. Progress recorded in your syllabus.
              </p>
            </div>
          )}
        </div>

        {/* Right Pane: Code Editor (7 cols) */}
        <div className="lg:col-span-7 flex flex-col bg-[#1A1816]">
          {/* Editor Header Bar */}
          <div className="px-4 py-1.5 bg-[#221F1B] border-b border-stone-800 flex items-center justify-between text-[11px] text-stone-400">
            <span>solution.py</span>
            <span>Tab size: 4 spaces</span>
          </div>

          {/* Line Numbers + Textarea Container */}
          <div className="flex-1 flex overflow-hidden relative min-h-[300px]">
            {/* Gutter */}
            <div className="w-10 bg-[#171513] text-stone-600 select-none text-right pr-2 pt-3 font-mono text-xs border-r border-stone-800 leading-6">
              {lineNumbers.map(n => (
                <div key={n}>{n}</div>
              ))}
            </div>

            {/* Editable code area */}
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck="false"
              className="flex-1 p-3 bg-transparent text-emerald-300 font-mono text-xs leading-6 resize-none focus:outline-none overflow-auto"
            />
          </div>

          {/* Editor Action Buttons */}
          <div className="p-3 bg-[#24211D] border-t border-stone-700 flex items-center justify-between gap-3">
            <span className="text-[11px] text-stone-400 hidden sm:inline font-sans">
              Press "Run Code" to preview output before submitting
            </span>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleRunCode}
                disabled={isRunning}
                className="px-4 py-2 bg-stone-700 hover:bg-stone-600 text-white rounded-xl text-xs font-bold font-sans transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
              >
                <span>▶</span>
                <span>Run Code</span>
              </button>

              <button
                type="button"
                onClick={handleSubmitSolution}
                disabled={isRunning}
                className="px-5 py-2 bg-[#D92D2D] hover:bg-[#B91C1C] text-white rounded-xl text-xs font-extrabold font-sans transition-all hover:scale-102 shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>{isRunning ? 'Evaluating...' : 'Submit Solution'}</span>
                <span>✓</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Output Console */}
      <div className="bg-[#121110] border-t border-stone-800 p-4 max-h-48 overflow-y-auto">
        <div className="flex items-center justify-between text-[11px] text-stone-400 mb-1 border-b border-stone-800 pb-1">
          <span className="font-bold text-stone-300 uppercase font-sans">Interactive Console Output</span>
          {testResults && (
            <span className="text-emerald-400 font-bold font-sans">
              Score: 100/100 • 3/3 passed ({testResults.executionTime})
            </span>
          )}
        </div>
        <pre className="text-stone-300 font-mono text-xs whitespace-pre-wrap leading-relaxed">
          {output || 'Run or Submit your solution to execute test cases against the judge.'}
        </pre>
      </div>
    </div>
  );
}
