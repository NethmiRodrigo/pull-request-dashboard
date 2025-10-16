export interface GitHubPR {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  draft: boolean;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  user: {
    login: string;
    avatar_url: string;
  };
  labels: Array<{
    name: string;
    color: string;
  }>;
  html_url: string;
  head: {
    ref: string;
  };
  base: {
    ref: string;
  };
  requested_reviewers: Array<{
    login: string;
  }>;
  reviews?: Array<{
    state: "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "DISMISSED";
    submitted_at: string;
  }>;
}

export interface ProcessedPR {
  id: number;
  title: string;
  repo: string;
  number: number;
  author: string;
  authorAvatar: string;
  status: "pending" | "re-review" | "stagnant";
  updatedAt: string;
  labels: string[];
  url: string;
}

export interface GitHubError {
  message: string;
  documentation_url?: string;
}

const GITHUB_API_BASE = "https://api.github.com";

export class GitHubAPIError extends Error {
  constructor(
    message: string,
    public status: number,
    public rateLimitRemaining?: number
  ) {
    super(message);
    this.name = "GitHubAPIError";
  }
}

export async function fetchPullRequests(
  repos: string[],
  token: string
): Promise<ProcessedPR[]> {
  if (!token) {
    throw new GitHubAPIError("GitHub token is required", 401);
  }

  if (repos.length === 0) {
    return [];
  }

  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const allPRs: ProcessedPR[] = [];

  try {
    // Fetch PRs for all repositories in parallel
    const promises = repos.map(async (repo) => {
      const [owner, repoName] = repo.split("/");
      if (!owner || !repoName) {
        throw new Error(`Invalid repository format: ${repo}`);
      }

      const url = `${GITHUB_API_BASE}/repos/${owner}/${repoName}/pulls?state=open&sort=updated&direction=desc&per_page=100`;

      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errorData: GitHubError = await response.json().catch(() => ({}));
        const rateLimitRemaining = response.headers.get(
          "X-RateLimit-Remaining"
        );

        throw new GitHubAPIError(
          errorData.message || `Failed to fetch PRs for ${repo}`,
          response.status,
          rateLimitRemaining ? parseInt(rateLimitRemaining) : undefined
        );
      }

      const prs: GitHubPR[] = await response.json();

      // Process each PR
      const processedPRs = prs.map((pr) => processPR(pr, repo));

      return processedPRs;
    });

    const results = await Promise.all(promises);

    // Flatten all PRs into a single array
    results.forEach((prs) => allPRs.push(...prs));

    // Sort by updated_at (most recent first)
    allPRs.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return allPRs;
  } catch (error) {
    if (error instanceof GitHubAPIError) {
      throw error;
    }
    throw new GitHubAPIError(
      `Failed to fetch pull requests: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      500
    );
  }
}

export function processPR(pr: GitHubPR, repo: string): ProcessedPR {
  const status = calculatePRStatus(pr);
  const updatedAt = formatRelativeTime(pr.updated_at);

  return {
    id: pr.id,
    title: pr.title,
    repo,
    number: pr.number,
    author: pr.user.login,
    authorAvatar: pr.user.avatar_url,
    status,
    updatedAt,
    labels: pr.labels.map((label) => label.name),
    url: pr.html_url,
  };
}

export function calculatePRStatus(
  pr: GitHubPR
): "pending" | "re-review" | "stagnant" {
  const now = new Date();
  const updatedAt = new Date(pr.updated_at);
  const daysSinceUpdate =
    (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);

  // Stagnant: no updates in 5+ days
  if (daysSinceUpdate >= 5) {
    return "stagnant";
  }

  // Check if there are requested changes or pending reviews
  // For now, we'll use a simple heuristic based on age and draft status
  // In a real implementation, you'd fetch review data separately

  // Re-review: draft PRs or recently updated PRs that might need review
  if (pr.draft || daysSinceUpdate <= 1) {
    return "re-review";
  }

  // Pending: everything else
  return "pending";
}

export function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks}w ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths}mo ago`;
}

export async function validateToken(token: string): Promise<boolean> {
  if (!token) {
    return false;
  }

  try {
    const response = await fetch(`${GITHUB_API_BASE}/user`, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}

export function getRateLimitInfo(
  response: Response
): { remaining: number; reset: number } | null {
  const remaining = response.headers.get("X-RateLimit-Remaining");
  const reset = response.headers.get("X-RateLimit-Reset");

  if (remaining && reset) {
    return {
      remaining: parseInt(remaining),
      reset: parseInt(reset) * 1000, // Convert to milliseconds
    };
  }

  return null;
}
