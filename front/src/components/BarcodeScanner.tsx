"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onError?: (error: string) => void;
  isActive: boolean;
}

export default function BarcodeScanner({ onScan, onError, isActive }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "barcode-reader";

  useEffect(() => {
    if (isActive && !isScanning) {
      startScanner();
    } else if (!isActive && isScanning) {
      stopScanner();
    }

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [isActive]);

  const startScanner = async () => {
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(scannerId);
      }

      const config = {
        fps: 20,
        qrbox: { width: 300, height: 150 }, // スキャン範囲を正方形に
        aspectRatio: 1.0, // 映像のアスペクト比を1:1に指定
      };

      await scannerRef.current.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          onScan(decodedText);
          stopScanner();
        },
        () => {
          /* スキャン待機中のエラーは無視 */
        },
      );

      setIsScanning(true);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Camera failed";
      if (onError) onError(errorMsg);
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current?.isScanning) {
      try {
        await scannerRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-black">
      <div id={scannerId} className="w-full h-full" />

      {/* ライブラリ内部のUIを強制的に隠し、映像を1:1にするためのスタイル */}
      <style jsx global>{`
        #${scannerId} {
          border: none !important;
        }
        #${scannerId} video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important; /* 映像を正方形にクロップ */
        }
        #${scannerId}__header_message, #${scannerId}__status_span, #${scannerId} b {
          display: none !important; /* ライブラリのテキストを非表示 */
        }
        #${scannerId} img {
          display: none !important; /* 余計なアイコンを非表示 */
        }
      `}</style>
    </div>
  );
}
