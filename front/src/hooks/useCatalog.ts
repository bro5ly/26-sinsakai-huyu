import { useEffect, useMemo, useState } from "react";
import type { Category, ItemTypeDetail, ItemTypeSummary } from "@sinsakai/shared";
import { catalogService } from "@/services";
import { ApiError } from "@/types";

const messageOf = (err: unknown) =>
  err instanceof ApiError ? err.message : "読み込みに失敗しました";

// 種類の一覧と、絞り込みの選択肢(カテゴリとジャンル)を取る
export const useCatalog = (accessToken: string | null) => {
  const [itemTypes, setItemTypes] = useState<ItemTypeSummary[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    Promise.all([
      catalogService.getItemTypes(accessToken),
      catalogService.getCategories(accessToken),
    ])
      .then(([types, cats]) => {
        if (cancelled) return;
        setItemTypes(types.items);
        setCategories(cats.items);
      })
      .catch((err) => {
        if (!cancelled) setError(messageOf(err));
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  return { itemTypes, categories, loading: itemTypes === null && error === null, error };
};

// 種類は数十件なので、全部を1回取って画面で絞り込む。増えたらAPIに ?categoryId=&genreId=&q= を足す(2026-10-28 Ca3)
export const useFilteredItemTypes = (
  itemTypes: ItemTypeSummary[] | null,
  searchQuery: string,
  genreFilter: string,
  categoryFilter: string
) =>
  useMemo(() => {
    const q = searchQuery.toLowerCase();
    return (itemTypes ?? []).filter(
      (type) =>
        (q === "" || type.title.toLowerCase().includes(q)) &&
        (genreFilter === "ALL" || type.genre.name === genreFilter) &&
        (categoryFilter === "ALL" || type.category.name === categoryFilter)
    );
  }, [itemTypes, searchQuery, genreFilter, categoryFilter]);

// 種類の詳細(物品1つ1つの状態付き)を取る
export const useItemType = (id: string, accessToken: string | null) => {
  const [itemType, setItemType] = useState<ItemTypeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    catalogService
      .getItemType(id, accessToken)
      .then((detail) => {
        if (!cancelled) setItemType(detail);
      })
      .catch((err) => {
        if (!cancelled) setError(messageOf(err));
      });
    return () => {
      cancelled = true;
    };
  }, [id, accessToken]);

  return { itemType, loading: itemType === null && error === null, error };
};
