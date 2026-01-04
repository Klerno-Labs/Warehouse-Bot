import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>("");
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    let animationFrame: number;
    let currentStream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        // Request camera access
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" }, // Prefer back camera
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          currentStream = mediaStream;
          setStream(mediaStream);

          // Wait for video to load
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            startScanning();
          };
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setError("Unable to access camera. Please check permissions.");
      }
    };

    const startScanning = () => {
      if (!videoRef.current) return;

      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) return;

      const scan = () => {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

          // Use browser's built-in barcode detection if available
          if ("BarcodeDetector" in window) {
            const barcodeDetector = new (window as any).BarcodeDetector({
              formats: ["qr_code"],
            });

            barcodeDetector
              .detect(imageData)
              .then((barcodes: any[]) => {
                if (barcodes.length > 0) {
                  const code = barcodes[0].rawValue;
                  onScan(code);
                  cleanup();
                }
              })
              .catch((err: Error) => {
                // Barcode detection failed, continue scanning
              });
          } else {
            // Fallback: Simple pattern matching for alphanumeric codes
            // This is a basic fallback - in production, use a library like jsQR
            const pixels = imageData.data;

            // Check for high contrast patterns (simplified QR detection)
            let darkPixels = 0;
            let lightPixels = 0;

            for (let i = 0; i < pixels.length; i += 4) {
              const brightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
              if (brightness < 128) darkPixels++;
              else lightPixels++;
            }

            // If we detect a pattern (placeholder - would use jsQR in production)
            const hasPattern = darkPixels > 0 && lightPixels > 0;

            if (hasPattern) {
              // Note: This is a placeholder. In production, integrate jsQR library
              // For now, we'll rely on manual input or the BarcodeDetector API
            }
          }
        }

        animationFrame = requestAnimationFrame(scan);
      };

      scan();
    };

    const cleanup = () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };

    startCamera();

    return cleanup;
  }, [onScan]);

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg">
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -top-12 right-0 text-white hover:bg-white/20"
          onClick={handleClose}
        >
          <X className="h-6 w-6" />
        </Button>

        {/* Camera view */}
        <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />

          {/* Scanning frame overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-64 border-4 border-primary rounded-lg relative">
              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="absolute bottom-4 left-4 right-4 bg-destructive text-destructive-foreground p-4 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-4 text-center text-white">
          <Camera className="h-8 w-8 mx-auto mb-2 opacity-80" />
          <p className="text-sm">Position the QR code within the frame</p>
          <p className="text-xs opacity-70 mt-1">Scanning will happen automatically</p>
        </div>

        {/* Browser compatibility note */}
        {!("BarcodeDetector" in window) && (
          <div className="mt-4 bg-amber-500/20 border border-amber-500/50 text-amber-100 p-3 rounded-lg text-xs">
            <p className="font-semibold mb-1">Limited Browser Support</p>
            <p>For best results, use Chrome or Edge browser. Or use manual entry.</p>
          </div>
        )}
      </div>
    </div>
  );
}
