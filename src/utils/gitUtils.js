import { Octokit } from '@octokit/rest';

// Use environment variables for sensitive data
const GITHUB_TOKEN = process.env.REACT_APP_GITHUB_TOKEN;
export const REPO_OWNER = process.env.REACT_APP_REPO_OWNER || 'juheehur';
export const REPO_NAME = process.env.REACT_APP_REPO_NAME || 'python-codingtest';

const octokit = new Octokit({
  auth: GITHUB_TOKEN
});

export const pushCodeToGithub = async (title, content, fileName) => {
  try {
    // Python 코드 블록 추출
    const pythonCodeBlocks = extractPythonCode(content);
    if (!pythonCodeBlocks || pythonCodeBlocks.length === 0) {
      return null;
    }

    const combinedCode = pythonCodeBlocks.join('\n\n');
    const cleanFileName = fileName.trim()
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s]/g, '')
      .replace(/\s+/g, '_') + '.py';

    // GitHub API를 통한 파일 생성/업데이트
    const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${cleanFileName}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${process.env.REACT_APP_GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Add solution: ${title}`,
        content: Buffer.from(combinedCode).toString('base64'),
        committer: {
          name: process.env.REACT_APP_GITHUB_USERNAME,  // GitHub 사용자 이름
          email: process.env.REACT_APP_GITHUB_EMAIL     // GitHub 이메일
        },
        author: {
          name: process.env.REACT_APP_GITHUB_USERNAME,  // GitHub 사용자 이름
          email: process.env.REACT_APP_GITHUB_EMAIL     // GitHub 이메일
        }
      })
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    return cleanFileName;
  } catch (error) {
    console.error('Error in pushCodeToGithub:', error);
    throw error;
  }
}; 