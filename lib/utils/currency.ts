export interface CurrencyFormatOptions {
  locale?: string;
  currency?: string;
}

export const DEFAULT_LOCALE = 'en-US';
export const DEFAULT_CURRENCY = 'USD';

export function formatCurrency(
  cents: number,
  options?: string | CurrencyFormatOptions
): string {
  if (typeof options === 'string') {
    return new Intl.NumberFormat(DEFAULT_LOCALE, {
      style: 'currency',
      currency: options,
    }).format(cents / 100);
  }

  const locale = options?.locale ?? DEFAULT_LOCALE;
  const currency = options?.currency ?? DEFAULT_CURRENCY;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(cents / 100);
}
