"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  GitPullRequest,
  RefreshCw,
  Settings,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type PR } from "@/components/pr-card";
import { PRDataTable } from "@/components/pr-data-table";
import { PRGroupedTables } from "@/components/pr-grouped-tables";
import { RepositorySettings } from "@/components/repository-settings";
import { TokenSetup } from "@/components/token-setup";
import {
  fetchPullRequests,
  GitHubAPIError,
  getCurrentUser,
} from "@/lib/github";
import {
  storeTokenSecurely,
  getStoredToken,
  clearStoredToken,
  migratePlainTextToken,
} from "@/lib/token-storage";

type PRStatus =
  | "all"
  | "pending"
  | "re-review"
  | "stagnant"
  | "reviewed-today"
  | "your-prs";

export function PRDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<PRStatus>("all");
  const [selectedRepo, setSelectedRepo] = useState<string>("all");
  const [showSettings, setShowSettings] = useState(false);
  const [watchedRepos, setWatchedRepos] = useState<string[]>([]);
  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [prs, setPRs] = useState<PR[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  // Load saved data from localStorage
  useEffect(() => {
    const loadData = async () => {
      // Load watched repositories
      const savedRepos = localStorage.getItem("watchedRepos");
      if (savedRepos) {
        setWatchedRepos(JSON.parse(savedRepos));
      } else {
        setWatchedRepos(["vercel/next.js", "vercel/turbo", "vercel/commerce"]);
      }

      // Migrate plain text token to encrypted storage if needed
      try {
        await migratePlainTextToken();
      } catch (error) {
        console.error("Failed to migrate token:", error);
      }

      // Load encrypted token
      try {
        const token = await getStoredToken();
        if (token) {
          setGithubToken(token);
        }
      } catch (error) {
        console.error("Failed to load stored token:", error);
      }
    };

    loadData();
  }, []);

  // Save token securely when it changes
  useEffect(() => {
    const saveToken = async () => {
      if (githubToken) {
        try {
          await storeTokenSecurely(githubToken);
        } catch (error) {
          console.error("Failed to store token securely:", error);
          setError("Failed to store token securely. Please try again.");
        }
      } else {
        clearStoredToken();
      }
    };

    saveToken();
  }, [githubToken]);

  const handleUpdateRepos = (repos: string[]) => {
    setWatchedRepos(repos);
  };

  const handleUpdateToken = (token: string | null) => {
    setGithubToken(token);
    setError(null);
  };

  const fetchPRs = useCallback(async () => {
    if (!githubToken || watchedRepos.length === 0) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get current user information
      const user = await getCurrentUser(githubToken);
      setCurrentUser(user.login);

      const fetchedPRs = await fetchPullRequests(watchedRepos, githubToken);
      setPRs(fetchedPRs);
      setLastRefresh(new Date());
    } catch (err) {
      if (err instanceof GitHubAPIError) {
        if (err.status === 401) {
          setError(
            "Invalid GitHub token. Please check your token in settings."
          );
        } else if (err.status === 403) {
          setError("Rate limit exceeded. Please try again later.");
        } else {
          setError(`GitHub API error: ${err.message}`);
        }
      } else {
        setError("Failed to fetch pull requests. Please try again.");
      }
      console.error("Error fetching PRs:", err);
    } finally {
      setIsLoading(false);
    }
  }, [githubToken, watchedRepos]);

  // Fetch PRs when token or watched repos change
  useEffect(() => {
    if (githubToken && watchedRepos.length > 0) {
      fetchPRs();
    }
  }, [fetchPRs, githubToken, watchedRepos.length]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!githubToken || watchedRepos.length === 0) {
      return;
    }

    const interval = setInterval(() => {
      fetchPRs();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [fetchPRs, githubToken, watchedRepos.length]);

  const handleRefresh = () => {
    fetchPRs();
  };

  const filteredPRs = prs
    .filter((pr) => {
      const matchesSearch =
        pr.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pr.repo.toLowerCase().includes(searchQuery.toLowerCase());

      // Exclude PRs with 'automated', 'automated-pr', or 'dependencies' labels
      const hasExcludedLabels = pr.labels.some(
        (label) =>
          label.toLowerCase() === "automated" ||
          label.toLowerCase() === "automated-pr" ||
          label.toLowerCase() === "dependencies"
      );
      if (hasExcludedLabels) return false;

      // Handle status filtering including reviewed-today and your-prs
      const matchesTab = (() => {
        if (activeTab === "all") return true;
        if (activeTab === "reviewed-today") {
          if (!pr.lastReviewedByCurrentUser) return false;

          const reviewDate = new Date(pr.lastReviewedByCurrentUser);
          const today = new Date();

          return (
            reviewDate.getFullYear() === today.getFullYear() &&
            reviewDate.getMonth() === today.getMonth() &&
            reviewDate.getDate() === today.getDate()
          );
        }
        if (activeTab === "your-prs") {
          return currentUser && pr.author === currentUser;
        }
        return pr.status === activeTab;
      })();

      const matchesWatchedRepo =
        watchedRepos.length === 0 || watchedRepos.includes(pr.repo);
      const matchesRepo = selectedRepo === "all" || pr.repo === selectedRepo;

      return matchesSearch && matchesTab && matchesWatchedRepo && matchesRepo;
    })
    .sort((a, b) => {
      // Sort by updated timestamp (most recent first)
      return (
        new Date(b.updatedAtTimestamp).getTime() -
        new Date(a.updatedAtTimestamp).getTime()
      );
    });

  const counts = {
    all: prs.filter((pr) => {
      const hasExcludedLabels = pr.labels.some(
        (label) =>
          label.toLowerCase() === "automated" ||
          label.toLowerCase() === "automated-pr" ||
          label.toLowerCase() === "dependencies"
      );
      const matchesWatchedRepo =
        watchedRepos.length === 0 || watchedRepos.includes(pr.repo);
      const matchesRepo = selectedRepo === "all" || pr.repo === selectedRepo;
      return !hasExcludedLabels && matchesWatchedRepo && matchesRepo;
    }).length,
    pending: prs.filter((pr) => {
      const hasExcludedLabels = pr.labels.some(
        (label) =>
          label.toLowerCase() === "automated" ||
          label.toLowerCase() === "automated-pr" ||
          label.toLowerCase() === "dependencies"
      );
      const matchesWatchedRepo =
        watchedRepos.length === 0 || watchedRepos.includes(pr.repo);
      const matchesRepo = selectedRepo === "all" || pr.repo === selectedRepo;
      return (
        !hasExcludedLabels &&
        pr.status === "pending" &&
        matchesWatchedRepo &&
        matchesRepo
      );
    }).length,
    "re-review": prs.filter((pr) => {
      const hasExcludedLabels = pr.labels.some(
        (label) =>
          label.toLowerCase() === "automated" ||
          label.toLowerCase() === "automated-pr" ||
          label.toLowerCase() === "dependencies"
      );
      const matchesWatchedRepo =
        watchedRepos.length === 0 || watchedRepos.includes(pr.repo);
      const matchesRepo = selectedRepo === "all" || pr.repo === selectedRepo;
      return (
        !hasExcludedLabels &&
        pr.status === "re-review" &&
        matchesWatchedRepo &&
        matchesRepo
      );
    }).length,
    stagnant: prs.filter((pr) => {
      const hasExcludedLabels = pr.labels.some(
        (label) =>
          label.toLowerCase() === "automated" ||
          label.toLowerCase() === "automated-pr" ||
          label.toLowerCase() === "dependencies"
      );
      const matchesWatchedRepo =
        watchedRepos.length === 0 || watchedRepos.includes(pr.repo);
      const matchesRepo = selectedRepo === "all" || pr.repo === selectedRepo;
      return (
        !hasExcludedLabels &&
        pr.status === "stagnant" &&
        matchesWatchedRepo &&
        matchesRepo
      );
    }).length,
    "reviewed-today": prs.filter((pr) => {
      const hasExcludedLabels = pr.labels.some(
        (label) =>
          label.toLowerCase() === "automated" ||
          label.toLowerCase() === "automated-pr" ||
          label.toLowerCase() === "dependencies"
      );
      const matchesWatchedRepo =
        watchedRepos.length === 0 || watchedRepos.includes(pr.repo);
      const matchesRepo = selectedRepo === "all" || pr.repo === selectedRepo;

      if (!pr.lastReviewedByCurrentUser) return false;

      const reviewDate = new Date(pr.lastReviewedByCurrentUser);
      const today = new Date();

      const isReviewedToday =
        reviewDate.getFullYear() === today.getFullYear() &&
        reviewDate.getMonth() === today.getMonth() &&
        reviewDate.getDate() === today.getDate();

      return (
        !hasExcludedLabels &&
        isReviewedToday &&
        matchesWatchedRepo &&
        matchesRepo
      );
    }).length,
    "your-prs": prs.filter((pr) => {
      const hasExcludedLabels = pr.labels.some(
        (label) =>
          label.toLowerCase() === "automated" ||
          label.toLowerCase() === "automated-pr" ||
          label.toLowerCase() === "dependencies"
      );
      const matchesWatchedRepo =
        watchedRepos.length === 0 || watchedRepos.includes(pr.repo);
      const matchesRepo = selectedRepo === "all" || pr.repo === selectedRepo;

      return (
        !hasExcludedLabels &&
        currentUser &&
        pr.author === currentUser &&
        matchesWatchedRepo &&
        matchesRepo
      );
    }).length,
  };

  // Show token setup if no token
  if (!githubToken) {
    return <TokenSetup onTokenSet={handleUpdateToken} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground">
                <GitPullRequest className="h-5 w-5 text-background" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  PR Tracker
                </h1>
                <p className="text-sm text-muted-foreground">
                  Monitor pull requests across your repositories
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(true)}
              >
                <Settings className="mr-2 h-4 w-4" />
                {"Settings"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
                {isLoading ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                className="text-red-700 border-red-300 hover:bg-red-100"
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Last Refresh Info */}
        {lastRefresh && !isLoading && (
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </div>
            <div className="text-sm text-muted-foreground">
              {prs.length} pull request{prs.length !== 1 ? "s" : ""} found
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                className="pl-10"
                placeholder="Search pull requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-64">
              <Select value={selectedRepo} onValueChange={setSelectedRepo}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by repository" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All repositories</SelectItem>
                  {watchedRepos.map((repo) => (
                    <SelectItem key={repo} value={repo}>
                      {repo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {Object.entries(counts).map(([status, count]) => (
              <Badge
                key={status}
                className={`cursor-pointer ${
                  activeTab === status
                    ? "bg-primary text-background"
                    : "bg-muted text-foreground"
                }`}
                onClick={() => setActiveTab(status as PRStatus)}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)} ({count})
              </Badge>
            ))}
          </div>
        </div>

        {/* PR Tables */}
        {isLoading && prs.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">Loading pull requests...</p>
            </div>
          </div>
        ) : filteredPRs.length === 0 ? (
          <div className="text-center py-12">
            <GitPullRequest className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No pull requests found
            </h3>
            <p className="text-muted-foreground">
              {watchedRepos.length === 0
                ? "Add some repositories in settings to get started."
                : searchQuery
                ? "Try adjusting your search terms."
                : "No open pull requests in your watched repositories."}
            </p>
          </div>
        ) : (
          <>
            {activeTab === "all" || activeTab === "pending" ? (
              <PRGroupedTables prs={filteredPRs} />
            ) : (
              <PRDataTable
                prs={filteredPRs}
                showPagination={true}
                pageSize={10}
              />
            )}
          </>
        )}

        {/* Repository Settings */}
        <RepositorySettings
          open={showSettings}
          onOpenChange={setShowSettings}
          watchedRepos={watchedRepos}
          onUpdateRepos={handleUpdateRepos}
          githubToken={githubToken}
          onUpdateToken={handleUpdateToken}
        />
      </div>
    </div>
  );
}
