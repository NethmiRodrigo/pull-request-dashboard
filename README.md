# Pull Request Dashboard

A Next.js dashboard for tracking pull requests across multiple GitHub repositories.

## Features

- **GitHub API Integration**: Real-time pull request data from GitHub
- **Multi-Repository Support**: Track PRs across multiple repositories
- **Custom Status Classification**: Automatically categorizes PRs as pending, re-review, or stagnant
- **Auto-Refresh**: Automatically updates every 5 minutes
- **Token Management**: Secure GitHub token storage in browser localStorage
- **Search & Filter**: Find PRs by title, repository, or status

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Create a GitHub Personal Access Token**:
   - Go to [GitHub Settings → Personal Access Tokens](https://github.com/settings/tokens)
   - Click "Generate new token" → "Generate new token (classic)"
   - Give it a descriptive name like "PR Dashboard"
   - Select scopes:
     - `repo` - for private repositories
     - `public_repo` - for public repositories only
   - Copy the generated token

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Configure the dashboard**:
   - Enter your GitHub token when prompted
   - Add repositories you want to track (format: `owner/repository`)
   - The dashboard will automatically fetch and display pull requests

## Usage

- **Adding Repositories**: Click the Settings button and add repositories in the format `owner/repository`
- **Token Management**: Update or clear your GitHub token in the Settings dialog
- **Manual Refresh**: Click the Refresh button to manually update PR data
- **Search**: Use the search bar to filter PRs by title or repository name
- **Status Filtering**: Click on status badges to filter by PR status

## PR Status Classification

- **Pending**: Newly opened or recently updated PRs
- **Re-review**: Draft PRs or PRs that might need review
- **Stagnant**: PRs with no updates in 5+ days

## Security

- Your GitHub token is stored locally in your browser's localStorage
- No data is sent to external servers except GitHub's API
- You can revoke your token anytime from GitHub settings