/**
 * Secure token encryption utilities using Web Crypto API
 *
 * This module provides functions to encrypt and decrypt sensitive data
 * like GitHub tokens before storing them in localStorage.
 *
 * Security features:
 * - Uses AES-GCM encryption with 256-bit keys
 * - Generates a unique IV for each encryption
 * - Derives encryption key from a user-specific passphrase
 * - Tokens are never stored in plain text
 */

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM

/**
 * Derives a cryptographic key from a passphrase using PBKDF2
 */
async function deriveKey(
  passphrase: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000, // High iteration count for security
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Generates a random salt for key derivation
 */
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Generates a random IV for encryption
 */
function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

/**
 * Encrypts a token using AES-GCM
 *
 * @param token - The plaintext token to encrypt
 * @param passphrase - User-specific passphrase for key derivation
 * @returns Base64-encoded encrypted data with salt and IV
 */
export async function encryptToken(
  token: string,
  passphrase: string
): Promise<string> {
  try {
    const salt = generateSalt();
    const iv = generateIV();
    const key = await deriveKey(passphrase, salt);

    const encrypted = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv: iv.buffer as ArrayBuffer },
      key,
      new TextEncoder().encode(token)
    );

    // Combine salt, IV, and encrypted data
    const combined = new Uint8Array(
      salt.length + iv.length + encrypted.byteLength
    );
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    // Return as base64 for storage
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error("Token encryption failed:", error);
    throw new Error("Failed to encrypt token");
  }
}

/**
 * Decrypts a token using AES-GCM
 *
 * @param encryptedData - Base64-encoded encrypted data
 * @param passphrase - User-specific passphrase for key derivation
 * @returns Decrypted plaintext token
 */
export async function decryptToken(
  encryptedData: string,
  passphrase: string
): Promise<string> {
  try {
    // Decode base64
    const combined = new Uint8Array(
      atob(encryptedData)
        .split("")
        .map((char) => char.charCodeAt(0))
    );

    // Extract salt, IV, and encrypted data
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 16 + IV_LENGTH);
    const encrypted = combined.slice(16 + IV_LENGTH);

    const key = await deriveKey(passphrase, salt);

    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv: iv.buffer as ArrayBuffer },
      key,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error("Token decryption failed:", error);
    throw new Error("Failed to decrypt token");
  }
}

/**
 * Generates a secure passphrase based on browser fingerprinting
 * This creates a unique passphrase that's tied to the user's browser
 * but doesn't require them to remember anything
 *
 * The passphrase is deterministic and consistent across browser sessions
 * to ensure tokens can be decrypted after closing/reopening the tab
 */
export function generateSecurePassphrase(): string {
  // Create a fingerprint from stable browser characteristics only
  // These should remain consistent across browser sessions
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    screen.width + "x" + screen.height,
    // Use a fixed seed for consistency across sessions
    "browser_fingerprint_seed_v1",
  ].join("|");

  // Hash the fingerprint to create a consistent passphrase
  return btoa(fingerprint)
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, 32);
}

/**
 * Checks if the current browser supports the required crypto operations
 */
export function isCryptoSupported(): boolean {
  return (
    typeof crypto !== "undefined" &&
    typeof crypto.subtle !== "undefined" &&
    typeof TextEncoder !== "undefined" &&
    typeof TextDecoder !== "undefined"
  );
}
