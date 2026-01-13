"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, X, SwitchCamera, Flashlight, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Unified Scanner Component
 *
 * Combines QR code and barcode scanning functionality into a single component.
 * Supports multiple scan modes, camera switching, and feedback options.
 */

export type ScanMode = "qr" | "barcode" | "both";

interface UnifiedScannerProps {
  // Callbacks
  onScan: (data: string, type?: string) => void;
  onClose: () => void;
  onError?: (error: Error) => void;

  // Configuration
  mode?: ScanMode;
  continuous?: boolean;
  showCameraSwitch?: boolean;
  showFlashlight?: boolean;

  // Feedback
  playSound?: boolean;
  vibrate?: boolean;

  // Styling
  className?: string;
}

export function UnifiedScanner({
  onScan,
  onClose,
  onError,
  mode = "both",
  continuous = false,
  showCameraSwitch = true,
  showFlashlight = false,
  playSound = true,
  vibrate = true,
  className,
}: UnifiedScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);

  const [error, setError] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [soundEnabled, setSoundEnabled] = useState(playSound);
  const [flashEnabled, setFlashEnabled] = useState(false);

  // Get available cameras
  useEffect(() => {
    const getDevices = async () => {
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter((d) => d.kind === "videoinput");
        setDevices(videoDevices);

        if (videoDevices.length > 0) {
          // Prefer back camera
          const backCamera = videoDevices.find((d) =>
            d.label.toLowerCase().includes("back") ||
            d.label.toLowerCase().includes("rear")
          );
          setSelectedDeviceId(backCamera?.deviceId || videoDevices[0].deviceId);
        }
      } catch (err) {
        console.error("Error getting devices:", err);
      }
    };

    getDevices();
  }, []);

  // Start camera and scanning
  useEffect(() => {
    if (!selectedDeviceId) return;

    let isMounted = true;

    const startCamera = async () => {
      try {
        // Stop any existing stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: selectedDeviceId,
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (!isMounted) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = mediaStream;

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setIsScanning(true);
            startScanning();
          };
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setError("Unable to access camera. Please check permissions.");
        onError?.(err as Error);
      }
    };

    const startScanning = () => {
      if (!videoRef.current) return;

      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) return;

      const scan = async () => {
        if (!isMounted || video.readyState !== video.HAVE_ENOUGH_DATA) {
          animationRef.current = requestAnimationFrame(scan);
          return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

        // Try native BarcodeDetector API if available
        if ("BarcodeDetector" in window) {
          try {
            const formats = getFormatsForMode(mode);
            const detector = new (window as any).BarcodeDetector({ formats });
            const barcodes = await detector.detect(imageData);

            if (barcodes.length > 0) {
              const result = barcodes[0];
              handleScanSuccess(result.rawValue, result.format);

              if (!continuous) {
                cleanup();
                return;
              }
            }
          } catch (err) {
            // Continue scanning
          }
        }

        animationRef.current = requestAnimationFrame(scan);
      };

      scan();
    };

    startCamera();

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [selectedDeviceId, mode, continuous]);

  const cleanup = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const handleScanSuccess = useCallback(
    (data: string, type?: string) => {
      // Haptic feedback
      if (vibrate && "vibrate" in navigator) {
        navigator.vibrate(200);
      }

      // Audio feedback
      if (soundEnabled) {
        playBeep();
      }

      onScan(data, type);
    },
    [soundEnabled, vibrate, onScan]
  );

  const handleClose = () => {
    cleanup();
    onClose();
  };

  const switchCamera = () => {
    const currentIndex = devices.findIndex((d) => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    setSelectedDeviceId(devices[nextIndex].deviceId);
  };

  const toggleFlash = async () => {
    if (!streamRef.current) return;

    const track = streamRef.current.getVideoTracks()[0];
    const capabilities = track.getCapabilities() as any;

    if (capabilities.torch) {
      const newFlashState = !flashEnabled;
      await track.applyConstraints({
        advanced: [{ torch: newFlashState } as any],
      });
      setFlashEnabled(newFlashState);
    }
  };

  return (
    <div className={cn("fixed inset-0 z-50 bg-black/95 flex flex-col", className)}>
      {/* Header */}
      <div className="bg-zinc-900 text-white p-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {mode === "qr" ? "Scan QR Code" : mode === "barcode" ? "Scan Barcode" : "Scan Code"}
        </h2>
        <div className="flex items-center gap-2">
          {/* Sound toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </Button>

          {/* Flashlight toggle */}
          {showFlashlight && (
            <Button
              variant="ghost"
              size="icon"
              className={cn("text-white hover:bg-white/20", flashEnabled && "bg-white/20")}
              onClick={toggleFlash}
            >
              <Flashlight className="h-5 w-5" />
            </Button>
          )}

          {/* Camera switch */}
          {showCameraSwitch && devices.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={switchCamera}
            >
              <SwitchCamera className="h-5 w-5" />
            </Button>
          )}

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={handleClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Video preview */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        <video
          ref={videoRef}
          className="max-w-full max-h-full object-cover"
          playsInline
          muted
        />

        {/* Scanning frame overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-64 h-64">
            {/* Frame border */}
            <div className="absolute inset-0 border-4 border-primary/50 rounded-xl" />

            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-white rounded-tl-xl" />
            <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-white rounded-tr-xl" />
            <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-white rounded-bl-xl" />
            <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-white rounded-br-xl" />

            {/* Scanning line animation */}
            {isScanning && (
              <div className="absolute left-2 right-2 h-0.5 bg-primary animate-scan-line" />
            )}
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
      <div className="bg-zinc-900 text-white p-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Camera className="h-5 w-5 opacity-70" />
          <span className="text-sm">Position the code within the frame</span>
        </div>
        {continuous && (
          <p className="text-xs opacity-50">Continuous scanning enabled</p>
        )}
        {!("BarcodeDetector" in window) && (
          <p className="text-xs text-amber-400 mt-2">
            For best results, use Chrome or Edge browser
          </p>
        )}
      </div>

      {/* Scan line animation styles */}
      <style jsx global>{`
        @keyframes scanLine {
          0%, 100% { top: 0.5rem; }
          50% { top: calc(100% - 0.5rem); }
        }
        .animate-scan-line {
          animation: scanLine 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// Helper functions
function getFormatsForMode(mode: ScanMode): string[] {
  const qrFormats = ["qr_code"];
  const barcodeFormats = [
    "code_128",
    "code_39",
    "ean_13",
    "ean_8",
    "upc_a",
    "upc_e",
    "itf",
    "codabar",
  ];

  switch (mode) {
    case "qr":
      return qrFormats;
    case "barcode":
      return barcodeFormats;
    default:
      return [...qrFormats, ...barcodeFormats];
  }
}

function playBeep() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = "sine";
    gainNode.gain.value = 0.3;

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (err) {
    console.error("Audio playback error:", err);
  }
}

/**
 * Scanner Button - Opens scanner in a modal
 */
interface ScannerButtonProps {
  onScan: (data: string, type?: string) => void;
  mode?: ScanMode;
  label?: string;
  className?: string;
}

export function ScannerButton({
  onScan,
  mode = "both",
  label = "Scan",
  className,
}: ScannerButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className={className}
      >
        <Camera className="h-4 w-4 mr-2" />
        {label}
      </Button>

      {isOpen && (
        <UnifiedScanner
          mode={mode}
          onScan={(data, type) => {
            onScan(data, type);
            setIsOpen(false);
          }}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
