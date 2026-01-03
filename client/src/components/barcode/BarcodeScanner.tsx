import { BrowserMultiFormatReader, Result } from '@zxing/library';
import { useEffect, useRef, useState } from 'react';

interface BarcodeScannerProps {
  onScan: (barcode: string, type: string) => void;
  onError?: (error: Error) => void;
  onClose: () => void;
  continuous?: boolean;
}

export function BarcodeScanner({ onScan, onError, onClose, continuous = false }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();
    readerRef.current = codeReader;

    // Get available video devices
    codeReader.listVideoInputDevices().then((videoDevices) => {
      setDevices(videoDevices);
      if (videoDevices.length > 0) {
        // Prefer back camera on mobile
        const backCamera = videoDevices.find((device) =>
          device.label.toLowerCase().includes('back')
        );
        setSelectedDeviceId(backCamera?.deviceId || videoDevices[0].deviceId);
      }
    }).catch((err) => {
      console.error('Error listing video devices:', err);
      onError?.(err);
    });

    return () => {
      codeReader.reset();
    };
  }, [onError]);

  useEffect(() => {
    if (!selectedDeviceId || !videoRef.current || isScanning) return;

    const codeReader = readerRef.current;
    if (!codeReader) return;

    setIsScanning(true);

    codeReader
      .decodeFromVideoDevice(selectedDeviceId, videoRef.current, (result, error) => {
        if (result) {
          // Success - play sound and vibrate
          playBeep();
          vibrate();

          const barcodeText = result.getText();
          const barcodeFormat = result.getBarcodeFormat().toString();

          console.log('Barcode scanned:', barcodeText, barcodeFormat);
          onScan(barcodeText, barcodeFormat);

          if (!continuous) {
            // Stop scanning after first successful scan
            codeReader.reset();
            setIsScanning(false);
            onClose();
          }
        }

        if (error && error.name !== 'NotFoundException') {
          console.error('Scan error:', error);
          onError?.(error as Error);
        }
      })
      .catch((err) => {
        console.error('Error starting video:', err);
        setIsScanning(false);
        onError?.(err);
      });

    return () => {
      codeReader.reset();
      setIsScanning(false);
    };
  }, [selectedDeviceId, onScan, onError, onClose, continuous]);

  const playBeep = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  };

  const vibrate = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(200);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Scan Barcode</h2>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
        >
          Close
        </button>
      </div>

      {/* Camera selector */}
      {devices.length > 1 && (
        <div className="bg-gray-800 text-white p-4">
          <label className="block text-sm mb-2">Camera:</label>
          <select
            value={selectedDeviceId}
            onChange={(e) => {
              readerRef.current?.reset();
              setIsScanning(false);
              setSelectedDeviceId(e.target.value);
            }}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded"
          >
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Video preview */}
      <div className="flex-1 flex items-center justify-center relative">
        <video
          ref={videoRef}
          className="max-w-full max-h-full"
          style={{ transform: 'scaleX(-1)' }} // Mirror video for better UX
        />

        {/* Scanning overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="border-4 border-green-500 w-64 h-48 rounded-lg shadow-lg">
            <div className="absolute top-0 left-0 w-full h-1 bg-green-500 animate-scan" />
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-gray-900 text-white p-4 text-center">
        <p className="text-sm">Position the barcode within the frame</p>
        {continuous && (
          <p className="text-xs text-gray-400 mt-1">Continuous scanning mode</p>
        )}
      </div>

      <style jsx>{`
        @keyframes scan {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(192px);
          }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
