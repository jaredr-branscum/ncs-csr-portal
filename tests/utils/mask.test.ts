import { describe, it, expect } from 'vitest';
import { maskEmail, maskPhone } from '../../lib/utils/mask';

describe('PII masking utilities', () => {
  describe('maskEmail', () => {
    it('masks standard email addresses preserving first and last local-part char', () => {
      expect(maskEmail('jordan.blake@example.com')).toBe('j***e@example.com');
      expect(maskEmail('michael.chang@example.com')).toBe('m***g@example.com');
      expect(maskEmail('sam@test.com')).toBe('s***m@test.com');
    });

    it('handles 2-character local-parts', () => {
      expect(maskEmail('jo@domain.com')).toBe('j***@domain.com');
    });

    it('handles 1-character local-parts', () => {
      expect(maskEmail('a@domain.com')).toBe('a***@domain.com');
    });

    it('returns fallback for invalid or empty emails', () => {
      expect(maskEmail('')).toBe('***');
      expect(maskEmail('invalidemail')).toBe('***');
      expect(maskEmail('@domain.com')).toBe('***');
      expect(maskEmail('user@')).toBe('***');
    });
  });

  describe('maskPhone', () => {
    it('masks standard phone numbers with universal bullet formatting', () => {
      expect(maskPhone('(555) 234-5678')).toBe('•••• •••• 5678');
      expect(maskPhone('555-876-5432')).toBe('•••• •••• 5432');
    });

    it('preserves international country code when prefixed with +', () => {
      expect(maskPhone('+1 (555) 345-6789')).toBe('+1 •••• 6789');
      expect(maskPhone('+44 20 7946 0958')).toBe('+44 •••• 0958');
      expect(maskPhone('+33 1 42 68 55 55')).toBe('+33 •••• 5555');
      expect(maskPhone('+nonumeric5678')).toBe('•••• •••• 5678');
    });

    it('handles short or empty phone strings gracefully', () => {
      expect(maskPhone('')).toBe('••••');
      expect(maskPhone('123')).toBe('••••');
    });
  });
});
