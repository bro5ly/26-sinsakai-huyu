"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { useAuth } from "@/contexts/AuthContext";
import { useCatalog, useFilteredItemTypes, useMyRentals } from "@/hooks";
import { Header, LoadingSpinner, UserProfile, RentalsList, ItemsCatalog } from "@/components";

export default function DashboardPage() {
  const router = useRouter();
  const { status, user, logout, loadMe } = useAuth();
  const authenticated = status === "authenticated";
  const { itemTypes, categories: categoryList, loading: itemsLoading } = useCatalog(authenticated);
  const rentals = useMyRentals(authenticated);

  const [searchQuery, setSearchQuery] = useState("");
  const [genreFilter, setGenreFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  const filteredItems = useFilteredItemTypes(itemTypes, searchQuery, genreFilter, categoryFilter);
  // 絞り込みの選択肢は /api/categories から(物品から集めない)
  const categories = categoryList.map((category) => category.name);
  const genres = categoryList.flatMap((category) => category.genres.map((genre) => genre.name));

  // 確かめ終えて、ログインしていないと分かったときだけ送る(確かめ中は送らない。Ca6〜Ca8)。
  // 前は「2秒待ってから送る」で避けていた
  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth");
  }, [status, router]);

  const loading = !authenticated || itemsLoading || !user;

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-slate-900 pb-20 font-sans flex flex-col items-center">
      <Header onLogout={logout} showLogout />

      <main className="w-full max-w-xl pt-10 pb-20">
        <UserProfile user={user} onLogout={logout} onPinSaved={loadMe} />

        {/* 管理者だけ。画面では入口を出し分けるだけで、守りはAPI(D1) */}
        {user.role === "ADMIN" && (
          <div className="px-6 pb-8">
            <Button size="sm" variant="flat" className="w-full font-bold" onPress={() => router.push("/admin/tablets")}>
              タブレットの端末の管理
            </Button>
          </div>
        )}

        <RentalsList rentals={rentals} maxItems={user.borrowing.maxItems} />

        <ItemsCatalog
          items={filteredItems}
          categories={categories}
          genres={genres}
          searchQuery={searchQuery}
          genreFilter={genreFilter}
          categoryFilter={categoryFilter}
          onSearchChange={setSearchQuery}
          onGenreFilterChange={setGenreFilter}
          onCategoryFilterChange={setCategoryFilter}
        />
      </main>
    </div>
  );
}
