import { Octokit } from '@octokit/rest';

// Use environment variables for sensitive data
const GITHUB_TOKEN = process.env.REACT_APP_GITHUB_TOKEN;
export const REPO_OWNER = 'juheehur';
export const REPO_NAME = 'python-codingtest';

const octokit = new Octokit({
  auth: GITHUB_TOKEN
});

export const pushCodeToGithub = async (title, code, fileName) => {
  try {
    // Extract Python code blocks
    const pythonCodeBlocks = [];
    const codeBlockRegex = /```python\n([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(code)) !== null) {
      pythonCodeBlocks.push(match[1].trim());
    }

    if (pythonCodeBlocks.length === 0) {
      console.log('No Python code blocks found');
      return null;
    }

    // Ensure fileName ends with .py
    const finalFileName = fileName.endsWith('.py') ? fileName : `${fileName}.py`;
    console.log('Creating file:', finalFileName);

    // Combine all Python code blocks with comments
    const fullCode = pythonCodeBlocks.map((code, index) => {
      return `# Code Block ${index + 1}\n${code}`;
    }).join('\n\n');

    // Add metadata as comments
    const metadata = [
      '# Generated from blog post',
      `# Title: ${title}`,
      `# Date: ${new Date().toISOString().split('T')[0]}`,
      ''
    ].join('\n');

    const finalCode = metadata + fullCode;

    try {
      // Create new file
      const response = await octokit.repos.createOrUpdateFileContents({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path: finalFileName,
        message: `Add/Update: ${title}`,
        content: btoa(unescape(encodeURIComponent(finalCode))),
        committer: {
          name: 'Blog Post Bot',
          email: 'bot@example.com'
        }
      });

      console.log('Successfully pushed to GitHub:', response.data);
      return finalFileName;
    } catch (error) {
      console.error('GitHub API error details:', {
        status: error.status,
        message: error.message,
        response: error.response?.data
      });
      throw new Error(`GitHub API Error: ${error.message}`);
    }
  } catch (error) {
    console.error('Error pushing to GitHub:', error);
    throw new Error(`Failed to push code to GitHub: ${error.message}`);
  }
}; 