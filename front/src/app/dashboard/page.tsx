"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useItems, useFilteredItems, useItemFilters } from "@/hooks";
import {
  Header,
  LoadingSpinner,
  UserProfile,
  RentalsList,
  ItemsCatalog,
} from "@/components";
import { User } from "@/types";

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout, accessToken } = useAuth();
  const { allItems, loading: itemsLoading } = useItems();
  const [isInitializing, setIsInitializing] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [genreFilter, setGenreFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  const filteredItems = useFilteredItems(
    allItems,
    searchQuery,
    genreFilter,
    categoryFilter
  );
  const { categories, genres } = useItemFilters(allItems);

  // 初期化フラグを管理
  useEffect(() => {
    // userまたはaccessTokenがセットされたら初期化完了
    if (user || accessToken) {
      setIsInitializing(false);
    } else {
      // 2秒待ってもセットされなければ初期化完了（リダイレクト可能に）
      const timer = setTimeout(() => {
        setIsInitializing(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user, accessToken]);

  // 初期化完了後、認証されていない場合のみリダイレクト
  useEffect(() => {
    if (!isInitializing && !accessToken && !user) {
      router.push("/auth");
    }
  }, [isInitializing, accessToken, user, router]);

  // Combined loading state
  const loading = isInitializing || itemsLoading || !user;

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return null;
  }

  const rentals = user.rentals || [];
  const rentalSetting = user.rentalSetting || null;

  // Convert AuthUser to User for UserProfile component
  const userProfile: User = {
    id: user.id,
    studentId: user.studentId,
    serialNumber: user.serialNumber,
    name: user.name,
    email: user.email,
    grade: user.grade,
    major: user.major,
    userType: "STUDENT" as any, // Cast to match enum
    isActive: true,
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-slate-900 pb-20 font-sans flex flex-col items-center">
      <Header onLogout={logout} showLogout />

      <main className="w-full max-w-xl pt-10 pb-20">
        <UserProfile
          user={userProfile}
          rentalSetting={rentalSetting}
          rentalsCount={rentals.length}
          onLogout={logout}
        />

        <RentalsList rentals={rentals} maxItems={rentalSetting?.maxItems || 0} />

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
