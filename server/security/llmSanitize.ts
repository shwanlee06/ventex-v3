/**
 * LLM Output Sanitization
 * Prevents system prompt leaks, cross-tenant data exposure, and injection attacks
 * in AI-generated content before it reaches clients.
 */

// Patterns that indicate system prompt leakage
const SYSTEM_PROMPT_PATTERNS = [
  /you are a (?:helpful |AI )?assistant/i,
  /system prompt/i,
  /\bmy instructions\b/i,
  /\bas an AI\b/i,
  /\bI(?:'m| am) (?:a |an )?(?:language model|AI|artificial intelligence)\b/i,
  /\bOpenAI\b/i,
  /\bClaude\b/i,
  /\bGPT-?\d/i,
  /\banthropic\b/i,
];

// Patterns that indicate cross-tenant data leakage
const CROSS_TENANT_PATTERNS = [
  /(?:api[_-]?key|secret[_-]?key|access[_-]?token|bearer)\s*[:=]\s*\S+/i,
  /(?:password|passwd|pwd)\s*[:=]\s*\S+/i,
  /DATABASE_URL\s*[:=]/i,
  /JWT_SECRET\s*[:=]/i,
];

// HTML/script injection patterns
const INJECTION_PATTERNS = [
  /<script\b[^>]*>/i,
  /javascript:/i,
  /on(?:load|error|click|mouseover)\s*=/i,
  /<iframe\b/i,
  /<object\b/i,
  /<embed\b/i,
];

export interface SanitizeResult {
  text: string;
  flagged: boolean;
  flags: string[];
}

/**
 * Sanitize LLM output before returning to clients.
 * Returns cleaned text and any flags raised during sanitization.
 */
export function sanitizeLLMOutput(raw: string): SanitizeResult {
  const flags: string[] = [];
  let text = raw;

  // Check for system prompt leaks
  for (const pattern of SYSTEM_PROMPT_PATTERNS) {
    if (pattern.test(text)) {
      flags.push("system_prompt_leak");
      break;
    }
  }

  // Check for credential/secret leaks
  for (const pattern of CROSS_TENANT_PATTERNS) {
    if (pattern.test(text)) {
      flags.push("credential_leak");
      // Redact the matched content
      text = text.replace(pattern, "[REDACTED]");
    }
  }

  // Check for injection attempts
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      flags.push("injection_attempt");
      text = text.replace(pattern, "[REMOVED]");
    }
  }

  return {
    text,
    flagged: flags.length > 0,
    flags,
  };
}

/**
 * Quick check — returns true if the output appears safe.
 */
export function isLLMOutputSafe(raw: string): boolean {
  return !sanitizeLLMOutput(raw).flagged;
}
