import { useState } from 'react';
import { useRouter } from 'next/router';
import { BarcodeScanner } from '@/components/barcode/BarcodeScanner';
import { useBarcodeScanner } from '@/components/barcode/useBarcodeScanner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, History, Package } from 'lucide-react';
import type { Item } from '@shared/inventory';

export default function MobileScannerPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [scannedItem, setScannedItem] = useState<Item | null>(null);

  const scanner = useBarcodeScanner({
    onItemFound: (item) => {
      setScannedItem(item);
      toast({
        title: 'Item Found',
        description: `${item.name} (${item.sku})`,
      });
    },
    onItemNotFound: (barcode) => {
      toast({
        title: 'Item Not Found',
        description: `No item with barcode: ${barcode}`,
        variant: 'destructive',
      });
    },
  });

  const handleItemAction = (action: 'receive' | 'issue' | 'lookup') => {
    if (!scannedItem) return;

    switch (action) {
      case 'receive':
        router.push('/stations/receiving');
        break;
      case 'issue':
        router.push('/stations/stockroom');
        break;
      case 'lookup':
        router.push(`/inventory/balances?search=${scannedItem.sku}`);
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white dark:bg-slate-950 border-b sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold flex-1">Barcode Scanner</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Scan Button */}
        <Card>
          <CardContent className="pt-6">
            <Button
              size="lg"
              className="w-full h-32 text-lg"
              onClick={scanner.openScanner}
            >
              <div className="flex flex-col items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                  <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                  <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                  <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                  <rect x="7" y="7" width="10" height="10" rx="1" />
                </svg>
                <span>Tap to Scan</span>
              </div>
            </Button>
          </CardContent>
        </Card>

        {/* Scanned Item */}
        {scannedItem && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                Scanned Item
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-lg font-semibold">{scannedItem.name}</div>
                <div className="text-sm text-muted-foreground">
                  SKU: {scannedItem.sku}
                </div>
                <div className="text-sm text-muted-foreground">
                  Category: {scannedItem.category}
                </div>
                {scannedItem.barcode && (
                  <div className="text-xs font-mono text-muted-foreground mt-1">
                    Barcode: {scannedItem.barcode}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleItemAction('receive')}
                  className="flex flex-col h-auto py-3"
                >
                  <span className="text-2xl mb-1">📦</span>
                  <span className="text-xs">Receive</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleItemAction('issue')}
                  className="flex flex-col h-auto py-3"
                >
                  <span className="text-2xl mb-1">📤</span>
                  <span className="text-xs">Issue</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleItemAction('lookup')}
                  className="flex flex-col h-auto py-3"
                >
                  <span className="text-2xl mb-1">🔍</span>
                  <span className="text-xs">Lookup</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scan History */}
        {scanner.scanHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <History className="h-4 w-4" />
                Recent Scans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {scanner.scanHistory.slice(0, 5).map((scan, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <div className="font-mono text-sm">{scan.barcode}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(scan.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">{scan.type}</div>
                  </div>
                ))}
              </div>
              {scanner.scanHistory.length > 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2"
                  onClick={scanner.clearHistory}
                >
                  Clear History
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => router.push('/stations/receiving')}>
              📥 Receiving
            </Button>
            <Button variant="outline" onClick={() => router.push('/stations/stockroom')}>
              📦 Stockroom
            </Button>
            <Button variant="outline" onClick={() => router.push('/inventory/balances')}>
              📊 Stock Levels
            </Button>
            <Button variant="outline" onClick={() => router.push('/stations/packing')}>
              📮 Shipping
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Scanner Modal */}
      {scanner.isOpen && (
        <BarcodeScanner
          onScan={scanner.handleScan}
          onError={scanner.handleError}
          onClose={scanner.closeScanner}
          continuous={true}
        />
      )}
    </div>
  );
}
