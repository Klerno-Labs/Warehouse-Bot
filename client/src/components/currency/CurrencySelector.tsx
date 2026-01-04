import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRightLeft, DollarSign, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Currency {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
}

interface CurrencySelectorProps {
  value: string;
  onChange: (currency: string) => void;
  label?: string;
}

export function CurrencySelector({ value, onChange, label }: CurrencySelectorProps) {
  const [currencies, setCurrencies] = useState<Currency[]>([]);

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const fetchCurrencies = async () => {
    try {
      const response = await fetch("/api/currency");
      const data = await response.json();
      setCurrencies(data.currencies || []);
    } catch (error) {
      console.error("Failed to fetch currencies:", error);
    }
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select currency" />
        </SelectTrigger>
        <SelectContent>
          {currencies.map((currency) => (
            <SelectItem key={currency.code} value={currency.code}>
              {currency.symbol} {currency.code} - {currency.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface CurrencyConverterProps {
  defaultFrom?: string;
  defaultTo?: string;
  defaultAmount?: number;
}

export function CurrencyConverter({
  defaultFrom = "USD",
  defaultTo = "EUR",
  defaultAmount = 100,
}: CurrencyConverterProps) {
  const { toast } = useToast();
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [amount, setAmount] = useState(defaultAmount);
  const [result, setResult] = useState<number | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (amount > 0) {
      convertCurrency();
    }
  }, [from, to, amount]);

  const convertCurrency = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/currency/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, from, to, format: true }),
      });

      if (!response.ok) {
        throw new Error("Conversion failed");
      }

      const data = await response.json();
      setResult(data.result);
      setRate(data.rate);
    } catch (error: any) {
      toast({
        title: "Conversion failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const swapCurrencies = () => {
    setFrom(to);
    setTo(from);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Currency Converter
        </CardTitle>
        <CardDescription>Convert between international currencies</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
            />
          </div>

          <div className="space-y-2">
            <CurrencySelector value={from} onChange={setFrom} label="From" />
          </div>

          <div className="space-y-2">
            <CurrencySelector value={to} onChange={setTo} label="To" />
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={swapCurrencies}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Swap currencies"
          >
            <ArrowRightLeft className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {result !== null && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <div className="text-2xl font-bold text-blue-900">
              {result.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              {to}
            </div>
            {rate !== null && (
              <div className="text-sm text-blue-700 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Exchange Rate: 1 {from} = {rate.toFixed(4)} {to}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              Rates updated daily. For live rates, configure EXCHANGE_RATE_API_KEY
            </div>
          </div>
        )}

        {isLoading && (
          <div className="text-center text-sm text-muted-foreground">Converting...</div>
        )}
      </CardContent>
    </Card>
  );
}

interface PriceDisplayProps {
  amount: number;
  currency: string;
  showCode?: boolean;
  className?: string;
}

export function PriceDisplay({
  amount,
  currency,
  showCode = true,
  className = "",
}: PriceDisplayProps) {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount);

  return (
    <span className={className}>
      {formatted}
      {showCode && ` ${currency}`}
    </span>
  );
}

interface MultiCurrencyPriceProps {
  amount: number;
  baseCurrency: string;
  displayCurrencies?: string[]; // Show price in multiple currencies
}

export function MultiCurrencyPrice({
  amount,
  baseCurrency,
  displayCurrencies = ["USD", "EUR", "GBP"],
}: MultiCurrencyPriceProps) {
  const [prices, setPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    convertPrices();
  }, [amount, baseCurrency, displayCurrencies]);

  const convertPrices = async () => {
    try {
      const response = await fetch(
        `/api/currency/rates?from=${baseCurrency}&to=${displayCurrencies.join(",")}`
      );
      const data = await response.json();

      const converted: Record<string, number> = {};
      for (const [currency, rate] of Object.entries(data.rates)) {
        converted[currency] = amount * (rate as number);
      }
      setPrices(converted);
    } catch (error) {
      console.error("Failed to convert prices:", error);
    }
  };

  return (
    <div className="space-y-1">
      <div className="font-semibold">
        <PriceDisplay amount={amount} currency={baseCurrency} />
      </div>
      {Object.entries(prices).map(([currency, price]) => (
        <div key={currency} className="text-sm text-muted-foreground">
          ≈ <PriceDisplay amount={price} currency={currency} showCode={false} />
        </div>
      ))}
    </div>
  );
}
