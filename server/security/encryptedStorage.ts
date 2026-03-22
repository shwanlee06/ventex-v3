/**
 * Encrypted Storage — AES-256-GCM file encryption before S3 upload
 * 
 * Files are encrypted with AES-256-GCM before being uploaded to S3.
 * The encryption metadata (IV, auth tag) is prepended to the file data.
 * Even with S3 access, files are unreadable without the master key.
 */

import { storagePut, storageGet } from "../storage";
import { encryptBuffer, decryptBuffer, isEncryptionConfigured } from "./encryption";

// File format: [12 bytes IV][16 bytes auth tag][encrypted data]
const IV_SIZE = 12;
const TAG_SIZE = 16;
const HEADER_SIZE = IV_SIZE + TAG_SIZE;

/**
 * Encrypt a file buffer and upload to S3.
 * Returns the same { key, url } as storagePut.
 */
export async function encryptedStoragePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string; encrypted: boolean }> {
  // If encryption is not configured, fall back to plain upload
  if (!isEncryptionConfigured()) {
    const result = await storagePut(relKey, data, contentType);
    return { ...result, encrypted: false };
  }

  // Convert to Buffer
  const plainBuffer = typeof data === "string"
    ? Buffer.from(data, "utf-8")
    : Buffer.from(data);

  // Encrypt
  const { iv, tag, encrypted } = encryptBuffer(plainBuffer, "file.storage");

  // Pack: [IV][Tag][EncryptedData]
  const packed = Buffer.concat([iv, tag, encrypted]);

  // Upload encrypted data to S3
  // Use .enc extension to mark as encrypted
  const encKey = relKey.endsWith(".enc") ? relKey : `${relKey}.enc`;
  const result = await storagePut(encKey, packed, "application/octet-stream");

  return { ...result, encrypted: true };
}

/**
 * Download and decrypt a file from S3.
 * Returns the decrypted buffer.
 */
export async function encryptedStorageGet(
  relKey: string
): Promise<{ data: Buffer; url: string; encrypted: boolean }> {
  const { url } = await storageGet(relKey);

  // Fetch the file
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Check if file is encrypted (has .enc extension or is large enough to have header)
  const isEncrypted = relKey.endsWith(".enc") && buffer.length > HEADER_SIZE;

  if (!isEncrypted || !isEncryptionConfigured()) {
    return { data: buffer, url, encrypted: false };
  }

  // Unpack: [IV][Tag][EncryptedData]
  const iv = buffer.subarray(0, IV_SIZE);
  const tag = buffer.subarray(IV_SIZE, HEADER_SIZE);
  const encryptedData = buffer.subarray(HEADER_SIZE);

  const decrypted = decryptBuffer(encryptedData, iv, tag, "file.storage");

  return { data: decrypted, url, encrypted: true };
}
