import type { Prisma } from '@prisma/client';

function formatTenDigitPhoneVariants(digits: string): string[] {
  const area = digits.slice(0, 3);
  const prefix = digits.slice(3, 6);
  const line = digits.slice(6);
  return [
    digits,
    `(${area}) ${prefix}-${line}`,
    `${area}-${prefix}-${line}`,
    `${area} ${prefix} ${line}`,
    `${area}.${prefix}.${line}`,
    `+1${digits}`,
    `+1 (${area}) ${prefix}-${line}`,
  ];
}

function formatSevenDigitPhoneVariants(digits: string): string[] {
  const prefix = digits.slice(0, 3);
  const line = digits.slice(3);
  return [
    digits,
    `${prefix}-${line}`,
    `${prefix} ${line}`,
    `${prefix}.${line}`,
  ];
}

function extractDigitVariants(digits: string, trimmed: string): string[] {
  if (digits.length === 10) {
    return formatTenDigitPhoneVariants(digits);
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    const ten = digits.slice(1);
    return [ten, `+${digits}`, ...formatTenDigitPhoneVariants(ten)];
  }
  if (digits.length === 7) {
    return formatSevenDigitPhoneVariants(digits);
  }
  if (digits.length === 3) {
    return [digits, `(${digits})`];
  }
  if (digits.length > 3 && digits.length < 7) {
    const p1 = digits.slice(0, 3);
    const p2 = digits.slice(3);
    return [digits, `(${p1}) ${p2}`, `${p1}-${p2}`, `${p1} ${p2}`];
  }
  return [digits, trimmed];
}

export function extractPhoneSearchVariants(query: string): string[] {
  const trimmed = query.trim();
  if (/[a-zA-Z]/.test(trimmed)) {
    return [trimmed];
  }

  const digits = query.replace(/\D/g, '');
  if (digits.length < 3) {
    return [trimmed];
  }

  const variants = new Set<string>([trimmed, digits]);
  for (const v of extractDigitVariants(digits, trimmed)) {
    variants.add(v);
  }

  if (trimmed.startsWith('+')) {
    variants.add(`+${digits}`);
  }

  return Array.from(variants);
}

export function buildSearchWhereClause(query?: string): Prisma.UserWhereInput {
  const trimmed = query?.trim();
  if (!trimmed) {
    return {};
  }

  const phoneVariants = extractPhoneSearchVariants(trimmed);

  return {
    OR: [
      { name: { contains: trimmed, mode: 'insensitive' } },
      { email: { contains: trimmed, mode: 'insensitive' } },
      ...phoneVariants.map((phone) => ({ phone: { contains: phone } })),
      {
        vehicles: {
          some: {
            licensePlate: { contains: trimmed, mode: 'insensitive' },
            deletedAt: null,
          },
        },
      },
    ],
  };
}
