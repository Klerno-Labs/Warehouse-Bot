import { Button } from '@/components/ui/button';
import { BarcodeGenerator } from './BarcodeGenerator';
import { Card, CardContent } from '@/components/ui/card';

interface BarcodeLabelPrinterProps {
  barcode: string;
  barcodeType?: 'CODE128' | 'EAN13' | 'UPC' | 'CODE39';
  itemName: string;
  sku: string;
  onClose?: () => void;
}

export function BarcodeLabelPrinter({
  barcode,
  barcodeType = 'CODE128',
  itemName,
  sku,
  onClose,
}: BarcodeLabelPrinterProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Print Barcode Label</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>

          {/* Print Preview */}
          <div className="border rounded-lg p-8 bg-white print:border-0" id="printable-label">
            <div className="flex flex-col items-center gap-4">
              <div className="text-center">
                <h3 className="text-lg font-bold">{itemName}</h3>
                <p className="text-sm text-muted-foreground">SKU: {sku}</p>
              </div>

              <BarcodeGenerator
                value={barcode}
                format={barcodeType}
                width={2}
                height={80}
                displayValue={true}
                fontSize={16}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-6 print:hidden">
            <Button onClick={handlePrint} className="flex-1">
              Print Label
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>

          <style jsx global>{`
            @media print {
              body * {
                visibility: hidden;
              }
              #printable-label,
              #printable-label * {
                visibility: visible;
              }
              #printable-label {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
              }
            }
          `}</style>
        </CardContent>
      </Card>
    </div>
  );
}
