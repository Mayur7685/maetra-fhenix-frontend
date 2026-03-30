/**
 * E2E Encryption utilities using Web Crypto API.
 *
 * - ECDH P-256 keypair for key exchange
 * - AES-256-GCM for content encryption
 * - PBKDF2 for password-based key wrapping (private key backup)
 * - ECDH shared secret for granting CEKs to subscribers
 *
 * The server NEVER sees plaintext content or private keys.
 */

// ─── Key Generation ─────────────────────────────────────────────────────────

/** Generate an ECDH P-256 keypair. */
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true, // extractable
    ["deriveKey", "deriveBits"]
  );
}

/** Generate a random AES-256-GCM key (Content Encryption Key). */
export async function generateCEK(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

// ─── Key Serialization ──────────────────────────────────────────────────────

/** Export a CryptoKey to JWK JSON string. */
export async function exportKeyToJWK(key: CryptoKey): Promise<string> {
  const jwk = await crypto.subtle.exportKey("jwk", key);
  return JSON.stringify(jwk);
}

/** Import ECDH public key from JWK JSON string. */
export async function importPublicKey(jwkJson: string): Promise<CryptoKey> {
  const jwk = JSON.parse(jwkJson);
  return crypto.subtle.importKey("jwk", jwk, { name: "ECDH", namedCurve: "P-256" }, true, []);
}

/** Import ECDH private key from JWK JSON string. */
export async function importPrivateKey(jwkJson: string): Promise<CryptoKey> {
  const jwk = JSON.parse(jwkJson);
  return crypto.subtle.importKey("jwk", jwk, { name: "ECDH", namedCurve: "P-256" }, true, [
    "deriveKey",
    "deriveBits",
  ]);
}

/** Import AES-256-GCM key from JWK JSON string. */
export async function importCEK(jwkJson: string): Promise<CryptoKey> {
  const jwk = JSON.parse(jwkJson);
  return crypto.subtle.importKey("jwk", jwk, { name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

// ─── Password-based key wrapping (for private key backup) ───────────────────

/** Derive a wrapping key from a password using PBKDF2. */
async function deriveWrappingKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt.buffer as ArrayBuffer, iterations: 600_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt the private key JWK with the user's password.
 * Returns base64 string: salt(16) + iv(12) + ciphertext.
 */
export async function encryptPrivateKey(privateKeyJwk: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrappingKey = await deriveWrappingKey(password, salt);
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    wrappingKey,
    enc.encode(privateKeyJwk)
  );
  const packed = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  packed.set(salt, 0);
  packed.set(iv, salt.length);
  packed.set(new Uint8Array(ciphertext), salt.length + iv.length);
  return bufferToBase64(packed);
}

/**
 * Decrypt the private key JWK with the user's password.
 * Input is the base64 string from encryptPrivateKey.
 */
export async function decryptPrivateKey(encrypted: string, password: string): Promise<string> {
  const packed = base64ToBuffer(encrypted);
  const salt = packed.slice(0, 16);
  const iv = packed.slice(16, 28);
  const ciphertext = packed.slice(28);
  const wrappingKey = await deriveWrappingKey(password, salt);
  const dec = new TextDecoder();
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, wrappingKey, ciphertext);
  return dec.decode(plaintext);
}

// ─── ECDH shared secret → AES key ──────────────────────────────────────────

/**
 * Derive an AES-256-GCM key from ECDH shared secret.
 * Used to encrypt/decrypt the CEK when granting access to a subscriber.
 */
export async function deriveSharedKey(
  myPrivateKey: CryptoKey,
  theirPublicKey: CryptoKey
): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: theirPublicKey },
    myPrivateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// ─── AES-GCM encrypt / decrypt ─────────────────────────────────────────────

/**
 * Encrypt plaintext with AES-256-GCM.
 * Returns base64 string: iv(12) + ciphertext.
 */
export async function aesEncrypt(key: CryptoKey, plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext)
  );
  const packed = new Uint8Array(iv.length + ciphertext.byteLength);
  packed.set(iv, 0);
  packed.set(new Uint8Array(ciphertext), iv.length);
  return bufferToBase64(packed);
}

/**
 * Decrypt ciphertext with AES-256-GCM.
 * Input is base64 string from aesEncrypt.
 */
export async function aesDecrypt(key: CryptoKey, encryptedBase64: string): Promise<string> {
  const packed = base64ToBuffer(encryptedBase64);
  const iv = packed.slice(0, 12);
  const ciphertext = packed.slice(12);
  const dec = new TextDecoder();
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return dec.decode(plaintext);
}

// ─── CEK wrapping helpers ───────────────────────────────────────────────────

/**
 * Encrypt a CEK with an AES wrapping key (either derived from ECDH or from creator's own pubkey).
 * Returns base64-encoded encrypted CEK.
 */
export async function wrapCEK(cek: CryptoKey, wrappingKey: CryptoKey): Promise<string> {
  const cekJwk = await exportKeyToJWK(cek);
  return aesEncrypt(wrappingKey, cekJwk);
}

/**
 * Decrypt a CEK from its wrapped form.
 * Returns an AES-256-GCM CryptoKey.
 */
export async function unwrapCEK(encryptedCek: string, unwrappingKey: CryptoKey): Promise<CryptoKey> {
  const cekJwk = await aesDecrypt(unwrappingKey, encryptedCek);
  return importCEK(cekJwk);
}

/**
 * Encrypt CEK with the creator's own keypair (self-wrap for backup).
 * Uses ECDH with own pubkey + privkey to derive wrapping key.
 */
export async function wrapCEKForSelf(
  cek: CryptoKey,
  publicKey: CryptoKey,
  privateKey: CryptoKey
): Promise<string> {
  const selfKey = await deriveSharedKey(privateKey, publicKey);
  return wrapCEK(cek, selfKey);
}

/**
 * Decrypt CEK from self-wrapped backup.
 */
export async function unwrapCEKForSelf(
  encryptedCek: string,
  publicKey: CryptoKey,
  privateKey: CryptoKey
): Promise<CryptoKey> {
  const selfKey = await deriveSharedKey(privateKey, publicKey);
  return unwrapCEK(encryptedCek, selfKey);
}

/**
 * Encrypt CEK for a subscriber using ECDH(creator privkey, subscriber pubkey).
 */
export async function wrapCEKForSubscriber(
  cek: CryptoKey,
  creatorPrivateKey: CryptoKey,
  subscriberPublicKey: CryptoKey
): Promise<string> {
  const sharedKey = await deriveSharedKey(creatorPrivateKey, subscriberPublicKey);
  return wrapCEK(cek, sharedKey);
}

/**
 * Decrypt CEK as a subscriber using ECDH(subscriber privkey, creator pubkey).
 */
export async function unwrapCEKAsSubscriber(
  encryptedCek: string,
  subscriberPrivateKey: CryptoKey,
  creatorPublicKey: CryptoKey
): Promise<CryptoKey> {
  const sharedKey = await deriveSharedKey(subscriberPrivateKey, creatorPublicKey);
  return unwrapCEK(encryptedCek, sharedKey);
}

// ─── localStorage helpers ───────────────────────────────────────────────────

const LS_PUBKEY = "maetra_pubkey";
const LS_PRIVKEY = "maetra_privkey";
const LS_CEK_PREFIX = "maetra_cek_";

export function storeKeypairLocally(publicKeyJwk: string, privateKeyJwk: string) {
  localStorage.setItem(LS_PUBKEY, publicKeyJwk);
  localStorage.setItem(LS_PRIVKEY, privateKeyJwk);
}

export function getLocalKeypair(): { publicKeyJwk: string; privateKeyJwk: string } | null {
  const pub = localStorage.getItem(LS_PUBKEY);
  const priv = localStorage.getItem(LS_PRIVKEY);
  if (!pub || !priv) return null;
  return { publicKeyJwk: pub, privateKeyJwk: priv };
}

export function storeCEKLocally(creatorId: string, cekJwk: string) {
  localStorage.setItem(LS_CEK_PREFIX + creatorId, cekJwk);
}

export function getLocalCEK(creatorId: string): string | null {
  return localStorage.getItem(LS_CEK_PREFIX + creatorId);
}

export function clearCryptoStorage() {
  localStorage.removeItem(LS_PUBKEY);
  localStorage.removeItem(LS_PRIVKEY);
  // Clear all CEKs
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key?.startsWith(LS_CEK_PREFIX)) localStorage.removeItem(key);
  }
}

// ─── Base64 helpers ─────────────────────────────────────────────────────────

function bufferToBase64(buffer: Uint8Array): string {
  let binary = "";
  for (const byte of buffer) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
