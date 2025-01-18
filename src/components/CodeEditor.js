import React, { useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';

const languageMap = {
  javascript: javascript({ jsx: true }),
  python: python(),
  css: css(),
  html: html(),
  markdown: markdown(),
};

// Judge0 language IDs
const judgeLanguageIds = {
  javascript: 63,  // Node.js
  python: 71,      // Python 3
};

const RAPIDAPI_KEY = 'f699223cd9msh5186af48a1d2c49p1e149djsndf91bd53aef8';
const RAPIDAPI_HOST = 'judge0-ce.p.rapidapi.com';

function CodeEditor({ code, onChange, language = 'javascript', readOnly = false }) {
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);
  const [stdin, setStdin] = useState('');
  const [showInput, setShowInput] = useState(false);

  const extensions = [
    languageMap[language] || javascript(),
    oneDark
  ];

  const runCode = async () => {
    if (!judgeLanguageIds[language]) {
      setError('Code execution is only supported for JavaScript and Python');
      return;
    }

    setIsRunning(true);
    setError(null);
    setOutput('');

    try {
      // Create submission
      const response = await fetch('https://judge0-ce.p.rapidapi.com/submissions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'X-RapidAPI-Host': RAPIDAPI_HOST,
          'X-RapidAPI-Key': RAPIDAPI_KEY,
        },
        body: JSON.stringify({
          source_code: code,
          language_id: judgeLanguageIds[language],
          stdin: stdin,
          wait: false
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit code');
      }

      const { token } = await response.json();
      if (!token) {
        throw new Error('No token received from the API');
      }

      // Poll for results
      let attempts = 10;
      const getResult = async () => {
        const resultResponse = await fetch(`https://judge0-ce.p.rapidapi.com/submissions/${token}`, {
          headers: {
            'X-RapidAPI-Host': RAPIDAPI_HOST,
            'X-RapidAPI-Key': RAPIDAPI_KEY,
          },
        });

        if (!resultResponse.ok) {
          throw new Error('Failed to fetch results');
        }

        const result = await resultResponse.json();

        if (result.status?.id <= 2 && attempts > 0) { // In Queue or Processing
          attempts--;
          setTimeout(getResult, 1000);
        } else {
          if (result.stderr) {
            setError(result.stderr);
          } else if (result.compile_output) {
            setError(result.compile_output);
          } else {
            setOutput(result.stdout || 'No output');
          }
          setIsRunning(false);
        }
      };

      await getResult();
    } catch (err) {
      console.error('Code execution error:', err);
      setError(err.message || 'Failed to execute code. Please try again.');
      setIsRunning(false);
    }
  };

  return (
    <div className="code-editor">
      <CodeMirror
        value={code}
        height="200px"
        theme={oneDark}
        extensions={extensions}
        onChange={onChange}
        readOnly={readOnly}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightSpecialChars: true,
          foldGutter: true,
          drawSelection: true,
          dropCursor: true,
          allowMultipleSelections: true,
          indentOnInput: true,
          syntaxHighlighting: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          rectangularSelection: true,
          crosshairCursor: true,
          highlightActiveLine: true,
          highlightSelectionMatches: true,
          closeBracketsKeymap: true,
          defaultKeymap: true,
          searchKeymap: true,
          historyKeymap: true,
          foldKeymap: true,
          completionKeymap: true,
          lintKeymap: true,
        }}
      />
      {!readOnly && judgeLanguageIds[language] && (
        <>
          <div className="code-actions">
            <button 
              onClick={() => setShowInput(!showInput)}
              className="input-toggle-btn"
            >
              {showInput ? 'Hide Input' : 'Show Input'}
            </button>
            <button 
              onClick={runCode} 
              disabled={isRunning}
              className="run-code-btn"
            >
              {isRunning ? 'Running...' : 'Run Code'}
            </button>
          </div>
          {showInput && (
            <div className="code-input">
              <textarea
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                placeholder="Enter input here..."
                rows="3"
              />
            </div>
          )}
        </>
      )}
      {(output || error) && (
        <div className="code-output">
          <div className="output-header">
            <span>{error ? 'Error' : 'Output'}</span>
            <button 
              onClick={() => { setOutput(''); setError(null); }}
              className="clear-output-btn"
            >
              Clear
            </button>
          </div>
          <pre className={error ? 'error' : ''}>
            {error || output}
          </pre>
        </div>
      )}
    </div>
  );
}

export default CodeEditor; 