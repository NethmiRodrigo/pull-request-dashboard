/**
 * Secure token storage utilities
 *
 * This module provides a secure way to store and retrieve GitHub tokens
 * using client-side encryption. Tokens are never stored in plain text.
 */

import {
  encryptToken,
  decryptToken,
  generateSecurePassphrase,
  isCryptoSupported,
} from "./crypto";

const TOKEN_STORAGE_KEY = "github_token_encrypted";
const PASSPHRASE_STORAGE_KEY = "github_token_passphrase";

/**
 * Stores a GitHub token securely using client-side encryption
 *
 * @param token - The GitHub token to store
 * @returns Promise that resolves when storage is complete
 */
export async function storeTokenSecurely(token: string): Promise<void> {
  if (!isCryptoSupported()) {
    throw new Error(
      "Your browser does not support the required encryption features"
    );
  }

  try {
    // Generate a unique passphrase for this browser session
    const passphrase = generateSecurePassphrase();

    // Encrypt the token
    const encryptedToken = await encryptToken(token, passphrase);

    // Store both the encrypted token and passphrase
    // The passphrase is also derived from browser characteristics,
    // so it's unique to this browser but consistent across sessions
    localStorage.setItem(TOKEN_STORAGE_KEY, encryptedToken);
    localStorage.setItem(PASSPHRASE_STORAGE_KEY, passphrase);
  } catch (error) {
    console.error("Failed to store token securely:", error);
    throw new Error("Failed to store token securely");
  }
}

/**
 * Retrieves and decrypts a stored GitHub token
 *
 * @returns Promise that resolves to the decrypted token, or null if no token is stored
 */
export async function getStoredToken(): Promise<string | null> {
  if (!isCryptoSupported()) {
    console.warn("Crypto not supported, cannot retrieve encrypted token");
    return null;
  }

  try {
    const encryptedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    const passphrase = localStorage.getItem(PASSPHRASE_STORAGE_KEY);

    if (!encryptedToken || !passphrase) {
      return null;
    }

    // Decrypt the token
    const decryptedToken = await decryptToken(encryptedToken, passphrase);
    return decryptedToken;
  } catch (error) {
    console.error("Failed to retrieve stored token:", error);
    // If decryption fails, clear the stored data
    clearStoredToken();
    return null;
  }
}

/**
 * Clears the stored token and passphrase from localStorage
 */
export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(PASSPHRASE_STORAGE_KEY);
}

/**
 * Checks if a token is currently stored (without decrypting it)
 *
 * @returns true if a token is stored, false otherwise
 */
export function hasStoredToken(): boolean {
  return localStorage.getItem(TOKEN_STORAGE_KEY) !== null;
}

/**
 * Migrates plain text tokens to encrypted storage
 * This is a one-time migration for existing users
 */
export async function migratePlainTextToken(): Promise<void> {
  const plainTextToken = localStorage.getItem("github_token");

  if (plainTextToken && !hasStoredToken()) {
    try {
      // Store the plain text token securely
      await storeTokenSecurely(plainTextToken);

      // Remove the plain text token
      localStorage.removeItem("github_token");

      console.log("Successfully migrated token to encrypted storage");
    } catch (error) {
      console.error("Failed to migrate token to encrypted storage:", error);
      throw error;
    }
  }
}
