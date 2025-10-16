"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { X, Plus, Github } from "lucide-react"

interface RepositorySettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  watchedRepos: string[]
  onUpdateRepos: (repos: string[]) => void
}

export function RepositorySettings({ open, onOpenChange, watchedRepos, onUpdateRepos }: RepositorySettingsProps) {
  const [newRepo, setNewRepo] = useState("")
  const [error, setError] = useState("")

  // Save to localStorage whenever watchedRepos changes
  useEffect(() => {
    localStorage.setItem("watchedRepos", JSON.stringify(watchedRepos))
  }, [watchedRepos])

  const handleAddRepo = () => {
    setError("")

    // Validate format (owner/repo)
    const repoPattern = /^[\w-]+\/[\w-]+$/
    if (!repoPattern.test(newRepo.trim())) {
      setError("Please use format: owner/repository (e.g., vercel/next.js)")
      return
    }

    // Check for duplicates
    if (watchedRepos.includes(newRepo.trim())) {
      setError("This repository is already being watched")
      return
    }

    onUpdateRepos([...watchedRepos, newRepo.trim()])
    setNewRepo("")
  }

  const handleRemoveRepo = (repo: string) => {
    onUpdateRepos(watchedRepos.filter((r) => r !== repo))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddRepo()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Repository Settings
          </DialogTitle>
          <DialogDescription>Add or remove repositories you want to track for pull requests</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add Repository */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Add Repository</label>
            <div className="flex gap-2">
              <Input
                placeholder="owner/repository (e.g., vercel/next.js)"
                value={newRepo}
                onChange={(e) => {
                  setNewRepo(e.target.value)
                  setError("")
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
            <label className="text-sm font-medium text-foreground">Watched Repositories ({watchedRepos.length})</label>
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
                  <div key={repo} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Github className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono text-sm text-foreground">{repo}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveRepo(repo)} className="h-7 w-7 p-0">
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
              <strong className="text-foreground">Note:</strong> Repository names should be in the format{" "}
              <code className="rounded bg-background px-1 py-0.5 font-mono text-xs">owner/repository</code>. For
              example: vercel/next.js, facebook/react, or microsoft/vscode.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
