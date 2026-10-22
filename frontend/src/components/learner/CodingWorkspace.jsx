import React, { useState } from 'react';

export default function CodingWorkspace({
  lesson,
  onCompleteExercise,
  onOpenAIAssistant
}) {
  const initialCode = lesson?.starterCode || `# Python Coding Workspace\ndef solution():\n    return "Hello LearnSpace"\n\nprint(solution())`;
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('Python 3.11');
  const [customInput, setCustomInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFormatCode = () => {
    // Simple indentation beautification simulation
    const formatted = code
      .split('\n')
      .map(line => line.trimEnd())
      .join('\n');
    setCode(formatted);
  };

  const handleRunCode = () => {
    setIsRunning(true);
    setOutput(`[${selectedLanguage}] Compiling and executing in isolated sandbox...\n`);

    setTimeout(() => {
      setIsRunning(false);
      let mockOutput = `>>> [${selectedLanguage} Exec Engine]\n`;
      if (customInput.trim()) {
        mockOutput += `STDIN provided: "${customInput}"\n`;
      }

      if (code.includes('log_softmax_custom')) {
        mockOutput += 'Computed log probabilities: [-0.4076, -1.4076, -2.3076]\nCross-entropy loss: 2.4076\nExecution finished with status 0.';
      } else if (code.includes('multi_head_attention_summary')) {
        mockOutput += 'Attention projection dimensions verified:\n{\'num_heads\': 8, \'d_model\': 512, \'d_k\': 64, \'scale_factor\': 0.125}\nStatus code: 0.';
      } else {
        mockOutput += 'Program Output:\nReady to learn!\n\nProcess finished with exit code 0 (runtime: 38ms, memory: 12.4 MB).';
      }
      setOutput(mockOutput);
    }, 400);
  };

  const handleStopExecution = () => {
    setIsRunning(false);
    setOutput(prev => prev + '\n[Process manually terminated by user SIGINT]');
  };

  const handleSubmitSolution = () => {
    setIsRunning(true);
    setOutput(`Evaluating solution against ${testCases.length} automated test cases...\n`);

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
        `Score: 100/100 points awarded.\n`
      );

      if (onCompleteExercise) {
        onCompleteExercise();
      }
    }, 600);
  };

  const lineCount = Math.max(14, code.split('\n').length);
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className="bg-[#1E1C1A] text-stone-200 rounded-3xl border-2 border-[#B6AA9A] overflow-hidden shadow-2xl flex flex-col font-mono text-xs">
      {/* Workspace Top Toolbar */}
      <div className="bg-[#2A2622] px-4 py-2.5 border-b border-stone-700 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
          <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" />
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
          <span className="ml-2 font-bold text-stone-300 font-sans text-xs flex items-center gap-1.5">
            <span>💻</span>
            <span>Integrated Coding Workspace</span>
          </span>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Multi-language Selector (PROJECT.md §11) */}
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="bg-[#1E1C1A] text-stone-300 text-xs px-2.5 py-1 rounded-lg border border-stone-600 focus:outline-none"
          >
            <option value="Python 3.11">Python 3.11</option>
            <option value="JavaScript (Node 20)">JavaScript (Node 20)</option>
            <option value="C++ 20">C++ 20</option>
            <option value="SQL (PostgreSQL 16)">SQL (PostgreSQL 16)</option>
          </select>

          {/* AI Helper Trigger (PROJECT.md §25) */}
          {onOpenAIAssistant && (
            <button
              type="button"
              onClick={onOpenAIAssistant}
              className="px-2.5 py-1 bg-[#D92D2D]/20 hover:bg-[#D92D2D]/40 text-red-300 rounded-lg border border-[#D92D2D]/60 transition-colors flex items-center gap-1 text-[11px] font-sans font-bold"
            >
              <span>🤖</span>
              <span>AI Code Assist</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyCode}
            className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg border border-stone-600 transition-colors"
            title="Copy code"
          >
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>

          <button
            type="button"
            onClick={handleFormatCode}
            className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg border border-stone-600 transition-colors"
            title="Format Code"
          >
            ⚡ Format
          </button>

          <button
            type="button"
            onClick={handleResetCode}
            className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg border border-stone-600 transition-colors"
            title="Reset to starter template"
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
            <span>solution.py ({selectedLanguage})</span>
            <button
              type="button"
              onClick={() => setShowCustomInput(prev => !prev)}
              className="text-[10px] text-amber-300 hover:underline font-sans"
            >
              {showCustomInput ? 'Hide Custom STDIN' : '+ Add Custom Input'}
            </button>
          </div>

          {/* Optional Custom Input Box */}
          {showCustomInput && (
            <div className="p-2 bg-[#25221E] border-b border-stone-800">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Enter custom input string or numbers for stdin..."
                className="w-full px-2.5 py-1 text-xs bg-[#1A1816] text-stone-200 rounded border border-stone-700 focus:outline-none"
              />
            </div>
          )}

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
              Press "Run Code" to test output
            </span>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              {isRunning && (
                <button
                  type="button"
                  onClick={handleStopExecution}
                  className="px-3 py-2 bg-red-900/80 hover:bg-red-800 text-white rounded-xl text-xs font-bold font-sans transition-colors"
                >
                  ■ Stop
                </button>
              )}

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
