/**
 * Base64 encoding/decoding utilities
 */

/**
 * Encode a string to base64
 * @param str The string to encode
 * @returns The base64 encoded string
 */
export function encode(str: string): string {
  if (typeof window !== 'undefined') {
    // Browser environment
    return window.btoa(str);
  } else {
    // Node.js environment
    return Buffer.from(str).toString('base64');
  }
}

/**
 * Decode a base64 string
 * @param base64 The base64 string to decode
 * @returns The decoded string
 */
export function decode(base64: string): string {
  try {
    if (typeof window !== 'undefined') {
      // Browser environment
      return window.atob(base64);
    } else {
      // Node.js environment
      return Buffer.from(base64, 'base64').toString();
    }
  } catch (error) {
    console.error('Error decoding base64 string:', error);
    return '';
  }
} 