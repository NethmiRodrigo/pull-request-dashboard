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
    user: {
      login: string;
    };
  }>;
}

export interface ProcessedPR {
  id: number;
  title: string;
  repo: string;
  number: number;
  author: string;
  authorAvatar: string;
  status: "pending" | "re-review" | "stagnant" | "reviewed";
  updatedAt: string;
  updatedAtTimestamp: string;
  createdAt: string;
  createdAtTimestamp: string;
  labels: string[];
  url: string;
  lastReviewedByCurrentUser: string | null;
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
    // Get current user information
    const currentUser = await getCurrentUser(token);

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

      // Fetch reviews for each PR
      const prsWithReviews = await Promise.all(
        prs.map(async (pr) => {
          try {
            const reviewsUrl = `${GITHUB_API_BASE}/repos/${owner}/${repoName}/pulls/${pr.number}/reviews`;
            const reviewsResponse = await fetch(reviewsUrl, { headers });

            if (reviewsResponse.ok) {
              const reviews = await reviewsResponse.json();
              return { ...pr, reviews };
            }
            return pr; // Return PR without reviews if fetch fails
          } catch {
            return pr; // Return PR without reviews if fetch fails
          }
        })
      );

      // Process each PR with current user context
      const processedPRs = prsWithReviews.map((pr) =>
        processPR(pr, repo, currentUser.login)
      );

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

export function processPR(
  pr: GitHubPR,
  repo: string,
  currentUser: string
): ProcessedPR {
  const status = calculatePRStatus(pr, currentUser);
  const updatedAt = formatRelativeTime(pr.updated_at);

  // Find the most recent review by the current user
  const userReviews =
    pr.reviews?.filter(
      (review) =>
        review.state !== "DISMISSED" &&
        review.submitted_at &&
        review.user.login === currentUser
    ) || [];

  const lastReviewedByCurrentUser =
    userReviews.length > 0
      ? userReviews
          .filter((review) => review.submitted_at)
          .sort(
            (a, b) =>
              new Date(b.submitted_at!).getTime() -
              new Date(a.submitted_at!).getTime()
          )[0]?.submitted_at || null
      : null;

  return {
    id: pr.id,
    title: pr.title,
    repo,
    number: pr.number,
    author: pr.user.login,
    authorAvatar: pr.user.avatar_url,
    status,
    updatedAt,
    updatedAtTimestamp: pr.updated_at,
    createdAt: formatRelativeTime(pr.created_at),
    createdAtTimestamp: pr.created_at,
    labels: pr.labels.map((label) => label.name),
    url: pr.html_url,
    lastReviewedByCurrentUser,
  };
}

export function calculatePRStatus(
  pr: GitHubPR,
  currentUser: string
): "pending" | "re-review" | "stagnant" | "reviewed" {
  const now = new Date();
  const updatedAt = new Date(pr.updated_at);
  const daysSinceUpdate =
    (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);

  // Stagnant: no updates in 5+ days
  if (daysSinceUpdate >= 5) {
    return "stagnant";
  }

  // Check if the current user has reviewed this PR
  const userReviews =
    pr.reviews?.filter(
      (review) =>
        review.state !== "DISMISSED" &&
        review.submitted_at &&
        review.user.login === currentUser
    ) || [];

  if (userReviews.length === 0) {
    // User has never reviewed this PR
    return "pending";
  }

  // Find the most recent review by the current user
  const mostRecentUserReview = userReviews
    .filter((review) => review.submitted_at)
    .sort(
      (a, b) =>
        new Date(b.submitted_at!).getTime() -
        new Date(a.submitted_at!).getTime()
    )[0];

  if (!mostRecentUserReview) {
    return "pending";
  }

  // Check if PR has been updated since the user's last review
  const lastReviewDate = new Date(mostRecentUserReview.submitted_at!);
  const prUpdatedDate = new Date(pr.updated_at);

  if (prUpdatedDate > lastReviewDate) {
    return "re-review";
  }

  // PR hasn't been updated since user's last review
  // Check if the user's most recent review was an approval
  if (mostRecentUserReview.state === "APPROVED") {
    return "reviewed";
  }

  // User has reviewed but not approved, and PR hasn't been updated
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

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name?: string;
  email?: string;
}

export async function getCurrentUser(token: string): Promise<GitHubUser> {
  if (!token) {
    throw new GitHubAPIError("GitHub token is required", 401);
  }

  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };

  try {
    const response = await fetch(`${GITHUB_API_BASE}/user`, { headers });

    if (!response.ok) {
      const errorData: GitHubError = await response.json().catch(() => ({}));
      throw new GitHubAPIError(
        errorData.message || "Failed to fetch user information",
        response.status
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof GitHubAPIError) {
      throw error;
    }
    throw new GitHubAPIError(
      `Failed to fetch user information: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      500
    );
  }
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

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  owner: {
    login: string;
    avatar_url: string;
  };
  stargazers_count: number;
  language: string | null;
}

export interface RepositorySearchResult {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubRepository[];
}

export async function searchRepositories(
  query: string,
  token: string,
  limit: number = 10
): Promise<GitHubRepository[]> {
  if (!token) {
    throw new GitHubAPIError("GitHub token is required", 401);
  }

  if (!query.trim()) {
    return [];
  }

  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };

  try {
    // Search for repositories with the query
    const searchUrl = `${GITHUB_API_BASE}/search/repositories?q=${encodeURIComponent(
      query
    )}&sort=stars&order=desc&per_page=${limit}`;

    const response = await fetch(searchUrl, { headers });

    if (!response.ok) {
      const errorData: GitHubError = await response.json().catch(() => ({}));
      throw new GitHubAPIError(
        errorData.message || "Failed to search repositories",
        response.status
      );
    }

    const searchResult: RepositorySearchResult = await response.json();
    return searchResult.items;
  } catch (error) {
    if (error instanceof GitHubAPIError) {
      throw error;
    }
    throw new GitHubAPIError(
      `Failed to search repositories: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      500
    );
  }
}
