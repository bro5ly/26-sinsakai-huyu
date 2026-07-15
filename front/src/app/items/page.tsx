'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useItems } from '@/hooks/useItems';
import { Item } from '@/types';

export default function ItemsPage() {
  const router = useRouter();
  const { isAuthenticated, logout } = useAuth();
  const { allItems: items, loading: isLoading, error: fetchError } = useItems();

  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    filterItems();
  }, [items, searchQuery, statusFilter, categoryFilter]);

  const filterItems = () => {
    let filtered = items || [];

    // ステータスフィルター
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    // カテゴリフィルター
    if (categoryFilter !== 'ALL') {
      filtered = filtered.filter((item) => item.itemType.genre.category.name === categoryFilter);
    }

    // 検索クエリ
    if (searchQuery) {
      filtered = filtered.filter(
        (item) =>
          item.itemType.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.itemType.genre.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredItems(filtered);
  };

  const categories = Array.from(
    new Set((items || []).map((item) => item.itemType.genre.category.name))
  );

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-green-100 text-green-800';
      case 'RENTED':
        return 'bg-red-100 text-red-800';
      case 'MAINTENANCE':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOST':
        return 'bg-gray-100 text-gray-800';
      case 'DISPOSED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return '貸出可能';
      case 'RENTED':
        return '貸出中';
      case 'MAINTENANCE':
        return 'メンテナンス中';
      case 'LOST':
        return '紛失';
      case 'DISPOSED':
        return '廃棄済み';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">機材一覧</h1>
          <div className="flex gap-4">
            <a
              href="/dashboard"
              className="px-4 py-2 bg-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-400 transition-colors"
            >
              マイページ
            </a>
            <button
              onClick={() => {
                logout();
                router.push('/auth');
              }}
              className="px-4 py-2 bg-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-400 transition-colors"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* コンテンツ */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {fetchError && (
          <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded">
            {fetchError}
          </div>
        )}

        {/* フィルター */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 検索 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                検索
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="物品名、バーコードで検索"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* ステータスフィルター */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ステータス
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">すべて</option>
                <option value="AVAILABLE">貸出可能</option>
                <option value="RENTED">貸出中</option>
                <option value="MAINTENANCE">メンテナンス中</option>
              </select>
            </div>

            {/* カテゴリフィルター */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                カテゴリ
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">すべて</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            {filteredItems.length}件の機材が見つかりました
          </div>
        </div>

        {/* アイテムリスト */}
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600">該当する機材が見つかりませんでした</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-gray-800 flex-1">
                    {item.itemType.title}
                  </h3>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded ${getStatusBadgeColor(
                      item.status
                    )}`}
                  >
                    {getStatusLabel(item.status)}
                  </span>
                </div>

                {item.itemType.description && (
                  <p className="text-sm text-gray-600 mb-3">
                    {item.itemType.description}
                  </p>
                )}

                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">カテゴリ: </span>
                    <span className="font-medium">
                      {item.itemType.genre.category.name} / {item.itemType.genre.name}
                    </span>
                  </div>

                  {item.itemType.manufacturer && (
                    <div>
                      <span className="text-gray-600">メーカー: </span>
                      <span className="font-medium">{item.itemType.manufacturer}</span>
                    </div>
                  )}

                  {item.itemType.model && (
                    <div>
                      <span className="text-gray-600">型番: </span>
                      <span className="font-medium">{item.itemType.model}</span>
                    </div>
                  )}

                  <div>
                    <span className="text-gray-600">バーコード: </span>
                    <span className="font-mono font-medium">{item.barcode}</span>
                  </div>

                  {item.location && (
                    <div>
                      <span className="text-gray-600">保管場所: </span>
                      <span className="font-medium">{item.location}</span>
                    </div>
                  )}

                  <div>
                    <span className="text-gray-600">貸出期間: </span>
                    <span className="font-medium">{item.itemType.rentalPeriodDays}日間</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
