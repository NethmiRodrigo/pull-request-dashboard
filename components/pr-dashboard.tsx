"use client";

import { useState, useEffect } from "react";
import { Search, GitPullRequest, RefreshCw, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type PR, PRCard } from "@/components/pr-card";
import { RepositorySettings } from "@/components/repository-settings";

// Mock data - replace with actual GitHub API calls
const mockPRs: PR[] = [
  {
    id: 1,
    title: "Add user authentication flow",
    repo: "vercel/next.js",
    number: 58234,
    author: "johndoe",
    authorAvatar: "/developer-working.png",
    status: "pending",
    updatedAt: "2h ago",
    labels: ["feature", "auth"],
    url: "https://github.com/vercel/next.js/pull/58234",
  },
  {
    id: 2,
    title: "Fix memory leak in server components",
    repo: "vercel/next.js",
    number: 58190,
    author: "janedoe",
    authorAvatar: "/developer2.jpg",
    status: "re-review",
    updatedAt: "4h ago",
    labels: ["bug", "server-components"],
    url: "https://github.com/vercel/next.js/pull/58190",
  },
  {
    id: 3,
    title: "Update documentation for App Router",
    repo: "vercel/next.js",
    number: 58156,
    author: "bobsmith",
    authorAvatar: "/developer3.png",
    status: "stagnant",
    updatedAt: "5d ago",
    labels: ["documentation"],
    url: "https://github.com/vercel/next.js/pull/58156",
  },
  {
    id: 4,
    title: "Implement new caching strategy",
    repo: "vercel/turbo",
    number: 7234,
    author: "alicejones",
    authorAvatar: "/developer4.png",
    status: "pending",
    updatedAt: "1d ago",
    labels: ["performance", "cache"],
    url: "https://github.com/vercel/turbo/pull/7234",
  },
  {
    id: 5,
    title: "Refactor build pipeline",
    repo: "vercel/turbo",
    number: 7198,
    author: "charliedev",
    authorAvatar: "/developer5.jpg",
    status: "re-review",
    updatedAt: "6h ago",
    labels: ["refactor", "build"],
    url: "https://github.com/vercel/turbo/pull/7198",
  },
  {
    id: 6,
    title: "Add TypeScript strict mode",
    repo: "vercel/commerce",
    number: 1234,
    author: "devuser",
    authorAvatar: "/developer6.jpg",
    status: "stagnant",
    updatedAt: "12d ago",
    labels: ["typescript", "enhancement"],
    url: "https://github.com/vercel/commerce/pull/1234",
  },
];

type PRStatus = "all" | "pending" | "re-review" | "stagnant";

export function PRDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<PRStatus>("all");
  const [showSettings, setShowSettings] = useState(false);
  const [watchedRepos, setWatchedRepos] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("watchedRepos");
    if (saved) {
      setWatchedRepos(JSON.parse(saved));
    } else {
      setWatchedRepos(["vercel/next.js", "vercel/turbo", "vercel/commerce"]);
    }
  }, []);

  const handleUpdateRepos = (repos: string[]) => {
    setWatchedRepos(repos);
  };

  const filteredPRs = mockPRs.filter((pr) => {
    const matchesSearch =
      pr.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pr.repo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === "all" || pr.status === activeTab;
    const matchesWatchedRepo =
      watchedRepos.length === 0 || watchedRepos.includes(pr.repo);
    return matchesSearch && matchesTab && matchesWatchedRepo;
  });

  const counts = {
    all: mockPRs.filter(
      (pr) => watchedRepos.length === 0 || watchedRepos.includes(pr.repo)
    ).length,
    pending: mockPRs.filter(
      (pr) =>
        pr.status === "pending" &&
        (watchedRepos.length === 0 || watchedRepos.includes(pr.repo))
    ).length,
    "re-review": mockPRs.filter(
      (pr) =>
        pr.status === "re-review" &&
        (watchedRepos.length === 0 || watchedRepos.includes(pr.repo))
    ).length,
    stagnant: mockPRs.filter(
      (pr) =>
        pr.status === "stagnant" &&
        (watchedRepos.length === 0 || watchedRepos.includes(pr.repo))
    ).length,
  };

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
              <Button variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                {"Refresh"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              className="pl-10"
              placeholder="Search pull requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
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

        {/* PR Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPRs.map((pr) => (
            <PRCard key={pr.id} pr={pr} />
          ))}
        </div>

        {/* Repository Settings */}
        <RepositorySettings
          open={showSettings}
          onOpenChange={setShowSettings}
          watchedRepos={watchedRepos}
          onUpdateRepos={handleUpdateRepos}
        />
      </div>
    </div>
  );
}
