import { useState, useEffect, useMemo } from "react";
import { itemService } from "@/services/item.service";
import { Item, ItemGroup } from "@/types";

export const useItems = () => {
  const [allItems, setAllItems] = useState<Item[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        const response = await itemService.getAllItems();
        setAllItems(response.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch items");
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  return { allItems, loading, error };
};

export const useFilteredItems = (
  allItems: Item[] | null,
  searchQuery: string,
  genreFilter: string,
  categoryFilter: string
) => {
  return useMemo(() => {
    if (!allItems) return [];

    const itemTypeMap = new Map<string, ItemGroup>();

    allItems.forEach((item) => {
      const typeId = item.itemType.title;
      if (!itemTypeMap.has(typeId)) {
        itemTypeMap.set(typeId, {
          itemType: item.itemType,
          items: [],
          availableCount: 0,
        });
      }
      const group = itemTypeMap.get(typeId)!;
      group.items.push(item);
      if (item.status === "AVAILABLE") group.availableCount++;
    });

    return Array.from(itemTypeMap.values()).filter((group) => {
      const matchesSearch =
        searchQuery === "" ||
        group.itemType?.title
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase());
      const matchesGenre =
        genreFilter === "ALL" || group.itemType?.genre?.name === genreFilter;
      const matchesCategory =
        categoryFilter === "ALL" ||
        group.itemType?.genre?.category?.name === categoryFilter;
      return matchesSearch && matchesGenre && matchesCategory;
    });
  }, [allItems, searchQuery, genreFilter, categoryFilter]);
};

export const useItemFilters = (allItems: Item[] | null) => {
  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          allItems
            ?.map((item) => item.itemType?.genre?.category?.name)
            .filter(Boolean) || []
        )
      ),
    [allItems]
  );

  const genres = useMemo(
    () =>
      Array.from(
        new Set(
          allItems
            ?.map((item) => item.itemType?.genre?.name)
            .filter(Boolean) || []
        )
      ),
    [allItems]
  );

  return { categories, genres };
};
