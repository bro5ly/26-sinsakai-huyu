'use client';

import { useState, useEffect } from 'react';
import Barcode from 'react-barcode';

interface BarcodeItem {
  code: string;
  name: string;
  type: string;
}

export default function BarcodesPage() {
  const [items, setItems] = useState<BarcodeItem[]>([]);
  const [icCards, setIcCards] = useState<BarcodeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // テストデータを設定
    const testItems: BarcodeItem[] = [
      { code: 'MAC-001', name: 'MacBook Pro 16インチ #1', type: 'ノートパソコン' },
      { code: 'MAC-002', name: 'MacBook Pro 16インチ #2', type: 'ノートパソコン' },
      { code: 'MAC-003', name: 'MacBook Pro 16インチ #3', type: 'ノートパソコン' },
      { code: 'IPAD-001', name: 'iPad Pro 12.9インチ #1', type: 'タブレット' },
      { code: 'IPAD-002', name: 'iPad Pro 12.9インチ #2', type: 'タブレット' },
      { code: 'IPAD-003', name: 'iPad Pro 12.9インチ #3', type: 'タブレット' },
      { code: 'IPAD-004', name: 'iPad Pro 12.9インチ #4', type: 'タブレット' },
      { code: 'IPAD-005', name: 'iPad Pro 12.9インチ #5', type: 'タブレット' },
      { code: 'CAM-001', name: 'Canon EOS R6 Mark II #1', type: 'カメラ' },
      { code: 'CAM-002', name: 'Canon EOS R6 Mark II #2', type: 'カメラ' },
      { code: 'BOOK-PY-001', name: 'Python機械学習プログラミング #1', type: '書籍' },
      { code: 'BOOK-PY-002', name: 'Python機械学習プログラミング #2', type: '書籍' },
      { code: 'BOOK-PY-003', name: 'Python機械学習プログラミング #3', type: '書籍' },
      { code: 'BOOK-PY-004', name: 'Python機械学習プログラミング #4', type: '書籍' },
      { code: 'BOOK-PY-005', name: 'Python機械学習プログラミング #5', type: '書籍' },
    ];

    const testIcCards: BarcodeItem[] = [
      { code: 'IC-CARD-001', name: '山田 太郎', type: 'ICカード' },
      { code: 'IC-CARD-002', name: '佐藤 花子', type: 'ICカード' },
      { code: 'IC-CARD-003', name: '鈴木 次郎', type: 'ICカード' },
    ];

    setItems(testItems);
    setIcCards(testIcCards);
    setLoading(false);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8 print:hidden">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            バーコード一覧
          </h1>
          <div className="flex gap-4">
            <button
              onClick={handlePrint}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              印刷する
            </button>
            <a
              href="/tablet"
              className="px-6 py-3 bg-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-400 transition-colors inline-block"
            >
              タブレットページへ
            </a>
          </div>
        </div>

        {/* ICカード */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b-2 border-blue-600 pb-2">
            ICカード（認証用）
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {icCards.map((card) => (
              <div
                key={card.code}
                className="bg-white rounded-lg shadow-md p-6 border-2 border-blue-200 print:break-inside-avoid"
              >
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-gray-800">{card.name}</h3>
                  <p className="text-sm text-gray-600">{card.type}</p>
                </div>
                <div className="flex justify-center bg-white p-4 rounded">
                  <Barcode value={card.code} width={2} height={80} fontSize={14} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* アイテム */}
        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b-2 border-green-600 pb-2">
            貸出物品
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <div
                key={item.code}
                className="bg-white rounded-lg shadow-md p-6 border-2 border-gray-200 print:break-inside-avoid"
              >
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-gray-800">{item.name}</h3>
                  <p className="text-sm text-gray-600">{item.type}</p>
                </div>
                <div className="flex justify-center bg-white p-4 rounded">
                  <Barcode value={item.code} width={2} height={80} fontSize={14} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 印刷用スタイル */}
      <style jsx global>{`
        @media print {
          body {
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
