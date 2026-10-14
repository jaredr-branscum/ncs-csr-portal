/**
 * Masks an email address for privacy and zero-trust compliance (RFC 5322 local-part).
 * e.g. "jordan.blake@example.com" -> "j***e@example.com"
 * e.g. "sam@example.com" -> "s***m@example.com"
 * e.g. "a@example.com" -> "a***@example.com"
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) {
    return '***';
  }

  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) {
    return '***';
  }

  if (localPart.length <= 1) {
    return `${localPart}***@${domain}`;
  }

  if (localPart.length === 2) {
    return `${localPart[0]}***@${domain}`;
  }

  return `${localPart[0]}***${localPart[localPart.length - 1]}@${domain}`;
}

/**
 * Masks a phone number following universal international (E.164) conventions.
 * Preserves international country code if prefixed with '+', masking the middle
 * and exposing only the final 4 digits for identity verification.
 * e.g. "(555) 234-5678" -> "•••• •••• 5678"
 * e.g. "+1 (555) 234-5678" -> "+1 •••• 5678"
 * e.g. "+44 20 7946 0958" -> "+44 •••• 0958"
 */
export function maskPhone(phone: string): string {
  if (!phone) {
    return '••••';
  }

  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) {
    return '••••';
  }

  const last4 = digits.slice(-4);
  const trimmed = phone.trim();

  if (trimmed.startsWith('+')) {
    const countryCodeMatch = trimmed.match(/^\+(\d{1,3})/);
    if (countryCodeMatch) {
      return `+${countryCodeMatch[1]} •••• ${last4}`;
    }
  }

  return `•••• •••• ${last4}`;
}
