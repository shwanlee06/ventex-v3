import { describe, it, expect } from "vitest";
import {
  encrypt,
  decrypt,
  encryptBuffer,
  decryptBuffer,
  encryptFields,
  decryptFields,
  isEncryptionConfigured,
  hashForIndex,
} from "./encryption";

describe("AES-256-GCM Encryption Module", () => {
  it("should have encryption configured with master key", () => {
    expect(isEncryptionConfigured()).toBe(true);
  });

  it("should encrypt and decrypt a string", () => {
    const plaintext = "Sensitive client financial data: $5,000,000 investment";
    const encrypted = encrypt(plaintext, "test.context");
    
    // Encrypted should start with prefix
    expect(encrypted.startsWith("enc:")).toBe(true);
    // Encrypted should not contain the plaintext
    expect(encrypted).not.toContain(plaintext);
    
    const decrypted = decrypt(encrypted, "test.context");
    expect(decrypted).toBe(plaintext);
  });

  it("should not double-encrypt already encrypted values", () => {
    const plaintext = "Secret data";
    const encrypted = encrypt(plaintext, "test");
    const doubleEncrypted = encrypt(encrypted, "test");
    
    // Should be the same — no double encryption
    expect(doubleEncrypted).toBe(encrypted);
  });

  it("should handle empty strings gracefully", () => {
    expect(encrypt("", "test")).toBe("");
    expect(decrypt("", "test")).toBe("");
  });

  it("should fail decryption with wrong context", () => {
    const plaintext = "Context-sensitive data";
    const encrypted = encrypt(plaintext, "context.a");
    
    expect(() => decrypt(encrypted, "context.b")).toThrow();
  });

  it("should produce different ciphertexts for same plaintext (random IV)", () => {
    const plaintext = "Same input text";
    const enc1 = encrypt(plaintext, "test");
    const enc2 = encrypt(plaintext, "test");
    
    // Different IVs should produce different ciphertexts
    expect(enc1).not.toBe(enc2);
    
    // But both should decrypt to the same value
    expect(decrypt(enc1, "test")).toBe(plaintext);
    expect(decrypt(enc2, "test")).toBe(plaintext);
  });

  it("should encrypt and decrypt buffers", () => {
    const data = Buffer.from("PDF file content bytes here...");
    const { iv, tag, encrypted } = encryptBuffer(data, "file.test");
    
    expect(encrypted).not.toEqual(data);
    
    const decrypted = decryptBuffer(encrypted, iv, tag, "file.test");
    expect(decrypted).toEqual(data);
  });

  it("should encrypt and decrypt object fields", () => {
    const obj = {
      id: 1,
      name: "Shwan Lee",
      email: "shwan@thalora.com",
      amount: "$5,000,000",
      publicField: "This stays plain",
    };

    const encrypted = encryptFields(
      obj,
      ["name", "email", "amount"],
      "client.pii"
    );

    // Encrypted fields should be different
    expect(encrypted.name).not.toBe(obj.name);
    expect(encrypted.email).not.toBe(obj.email);
    expect(encrypted.amount).not.toBe(obj.amount);
    // Non-encrypted field should be unchanged
    expect(encrypted.publicField).toBe(obj.publicField);
    expect(encrypted.id).toBe(obj.id);

    const decrypted = decryptFields(
      encrypted,
      ["name", "email", "amount"],
      "client.pii"
    );

    expect(decrypted.name).toBe(obj.name);
    expect(decrypted.email).toBe(obj.email);
    expect(decrypted.amount).toBe(obj.amount);
  });

  it("should produce deterministic hashes for indexing", () => {
    const hash1 = hashForIndex("client@example.com", "email.index");
    const hash2 = hashForIndex("client@example.com", "email.index");
    
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 hex
    
    // Different values should produce different hashes
    const hash3 = hashForIndex("other@example.com", "email.index");
    expect(hash3).not.toBe(hash1);
  });

  it("should handle JSON objects in encrypted fields", () => {
    const obj = {
      id: 1,
      metadata: { risk: "high", amount: 500000, tags: ["urgent", "legal"] },
    };

    const encrypted = encryptFields(obj, ["metadata"], "venture.meta");
    expect(typeof encrypted.metadata).toBe("string");
    expect((encrypted.metadata as string).startsWith("enc:")).toBe(true);

    const decrypted = decryptFields(encrypted, ["metadata"], "venture.meta");
    expect(decrypted.metadata).toEqual(obj.metadata);
  });
});
