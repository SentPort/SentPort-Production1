/**
 * Safely extracts hostname from a URL string without throwing errors
 * @param url - The URL string to parse
 * @param fallback - Fallback text to return if URL is invalid (default: "Invalid URL")
 * @returns The hostname or fallback text
 */
export function safeGetHostname(url: string | null | undefined, fallback: string = 'Invalid URL'): string {
  if (!url) return fallback;

  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    // If URL parsing fails, try to extract domain manually as a last resort
    try {
      const cleaned = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
      const domain = cleaned.split('/')[0].split('?')[0];
      if (domain && domain.includes('.')) {
        return domain;
      }
    } catch {
      // If manual extraction also fails, return fallback
    }
    return fallback;
  }
}

/**
 * Validates if a string is a valid URL
 * @param url - The URL string to validate
 * @returns true if valid, false otherwise
 */
export function isValidUrl(url: string | null | undefined): boolean {
  if (!url) return false;

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely parses a URL without throwing errors
 * @param url - The URL string to parse
 * @returns URL object if valid, null otherwise
 */
export function safeParseUrl(url: string | null | undefined): URL | null {
  if (!url) return null;

  try {
    return new URL(url);
  } catch {
    return null;
  }
}

/**
 * Normalizes a URL by ensuring it has a protocol (http:// or https://)
 * @param url - The URL string to normalize
 * @returns Normalized URL with protocol, or throws error if invalid
 */
export function normalizeUrl(url: string): string {
  if (!url || !url.trim()) {
    throw new Error('URL cannot be empty');
  }

  let trimmedUrl = url.trim();

  // If URL already has a protocol, validate and return it
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    // Validate that it's a proper URL
    try {
      new URL(trimmedUrl);
      return trimmedUrl;
    } catch {
      throw new Error(`Invalid URL format: ${trimmedUrl}`);
    }
  }

  // If URL starts with //, prepend https:
  if (trimmedUrl.startsWith('//')) {
    trimmedUrl = 'https:' + trimmedUrl;
    try {
      new URL(trimmedUrl);
      return trimmedUrl;
    } catch {
      throw new Error(`Invalid URL format: ${trimmedUrl}`);
    }
  }

  // Otherwise, prepend https://
  const normalizedUrl = 'https://' + trimmedUrl;

  // Validate the normalized URL
  try {
    new URL(normalizedUrl);
    return normalizedUrl;
  } catch {
    throw new Error(`Invalid URL format: ${trimmedUrl} (tried as ${normalizedUrl})`);
  }
}
