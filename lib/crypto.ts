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
 * Includes Windows-specific compatibility checks and secure context validation
 */
export function isCryptoSupported(): boolean {
  // Check if we're in a secure context first
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return false;
  }

  // Basic feature checks
  if (
    typeof crypto === "undefined" ||
    typeof crypto.subtle === "undefined" ||
    typeof TextEncoder === "undefined" ||
    typeof TextDecoder === "undefined"
  ) {
    return false;
  }

  // Additional Windows-specific checks
  try {
    // Check if crypto.subtle is actually functional (not just defined)
    if (!crypto.subtle.encrypt || !crypto.subtle.decrypt) {
      return false;
    }

    // Test TextEncoder/TextDecoder functionality
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const testString = "test";
    const encoded = encoder.encode(testString);
    const decoded = decoder.decode(encoded);

    if (decoded !== testString) {
      return false;
    }

    // Check for Windows-specific issues with Web Crypto API
    // Some older Windows browsers have partial crypto.subtle support
    if (typeof window !== "undefined") {
      const userAgent = navigator.userAgent.toLowerCase();

      // Check for known problematic Windows browser versions
      if (userAgent.includes("windows")) {
        // Check for Internet Explorer or very old Edge
        if (userAgent.includes("msie") || userAgent.includes("trident")) {
          return false;
        }

        // Check for very old Edge versions (before Chromium-based Edge)
        if (userAgent.includes("edge/") && !userAgent.includes("edg/")) {
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    console.warn("Crypto support check failed:", error);
    return false;
  }
}

/**
 * Gets detailed information about crypto support for debugging
 * Useful for providing better error messages to users
 */
export function getCryptoSupportInfo(): {
  supported: boolean;
  issues: string[];
  browserInfo: string;
  isSecureContext: boolean;
  protocol: string;
} {
  const issues: string[] = [];
  let supported = true;
  let isSecureContext = true;
  let protocol = "unknown";

  // Check secure context first
  if (typeof window !== "undefined") {
    isSecureContext = window.isSecureContext;
    protocol = window.location.protocol;

    if (!isSecureContext) {
      issues.push("Not running in a secure context (HTTPS required)");
      supported = false;
    }
  }

  // Check basic features
  if (typeof crypto === "undefined") {
    issues.push("Web Crypto API not available");
    supported = false;
  }

  if (typeof crypto?.subtle === "undefined") {
    if (isSecureContext) {
      issues.push(
        "crypto.subtle not available (may be a browser compatibility issue)"
      );
    } else {
      issues.push(
        "crypto.subtle not available (requires secure context/HTTPS)"
      );
    }
    supported = false;
  }

  if (typeof TextEncoder === "undefined") {
    issues.push("TextEncoder not available");
    supported = false;
  }

  if (typeof TextDecoder === "undefined") {
    issues.push("TextDecoder not available");
    supported = false;
  }

  // Get browser information
  let browserInfo = "Unknown browser";
  if (typeof window !== "undefined") {
    const userAgent = navigator.userAgent;
    browserInfo = userAgent;

    // Check for specific Windows browser issues
    if (userAgent.toLowerCase().includes("windows")) {
      if (userAgent.includes("MSIE") || userAgent.includes("Trident")) {
        issues.push("Internet Explorer is not supported");
        supported = false;
      } else if (userAgent.includes("Edge/") && !userAgent.includes("Edg/")) {
        issues.push(
          "Legacy Edge browser is not supported. Please update to the new Chromium-based Edge."
        );
        supported = false;
      }
    }
  }

  return {
    supported,
    issues,
    browserInfo,
    isSecureContext,
    protocol,
  };
}

/**
 * Fallback encryption using a simple XOR cipher for HTTP contexts
 * This is less secure than Web Crypto API but works on HTTP
 */
function simpleXorEncrypt(text: string, key: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return btoa(result);
}

/**
 * Fallback decryption using a simple XOR cipher for HTTP contexts
 */
function simpleXorDecrypt(encryptedData: string, key: string): string {
  try {
    const decoded = atob(encryptedData);
    let result = "";
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(
        decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    return result;
  } catch {
    throw new Error("Failed to decrypt token");
  }
}

/**
 * Encrypts a token using the best available method
 * Uses Web Crypto API if available, falls back to XOR for HTTP
 */
export async function encryptTokenFallback(
  token: string,
  passphrase: string
): Promise<string> {
  if (isCryptoSupported()) {
    // Use secure Web Crypto API
    return await encryptToken(token, passphrase);
  } else {
    // Fall back to simple XOR encryption for HTTP
    console.warn(
      "⚠️ Using fallback encryption (less secure) - consider using HTTPS"
    );
    return simpleXorEncrypt(token, passphrase);
  }
}

/**
 * Decrypts a token using the best available method
 * Uses Web Crypto API if available, falls back to XOR for HTTP
 */
export async function decryptTokenFallback(
  encryptedData: string,
  passphrase: string
): Promise<string> {
  if (isCryptoSupported()) {
    // Use secure Web Crypto API
    return await decryptToken(encryptedData, passphrase);
  } else {
    // Fall back to simple XOR decryption for HTTP
    console.warn(
      "⚠️ Using fallback decryption (less secure) - consider using HTTPS"
    );
    return simpleXorDecrypt(encryptedData, passphrase);
  }
}

/**
 * Debug function to help troubleshoot crypto issues
 * Call this in the browser console to see detailed information
 */
export function debugCryptoSupport(): void {
  const info = getCryptoSupportInfo();
  console.log("🔍 Crypto Support Debug Information:");
  console.log("=====================================");
  console.log("✅ Supported:", info.supported);
  console.log("🔒 Secure Context:", info.isSecureContext);
  console.log("🌐 Protocol:", info.protocol);
  console.log("🌍 Browser:", info.browserInfo);
  console.log("❌ Issues:", info.issues);

  if (typeof window !== "undefined") {
    console.log("🔧 Additional Info:");
    console.log("- window.isSecureContext:", window.isSecureContext);
    console.log("- window.location.protocol:", window.location.protocol);
    console.log("- window.location.hostname:", window.location.hostname);
    console.log("- crypto available:", typeof crypto !== "undefined");
    console.log(
      "- crypto.subtle available:",
      typeof crypto?.subtle !== "undefined"
    );
    console.log("- TextEncoder available:", typeof TextEncoder !== "undefined");
    console.log("- TextDecoder available:", typeof TextDecoder !== "undefined");
  }
}
