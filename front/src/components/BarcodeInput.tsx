'use client';

import { useState, FormEvent } from 'react';

interface BarcodeInputProps {
  onSubmit: (barcode: string) => void;
  placeholder?: string;
  buttonText?: string;
}

export default function BarcodeInput({
  onSubmit,
  placeholder = 'バーコードを入力',
  buttonText = '送信',
}: BarcodeInputProps) {
  const [barcode, setBarcode] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (barcode.trim()) {
      onSubmit(barcode.trim());
      setBarcode('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto">
      <div className="flex gap-2">
        <input
          type="text"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          autoFocus
        />
        <button
          type="submit"
          disabled={!barcode.trim()}
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {buttonText}
        </button>
      </div>
    </form>
  );
}
