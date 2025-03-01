import { Octokit } from '@octokit/rest';

// Use environment variables for sensitive data
const GITHUB_TOKEN = process.env.REACT_APP_GITHUB_TOKEN;
export const REPO_OWNER = process.env.REACT_APP_REPO_OWNER || 'juheehur';
export const REPO_NAME = process.env.REACT_APP_REPO_NAME || 'python-codingtest';

// Octokit 인스턴스 생성
const octokit = new Octokit({
  auth: GITHUB_TOKEN
});

// extractPythonCode 함수 추가
const extractPythonCode = (content) => {
  const pythonCodeBlocks = [];
  const codeBlockRegex = /```python\n([\s\S]*?)```/g;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    pythonCodeBlocks.push(match[1].trim());
  }

  // Add metadata as comments
  const metadata = [
    '# Generated from blog post',
    `# Date: ${new Date().toISOString().split('T')[0]}`,
    ''
  ].join('\n');

  if (pythonCodeBlocks.length > 0) {
    pythonCodeBlocks.unshift(metadata); // 메타데이터를 코드 블록 앞에 추가
  }

  return pythonCodeBlocks;
};

export const pushCodeToGithub = async (title, content, fileName) => {
  try {
    const pythonCodeBlocks = extractPythonCode(content);
    if (!pythonCodeBlocks || pythonCodeBlocks.length === 0) {
      return null;
    }

    const combinedCode = pythonCodeBlocks.join('\n\n');
    const cleanFileName = fileName.trim()
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s]/g, '')
      .replace(/\s+/g, '_') + '.py';

    try {
      // Octokit을 사용하여 파일 생성/업데이트
      const response = await octokit.repos.createOrUpdateFileContents({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path: cleanFileName,
        message: `Add solution: ${title}`,
        content: btoa(unescape(encodeURIComponent(combinedCode))),
        committer: {
          name: process.env.REACT_APP_GITHUB_USERNAME,
          email: process.env.REACT_APP_GITHUB_EMAIL
        },
        author: {
          name: process.env.REACT_APP_GITHUB_USERNAME,
          email: process.env.REACT_APP_GITHUB_EMAIL
        }
      });

      console.log('Successfully pushed to GitHub:', response.data);
      return cleanFileName;

    } catch (apiError) {
      console.error('GitHub API Error Details:', apiError.response?.data || apiError);
      throw new Error(`GitHub API error: ${apiError.message}`);
    }

  } catch (error) {
    console.error('Error in pushCodeToGithub:', error);
    throw error;
  }
}; 