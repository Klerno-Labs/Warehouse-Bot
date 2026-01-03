import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Item } from '@shared/inventory';

interface UseBarccodeScannerOptions {
  onItemFound?: (item: Item) => void;
  onItemNotFound?: (barcode: string) => void;
  autoLookup?: boolean;
}

export function useBarcodeScanner(options: UseBarccodeScannerOptions = {}) {
  const { onItemFound, onItemNotFound, autoLookup = true } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string>('');
  const [lastScannedType, setLastScannedType] = useState<string>('');
  const [scanHistory, setScanHistory] = useState<Array<{ barcode: string; type: string; timestamp: Date }>>([]);

  // Fetch all items for barcode lookup
  const { data: itemsData } = useQuery<{ items: Item[] }>({
    queryKey: ['items'],
    queryFn: async () => {
      const res = await fetch('/api/inventory/items');
      if (!res.ok) throw new Error('Failed to fetch items');
      return res.json();
    },
    enabled: autoLookup,
  });

  const items = itemsData?.items || [];

  const lookupItem = useCallback(
    (barcode: string): Item | undefined => {
      return items.find(
        (item) =>
          item.barcode === barcode ||
          item.alternateBarcode === barcode ||
          item.sku === barcode // Fallback to SKU for backwards compatibility
      );
    },
    [items]
  );

  const handleScan = useCallback(
    (barcode: string, type: string) => {
      setLastScannedBarcode(barcode);
      setLastScannedType(type);

      // Add to scan history
      setScanHistory((prev) => [
        { barcode, type, timestamp: new Date() },
        ...prev.slice(0, 9), // Keep last 10 scans
      ]);

      // Auto-lookup item if enabled
      if (autoLookup) {
        const item = lookupItem(barcode);
        if (item) {
          onItemFound?.(item);
        } else {
          onItemNotFound?.(barcode);
        }
      }
    },
    [autoLookup, lookupItem, onItemFound, onItemNotFound]
  );

  const handleError = useCallback((error: Error) => {
    console.error('Barcode scanner error:', error);
  }, []);

  const openScanner = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeScanner = useCallback(() => {
    setIsOpen(false);
  }, []);

  const clearHistory = useCallback(() => {
    setScanHistory([]);
  }, []);

  return {
    isOpen,
    openScanner,
    closeScanner,
    handleScan,
    handleError,
    lastScannedBarcode,
    lastScannedType,
    scanHistory,
    clearHistory,
    lookupItem,
  };
}
