"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Key,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { validateToken } from "@/lib/github";
import { isCryptoSupported } from "@/lib/crypto";

interface TokenSetupProps {
  onTokenSet: (token: string) => void;
}

export function TokenSetup({ onTokenSet }: TokenSetupProps) {
  const [token, setToken] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [cryptoSupported, setCryptoSupported] = useState(true);

  // Check crypto support on component mount
  useEffect(() => {
    setCryptoSupported(isCryptoSupported());
  }, []);

  const handleTokenSubmit = async () => {
    if (!token.trim()) {
      setError("Please enter a GitHub token");
      return;
    }

    if (!cryptoSupported) {
      setError(
        "Your browser does not support the required encryption features. Please use a modern browser."
      );
      return;
    }

    setIsValidating(true);
    setError("");

    try {
      const valid = await validateToken(token.trim());
      if (valid) {
        setIsValid(true);
        onTokenSet(token.trim());
      } else {
        setError(
          "Invalid GitHub token. Please check your token and try again."
        );
        setIsValid(false);
      }
    } catch (err) {
      console.error("Error validating token:", err);
      setError("Failed to validate token. Please try again.");
      setIsValid(false);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-foreground">
              <Key className="h-6 w-6 text-background" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-foreground">
            GitHub Setup Required
          </h1>
          <p className="text-muted-foreground">
            Enter your GitHub personal access token to start tracking pull
            requests
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              GitHub Personal Access Token
            </label>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  setError("");
                  setIsValid(false);
                }}
                className="flex-1"
              />
              <Button
                onClick={handleTokenSubmit}
                disabled={isValidating || !token.trim()}
              >
                {isValidating ? "Validating..." : "Continue"}
              </Button>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <XCircle className="h-4 w-4" />
                {error}
              </div>
            )}
            {isValid && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                Token is valid! Loading your dashboard...
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">
              How to create a token:
            </h3>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>
                Go to{" "}
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline inline-flex items-center gap-1"
                >
                  GitHub Settings → Personal Access Tokens
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                Click &quot;Generate new token&quot; → &quot;Generate new token
                (classic)&quot;
              </li>
              <li>Give it a descriptive name like &quot;PR Dashboard&quot;</li>
              <li>Set expiration (recommended: 90 days or custom)</li>
              <li>
                Select scopes:
                <ul className="ml-4 mt-1 space-y-1">
                  <li>
                    •{" "}
                    <code className="bg-muted px-1 rounded text-xs">repo</code>{" "}
                    - for private repositories
                  </li>
                  <li>
                    •{" "}
                    <code className="bg-muted px-1 rounded text-xs">
                      public_repo
                    </code>{" "}
                    - for public repositories only
                  </li>
                </ul>
              </li>
              <li>Click &quot;Generate token&quot; and copy it</li>
            </ol>
          </div>

          <div className="rounded-lg bg-muted/50 p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">
                  Security Note:
                </p>
                <p>
                  Your token is encrypted using your browser&apos;s built-in
                  security features and stored locally. It&apos;s never sent to
                  any external servers except GitHub&apos;s API. You can revoke
                  it anytime from your GitHub settings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
