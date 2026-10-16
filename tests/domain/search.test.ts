import { describe, it, expect } from 'vitest';
import { buildSearchWhereClause, extractPhoneSearchVariants } from '@/lib/domain/search';

describe('buildSearchWhereClause', () => {
  it('returns an empty object when query is undefined, null, or empty string', () => {
    expect(buildSearchWhereClause()).toEqual({});
    expect(buildSearchWhereClause(undefined)).toEqual({});
    expect(buildSearchWhereClause('')).toEqual({});
  });

  it('returns an empty object when query is only whitespace', () => {
    expect(buildSearchWhereClause('   ')).toEqual({});
    expect(buildSearchWhereClause('\t\n')).toEqual({});
  });

  it('builds multi-field OR clause for customer details and vehicle license plates', () => {
    const clause = buildSearchWhereClause('Jordan');

    expect(clause).toEqual({
      OR: [
        { name: { contains: 'Jordan', mode: 'insensitive' } },
        { email: { contains: 'Jordan', mode: 'insensitive' } },
        { phone: { contains: 'Jordan' } },
        {
          vehicles: {
            some: {
              licensePlate: { contains: 'Jordan', mode: 'insensitive' },
              deletedAt: null,
            },
          },
        },
      ],
    });
  });

  it('trims leading and trailing whitespace from query', () => {
    const clause = buildSearchWhereClause('  CA-992  ');

    expect(clause).toEqual({
      OR: [
        { name: { contains: 'CA-992', mode: 'insensitive' } },
        { email: { contains: 'CA-992', mode: 'insensitive' } },
        { phone: { contains: 'CA-992' } },
        {
          vehicles: {
            some: {
              licensePlate: { contains: 'CA-992', mode: 'insensitive' },
              deletedAt: null,
            },
          },
        },
      ],
    });
  });

  it('generates multi-format phone clauses when searching with 10 digits', () => {
    const clause = buildSearchWhereClause('444 444 4444');
    expect(clause.OR).toBeDefined();

    const phoneClauses = clause.OR!.filter((c) => 'phone' in c);
    const matchedPhones = phoneClauses.map((c) => (c as { phone: { contains: string } }).phone.contains);

    expect(matchedPhones).toContain('(444) 444-4444');
    expect(matchedPhones).toContain('444-444-4444');
    expect(matchedPhones).toContain('4444444444');
    expect(matchedPhones).toContain('+14444444444');
  });

  it('generates equivalent phone clauses for dashed, dotted, or pure digits', () => {
    const fromDashed = extractPhoneSearchVariants('444-444-4444');
    const fromSpaced = extractPhoneSearchVariants('444 444 4444');
    const fromPlain = extractPhoneSearchVariants('4444444444');

    expect(fromDashed).toContain('(444) 444-4444');
    expect(fromSpaced).toContain('(444) 444-4444');
    expect(fromPlain).toContain('(444) 444-4444');
  });

  it('handles 11-digit numbers starting with 1 (NANP country code)', () => {
    const variants = extractPhoneSearchVariants('15551011001');

    expect(variants).toContain('5551011001');
    expect(variants).toContain('(555) 101-1001');
    expect(variants).toContain('555-101-1001');
    expect(variants).toContain('+15551011001');
  });

  it('handles 7-digit local phone numbers', () => {
    const variants = extractPhoneSearchVariants('101-1001');

    expect(variants).toContain('101-1001');
    expect(variants).toContain('1011001');
    expect(variants).toContain('101 1001');
    expect(variants).toContain('101.1001');
  });

  it('handles 3-digit area code queries', () => {
    const variants = extractPhoneSearchVariants('555');

    expect(variants).toContain('555');
    expect(variants).toContain('(555)');
  });

  it('handles partial dialing with 4 to 6 digits', () => {
    const variants = extractPhoneSearchVariants('555101');

    expect(variants).toContain('555101');
    expect(variants).toContain('(555) 101');
    expect(variants).toContain('555-101');
    expect(variants).toContain('555 101');
  });

  it('handles international numbers prefixed with +', () => {
    const variants = extractPhoneSearchVariants('+44 20 7946 0958');

    expect(variants).toContain('+44 20 7946 0958');
    expect(variants).toContain('442079460958');
    expect(variants).toContain('+442079460958');
  });

  it('returns raw trimmed query when less than 3 digits are provided', () => {
    const variants = extractPhoneSearchVariants('42');
    expect(variants).toEqual(['42']);
  });
});
