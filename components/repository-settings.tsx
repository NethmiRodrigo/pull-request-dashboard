"use client";

import type React from "react";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  X,
  Plus,
  Github,
  Key,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { validateToken } from "@/lib/github";

interface RepositorySettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  watchedRepos: string[];
  onUpdateRepos: (repos: string[]) => void;
  githubToken: string | null;
  onUpdateToken: (token: string | null) => void;
}

export function RepositorySettings({
  open,
  onOpenChange,
  watchedRepos,
  onUpdateRepos,
  githubToken,
  onUpdateToken,
}: RepositorySettingsProps) {
  const [newRepo, setNewRepo] = useState("");
  const [error, setError] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [tokenStatus, setTokenStatus] = useState<
    "valid" | "invalid" | "checking" | "not-set"
  >("not-set");
  const [isValidatingToken, setIsValidatingToken] = useState(false);

  // Save to localStorage whenever watchedRepos changes
  useEffect(() => {
    localStorage.setItem("watchedRepos", JSON.stringify(watchedRepos));
  }, [watchedRepos]);

  // Check token status on mount
  useEffect(() => {
    if (githubToken) {
      setTokenStatus("checking");
      validateToken(githubToken).then((isValid) => {
        setTokenStatus(isValid ? "valid" : "invalid");
      });
    } else {
      setTokenStatus("not-set");
    }
  }, [githubToken]);

  const handleAddRepo = () => {
    setError("");

    // Validate format (owner/repo)
    const repoPattern = /^[\w-]+\/[\w-]+$/;
    if (!repoPattern.test(newRepo.trim())) {
      setError("Please use format: owner/repository (e.g., vercel/next.js)");
      return;
    }

    // Check for duplicates
    if (watchedRepos.includes(newRepo.trim())) {
      setError("This repository is already being watched");
      return;
    }

    onUpdateRepos([...watchedRepos, newRepo.trim()]);
    setNewRepo("");
  };

  const handleRemoveRepo = (repo: string) => {
    onUpdateRepos(watchedRepos.filter((r) => r !== repo));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddRepo();
    }
  };

  const handleTokenSubmit = async () => {
    if (!tokenInput.trim()) {
      setError("Please enter a GitHub token");
      return;
    }

    setIsValidatingToken(true);
    setError("");

    try {
      const isValid = await validateToken(tokenInput.trim());
      if (isValid) {
        onUpdateToken(tokenInput.trim());
        setTokenInput("");
        setTokenStatus("valid");
      } else {
        setError(
          "Invalid GitHub token. Please check your token and try again."
        );
        setTokenStatus("invalid");
      }
    } catch (err) {
      setError("Failed to validate token. Please try again.");
      setTokenStatus("invalid");
    } finally {
      setIsValidatingToken(false);
    }
  };

  const handleClearToken = () => {
    onUpdateToken(null);
    setTokenInput("");
    setTokenStatus("not-set");
    setError("");
  };

  const getTokenStatusIcon = () => {
    switch (tokenStatus) {
      case "valid":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "invalid":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "checking":
        return <AlertCircle className="h-4 w-4 text-yellow-500 animate-spin" />;
      default:
        return <Key className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTokenStatusText = () => {
    switch (tokenStatus) {
      case "valid":
        return "Token is valid";
      case "invalid":
        return "Token is invalid";
      case "checking":
        return "Validating token...";
      default:
        return "No token set";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Repository Settings
          </DialogTitle>
          <DialogDescription>
            Add or remove repositories you want to track for pull requests
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* GitHub Token Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                GitHub Token
              </label>
              <div className="flex items-center gap-2">
                {getTokenStatusIcon()}
                <span className="text-sm text-muted-foreground">
                  {getTokenStatusText()}
                </span>
              </div>
            </div>

            {githubToken ? (
              <div className="flex items-center gap-2">
                <Input
                  type="password"
                  value="••••••••••••••••"
                  disabled
                  className="flex-1"
                />
                <Button variant="outline" size="sm" onClick={handleClearToken}>
                  Clear
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="Enter your GitHub personal access token"
                    value={tokenInput}
                    onChange={(e) => {
                      setTokenInput(e.target.value);
                      setError("");
                    }}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleTokenSubmit}
                    size="sm"
                    disabled={isValidatingToken || !tokenInput.trim()}
                  >
                    {isValidatingToken ? "Validating..." : "Save"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Create a personal access token at{" "}
                  <a
                    href="https://github.com/settings/tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    github.com/settings/tokens
                  </a>
                  . Required scopes:{" "}
                  <code className="bg-muted px-1 rounded">repo</code> for
                  private repos or{" "}
                  <code className="bg-muted px-1 rounded">public_repo</code> for
                  public only.
                </p>
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          {/* Add Repository */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Add Repository
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="owner/repository (e.g., vercel/next.js)"
                value={newRepo}
                onChange={(e) => {
                  setNewRepo(e.target.value);
                  setError("");
                }}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button onClick={handleAddRepo} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          {/* Watched Repositories List */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Watched Repositories ({watchedRepos.length})
            </label>
            {watchedRepos.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <Github className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No repositories configured. Add one above to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-2 rounded-lg border border-border p-4">
                {watchedRepos.map((repo) => (
                  <div
                    key={repo}
                    className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Github className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono text-sm text-foreground">
                        {repo}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveRepo(repo)}
                      className="h-7 w-7 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Note:</strong> Repository
              names should be in the format{" "}
              <code className="rounded bg-background px-1 py-0.5 font-mono text-xs">
                owner/repository
              </code>
              . For example: vercel/next.js, facebook/react, or
              microsoft/vscode.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
