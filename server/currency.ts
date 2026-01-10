/**
 * Multi-Currency Support Service
 *
 * Provides currency conversion, formatting, and exchange rate management
 * for international warehouse operations
 */

export type CurrencyCode =
  | "USD" // US Dollar
  | "EUR" // Euro
  | "GBP" // British Pound
  | "CAD" // Canadian Dollar
  | "AUD" // Australian Dollar
  | "JPY" // Japanese Yen
  | "CNY" // Chinese Yuan
  | "MXN" // Mexican Peso
  | "INR" // Indian Rupee
  | "BRL" // Brazilian Real
  | "ZAR" // South African Rand
  | "KRW" // South Korean Won
  | "SGD" // Singapore Dollar
  | "HKD" // Hong Kong Dollar
  | "CHF" // Swiss Franc
  | "SEK" // Swedish Krona
  | "NOK" // Norwegian Krone
  | "DKK" // Danish Krone
  | "PLN" // Polish Zloty
  | "THB" // Thai Baht
  | "MYR" // Malaysian Ringgit
  | "IDR" // Indonesian Rupiah
  | "PHP" // Philippine Peso
  | "VND" // Vietnamese Dong
  | "NZD" // New Zealand Dollar
  | "TRY" // Turkish Lira
  | "RUB" // Russian Ruble
  | "AED" // UAE Dirham
  | "SAR"; // Saudi Riyal

export interface CurrencyInfo {
  code: CurrencyCode;
  name: string;
  symbol: string;
  decimals: number;
  position: "before" | "after"; // Symbol position
}

export interface ExchangeRate {
  from: CurrencyCode;
  to: CurrencyCode;
  rate: number;
  date: Date;
  source: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  USD: { code: "USD", name: "US Dollar", symbol: "$", decimals: 2, position: "before" },
  EUR: { code: "EUR", name: "Euro", symbol: "€", decimals: 2, position: "before" },
  GBP: { code: "GBP", name: "British Pound", symbol: "£", decimals: 2, position: "before" },
  CAD: { code: "CAD", name: "Canadian Dollar", symbol: "C$", decimals: 2, position: "before" },
  AUD: { code: "AUD", name: "Australian Dollar", symbol: "A$", decimals: 2, position: "before" },
  JPY: { code: "JPY", name: "Japanese Yen", symbol: "¥", decimals: 0, position: "before" },
  CNY: { code: "CNY", name: "Chinese Yuan", symbol: "¥", decimals: 2, position: "before" },
  MXN: { code: "MXN", name: "Mexican Peso", symbol: "$", decimals: 2, position: "before" },
  INR: { code: "INR", name: "Indian Rupee", symbol: "₹", decimals: 2, position: "before" },
  BRL: { code: "BRL", name: "Brazilian Real", symbol: "R$", decimals: 2, position: "before" },
  ZAR: { code: "ZAR", name: "South African Rand", symbol: "R", decimals: 2, position: "before" },
  KRW: { code: "KRW", name: "South Korean Won", symbol: "₩", decimals: 0, position: "before" },
  SGD: { code: "SGD", name: "Singapore Dollar", symbol: "S$", decimals: 2, position: "before" },
  HKD: { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", decimals: 2, position: "before" },
  CHF: { code: "CHF", name: "Swiss Franc", symbol: "CHF", decimals: 2, position: "before" },
  SEK: { code: "SEK", name: "Swedish Krona", symbol: "kr", decimals: 2, position: "after" },
  NOK: { code: "NOK", name: "Norwegian Krone", symbol: "kr", decimals: 2, position: "after" },
  DKK: { code: "DKK", name: "Danish Krone", symbol: "kr", decimals: 2, position: "after" },
  PLN: { code: "PLN", name: "Polish Zloty", symbol: "zł", decimals: 2, position: "after" },
  THB: { code: "THB", name: "Thai Baht", symbol: "฿", decimals: 2, position: "before" },
  MYR: { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", decimals: 2, position: "before" },
  IDR: { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", decimals: 0, position: "before" },
  PHP: { code: "PHP", name: "Philippine Peso", symbol: "₱", decimals: 2, position: "before" },
  VND: { code: "VND", name: "Vietnamese Dong", symbol: "₫", decimals: 0, position: "after" },
  NZD: { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", decimals: 2, position: "before" },
  TRY: { code: "TRY", name: "Turkish Lira", symbol: "₺", decimals: 2, position: "before" },
  RUB: { code: "RUB", name: "Russian Ruble", symbol: "₽", decimals: 2, position: "after" },
  AED: { code: "AED", name: "UAE Dirham", symbol: "د.إ", decimals: 2, position: "before" },
  SAR: { code: "SAR", name: "Saudi Riyal", symbol: "﷼", decimals: 2, position: "before" },
};

/**
 * Currency Service - Manages exchange rates and conversions
 */
export class CurrencyService {
  // In-memory cache for exchange rates (expires after 24 hours)
  private static rateCache: Map<string, { rate: number; timestamp: number }> = new Map();
  private static CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Get exchange rate from one currency to another
   * Uses OpenExchangeRates API if EXCHANGE_RATE_API_KEY is configured
   * Falls back to cached rates or approximate rates
   */
  static async getExchangeRate(from: CurrencyCode, to: CurrencyCode): Promise<number> {
    if (from === to) return 1.0;

    const cacheKey = `${from}-${to}`;
    const cached = this.rateCache.get(cacheKey);

    // Return cached rate if still valid
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.rate;
    }

    // Try to fetch live rates
    const apiKey = process.env.EXCHANGE_RATE_API_KEY;
    if (apiKey) {
      try {
        const response = await fetch(
          `https://openexchangerates.org/api/latest.json?app_id=${apiKey}&base=${from}&symbols=${to}`
        );
        const data = await response.json();

        if (data.rates && data.rates[to]) {
          const rate = data.rates[to];
          this.rateCache.set(cacheKey, { rate, timestamp: Date.now() });
          return rate;
        }
      } catch {
        // Failed to fetch live exchange rates, will use fallback
      }
    }

    // Fallback to approximate rates (relative to USD)
    const approximateRates = this.getApproximateRate(from, to);
    this.rateCache.set(cacheKey, { rate: approximateRates, timestamp: Date.now() });
    return approximateRates;
  }

  /**
   * Convert amount from one currency to another
   */
  static async convert(
    amount: number,
    from: CurrencyCode,
    to: CurrencyCode
  ): Promise<number> {
    const rate = await this.getExchangeRate(from, to);
    return amount * rate;
  }

  /**
   * Format amount with currency symbol and proper decimals
   */
  static format(amount: number, currency: CurrencyCode, locale?: string): string {
    const currencyInfo = CURRENCIES[currency];
    const roundedAmount = Number(amount.toFixed(currencyInfo.decimals));

    // Use Intl.NumberFormat for proper formatting
    const formatter = new Intl.NumberFormat(locale || "en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: currencyInfo.decimals,
      maximumFractionDigits: currencyInfo.decimals,
    });

    return formatter.format(roundedAmount);
  }

  /**
   * Get all supported currencies
   */
  static getSupportedCurrencies(): CurrencyInfo[] {
    return Object.values(CURRENCIES);
  }

  /**
   * Approximate exchange rates (fallback when API is unavailable)
   * These are relative to USD and should be updated periodically
   */
  private static getApproximateRate(from: CurrencyCode, to: CurrencyCode): number {
    // Approximate rates as of 2026 (USD = 1.0)
    const usdRates: Record<CurrencyCode, number> = {
      USD: 1.0,
      EUR: 0.92,
      GBP: 0.79,
      CAD: 1.36,
      AUD: 1.52,
      JPY: 148.5,
      CNY: 7.24,
      MXN: 17.2,
      INR: 83.1,
      BRL: 4.98,
      ZAR: 18.7,
      KRW: 1320,
      SGD: 1.34,
      HKD: 7.83,
      CHF: 0.88,
      SEK: 10.4,
      NOK: 10.6,
      DKK: 6.89,
      PLN: 4.01,
      THB: 35.2,
      MYR: 4.48,
      IDR: 15850,
      PHP: 56.3,
      VND: 24500,
      NZD: 1.65,
      TRY: 32.5,
      RUB: 92.0,
      AED: 3.67,
      SAR: 3.75,
    };

    // Convert from -> USD -> to
    const fromToUsd = 1 / usdRates[from];
    const usdToTarget = usdRates[to];
    return fromToUsd * usdToTarget;
  }

  /**
   * Clear the exchange rate cache
   */
  static clearCache(): void {
    this.rateCache.clear();
  }

  /**
   * Get cached rates count (for monitoring)
   */
  static getCacheSize(): number {
    return this.rateCache.size;
  }
}

/**
 * Utility functions for multi-currency support
 */
export const CurrencyUtils = {
  /**
   * Parse currency string to number (removes symbols and formatting)
   */
  parse(value: string, currency: CurrencyCode): number {
    const currencyInfo = CURRENCIES[currency];
    const cleaned = value.replace(/[^\d.,\-]/g, "");
    const normalized = cleaned.replace(",", ".");
    return parseFloat(normalized) || 0;
  },

  /**
   * Get currency symbol
   */
  getSymbol(currency: CurrencyCode): string {
    return CURRENCIES[currency]?.symbol || currency;
  },

  /**
   * Check if currency code is valid
   */
  isValid(code: string): code is CurrencyCode {
    return code in CURRENCIES;
  },

  /**
   * Convert and format in one step
   */
  async convertAndFormat(
    amount: number,
    from: CurrencyCode,
    to: CurrencyCode,
    locale?: string
  ): Promise<string> {
    const converted = await CurrencyService.convert(amount, from, to);
    return CurrencyService.format(converted, to, locale);
  },
};
