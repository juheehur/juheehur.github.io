import React, { useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView } from '@codemirror/view';

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

function CodeEditor({ code, onChange, language = 'javascript', readOnly = false, onRun }) {
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);
  const [stdin, setStdin] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);

  const extensions = [
    languageMap[language] || javascript(),
    EditorView.theme({
      '&': {
        backgroundColor: '#ffffff',
        height: '100%'
      },
      '.cm-content': {
        color: '#333333',
        caretColor: '#333333'
      },
      '.cm-cursor': {
        borderLeftColor: '#333333'
      },
      '.cm-gutters': {
        backgroundColor: '#f8f9fa',
        color: '#6e7681',
        border: 'none'
      },
      '.cm-activeLineGutter': {
        backgroundColor: '#f0f1f2'
      },
      '.cm-line': {
        fontFamily: "'Fira Code', monospace"
      },
      '.cm-selectionBackground': {
        backgroundColor: '#d7d4f0'
      },
      '.cm-matchingBracket': {
        backgroundColor: '#e5e5e5',
        color: 'inherit'
      },
      '.cm-activeLine': {
        backgroundColor: '#f8f9fa'
      }
    })
  ];

  const handleRunCode = async () => {
    if (!code.trim()) return;
    
    try {
      setIsCompiling(true);
      
      // 실제 API 호출 대신 임시 테스트 로직 사용
      const simulateExecution = (pythonCode) => {
        // 간단한 Python 코드 실행 시뮬레이션
        if (pythonCode.includes('print')) {
          const match = pythonCode.match(/print\(['"](.*)['"]\)/);
          if (match) {
            return match[1];  // print 문자열 반환
          }
        }
        return 'No output';  // 기본 출력
      };

      // 코드 실행 시뮬레이션
      const output = simulateExecution(code);
      setOutput(output);
      
      // 실행 결과를 상위 컴포넌트로 전달
      if (onRun) {
        onRun(output);
      }

    } catch (error) {
      console.error('Compilation error:', error);
      setOutput('실행 중 오류가 발생했습니다.');
      throw error;
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="code-editor">
      <CodeMirror
        value={code}
        height="200px"
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
              onClick={handleRunCode} 
              disabled={isCompiling}
              className="run-code-btn"
            >
              {isCompiling ? 'Compiling...' : 'Run Code'}
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