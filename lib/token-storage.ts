/**
 * Secure token storage utilities
 *
 * This module provides a secure way to store and retrieve GitHub tokens
 * using client-side encryption. Tokens are never stored in plain text.
 */

import {
  encryptTokenFallback,
  decryptTokenFallback,
  generateSecurePassphrase,
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
  console.log("💾 storeTokenSecurely called");

  try {
    // Generate a unique passphrase for this browser session
    const passphrase = generateSecurePassphrase();
    console.log("🔑 Generated passphrase length:", passphrase.length);

    // Encrypt the token using the best available method
    console.log("🔒 Encrypting token...");
    const encryptedToken = await encryptTokenFallback(token, passphrase);
    console.log("✅ Token encrypted, length:", encryptedToken.length);

    // Store both the encrypted token and passphrase
    // The passphrase is also derived from browser characteristics,
    // so it's unique to this browser but consistent across sessions
    localStorage.setItem(TOKEN_STORAGE_KEY, encryptedToken);
    localStorage.setItem(PASSPHRASE_STORAGE_KEY, passphrase);
    console.log("✅ Token stored in localStorage");
  } catch (error) {
    console.error("❌ Failed to store token securely:", error);
    throw new Error("Failed to store token securely");
  }
}

/**
 * Retrieves and decrypts a stored GitHub token
 *
 * @returns Promise that resolves to the decrypted token, or null if no token is stored
 */
export async function getStoredToken(): Promise<string | null> {
  console.log("🔍 getStoredToken called");

  try {
    const encryptedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    const passphrase = localStorage.getItem(PASSPHRASE_STORAGE_KEY);

    console.log("📦 localStorage check:", {
      hasEncryptedToken: !!encryptedToken,
      hasPassphrase: !!passphrase,
      encryptedTokenLength: encryptedToken?.length || 0,
      passphraseLength: passphrase?.length || 0,
    });

    if (!encryptedToken || !passphrase) {
      console.log("❌ No encrypted token or passphrase found");
      return null;
    }

    // Decrypt the token using the best available method
    console.log("🔓 Attempting to decrypt token...");
    const decryptedToken = await decryptTokenFallback(
      encryptedToken,
      passphrase
    );
    console.log("✅ Token decrypted successfully");
    return decryptedToken;
  } catch (error) {
    console.error("❌ Failed to retrieve stored token:", error);

    // Try to regenerate the passphrase and decrypt with the new one
    // This handles cases where the passphrase generation algorithm changed
    try {
      const encryptedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (encryptedToken) {
        const newPassphrase = generateSecurePassphrase();
        const decryptedToken = await decryptTokenFallback(
          encryptedToken,
          newPassphrase
        );

        // If successful, update the stored passphrase
        localStorage.setItem(PASSPHRASE_STORAGE_KEY, newPassphrase);
        console.log("Successfully decrypted token with regenerated passphrase");
        return decryptedToken;
      }
    } catch (retryError) {
      console.error(
        "Failed to decrypt with regenerated passphrase:",
        retryError
      );
    }

    // If all attempts fail, clear the stored data
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

/**
 * Migrates tokens encrypted with old passphrase generation to new method
 * This handles cases where the passphrase algorithm was updated
 */
export async function migrateEncryptedToken(): Promise<void> {
  const encryptedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  const oldPassphrase = localStorage.getItem(PASSPHRASE_STORAGE_KEY);

  if (!encryptedToken || !oldPassphrase) {
    return;
  }

  try {
    // Try to decrypt with the old passphrase using the best available method
    const decryptedToken = await decryptTokenFallback(
      encryptedToken,
      oldPassphrase
    );

    // If successful, re-encrypt with the new passphrase generation method
    const newPassphrase = generateSecurePassphrase();
    const newEncryptedToken = await encryptTokenFallback(
      decryptedToken,
      newPassphrase
    );

    // Update storage with new encrypted token and passphrase
    localStorage.setItem(TOKEN_STORAGE_KEY, newEncryptedToken);
    localStorage.setItem(PASSPHRASE_STORAGE_KEY, newPassphrase);

    console.log(
      "Successfully migrated encrypted token to new passphrase method"
    );
  } catch (error) {
    // If decryption fails, the token might already be using the new method
    // or there might be a different issue - don't throw, just log
    console.log("Token migration not needed or failed:", error);
  }
}
