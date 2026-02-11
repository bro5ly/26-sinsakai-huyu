"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  authApi,
  ApiError,
  type MyInfoResponse,
  type ItemsResponse,
} from "@/lib/auth-api";
import {
  Card,
  CardBody,
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Select,
  SelectItem,
  Chip,
  Spinner,
  Badge,
  Avatar,
} from "@heroui/react";
import Barcode from "react-barcode";

/**
 * Cookie操作ヘルパー
 */
const getATFromCookie = () => {
  if (typeof document === "undefined") return undefined;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; accessToken=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
  return undefined;
};

const setATCookie = (token: string | null) => {
  if (typeof document === "undefined") return;
  if (token) {
    document.cookie = `accessToken=${token}; path=/; max-age=3600; SameSite=Lax`;
  } else {
    document.cookie = `accessToken=; path=/; max-age=0;`;
  }
};

export default function DashboardPage() {
  const router = useRouter();
  const { logout, accessToken, setAuth } = useAuth();

  const [myInfo, setMyInfo] = useState<MyInfoResponse | null>(null);
  const [allItems, setAllItems] = useState<ItemsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [genreFilter, setGenreFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // バーコード表示状態の管理
  const [showBarcode, setShowBarcode] = useState(false);

  /**
   * データ取得とリフレッシュロジック
   */
  const loadData = useCallback(
    async (token: string) => {
      setLoading(true);
      try {
        const [myInfoData, itemsData] = await Promise.all([
          authApi.getMyInfo(token),
          authApi.getAllItems(),
        ]);
        setMyInfo(myInfoData);
        setAllItems(itemsData);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          try {
            const refreshRes = await authApi.refreshSession();
            setATCookie(refreshRes.accessToken);
            setAuth(refreshRes.user, refreshRes.accessToken);
            const [retryInfo, retryItems] = await Promise.all([
              authApi.getMyInfo(refreshRes.accessToken),
              authApi.getAllItems(),
            ]);
            setMyInfo(retryInfo);
            setAllItems(retryItems);
          } catch {
            await handleLogout();
          }
        }
      } finally {
        setLoading(false);
      }
    },
    [setAuth],
  );

  const handleLogout = async () => {
    await logout();
    setATCookie(null);
    router.push("/auth");
  };

  useEffect(() => {
    const at = accessToken || getATFromCookie();
    if (!at) {
      const silentRefresh = async () => {
        try {
          const res = await authApi.refreshSession();
          setATCookie(res.accessToken);
          setAuth(res.user, res.accessToken);
          loadData(res.accessToken);
        } catch {
          router.push("/auth");
        }
      };
      silentRefresh();
    } else {
      loadData(at);
    }
    localStorage.removeItem("accessToken");
  }, [accessToken, loadData, router, setAuth]);

  // --- フィルタリング・表示ロジック ---
  const filteredItemTypes = useMemo(() => {
    if (!allItems?.data) return [];
    const itemTypeMap = new Map<string, any>();
    allItems.data.forEach((item) => {
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

  const categories = Array.from(
    new Set(
      allItems?.data
        ?.map((item) => item.itemType?.genre?.category?.name)
        .filter(Boolean) || [],
    ),
  );
  const genres = Array.from(
    new Set(
      allItems?.data
        ?.map((item) => item.itemType?.genre?.name)
        .filter(Boolean) || [],
    ),
  );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white">
        <Spinner size="lg" color="current" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">
          Loading Session...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-slate-900 pb-20 font-sans flex flex-col items-center">
      {/* --- HEADER --- */}
      <header className="sticky top-0 z-40 w-full bg-white/70 backdrop-blur-md border-b border-slate-200 flex justify-center">
        <div className="w-full max-w-xl px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-black rounded flex items-center justify-center text-white text-[10px] font-black italic">
              V
            </div>
            <span className="font-black text-base tracking-tighter uppercase italic">
              vantan
            </span>
          </div>
          <Button
            variant="light"
            color="danger"
            size="sm"
            className="font-bold text-[10px] uppercase tracking-widest"
            onPress={handleLogout}
          >
            Logout
          </Button>
        </div>
      </header>

      {/* --- MAIN: 横幅を max-w-xl (約576px) に設定 --- */}
      <main className="w-full max-w-xl pt-10 pb-20">
        {/* 1. プロフィールエリア */}
        <section className="px-6 pb-12">
          <div className="flex flex-col items-center gap-8">
            <div className="flex flex-row items-center justify-center gap-8 w-full">
              <div className="relative flex-shrink-0">
                <Avatar
                  name={myInfo?.data?.name}
                  className="w-20 h-20 text-xl bg-slate-50 text-slate-400 border border-slate-100 shadow-sm"
                />
                <div className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" />
              </div>

              <div className="flex flex-col justify-center min-w-0">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight mb-0.5 truncate">
                  {myInfo?.data?.name || "User Name"}
                </h1>
                <p className="text-xs font-semibold text-slate-400 tabular-nums mb-3">
                  ID: {myInfo?.data?.studentId || "000000"}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="flat"
                    className="h-8 font-bold text-[10px] px-4 rounded-md uppercase tracking-wider"
                  >
                    Edit Profile
                  </Button>
                  {/* バーコード表示切り替えボタン */}
                  <Button
                    size="sm"
                    variant={showBarcode ? "solid" : "flat"}
                    color={showBarcode ? "primary" : "default"}
                    isIconOnly
                    className="h-8 w-8 rounded-md"
                    onPress={() => setShowBarcode(!showBarcode)}
                  >
                    <BarcodeIcon />
                  </Button>
                </div>
              </div>
            </div>

            {/* バーコードエリア (条件付き表示) */}
            {showBarcode &&
              (myInfo?.data?.serialNumber || myInfo?.data?.studentId) && (
                <div className="flex flex-col items-center animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                    <Barcode
                      value={myInfo.data.serialNumber || myInfo.data.studentId}
                      width={1.2}
                      height={50}
                      displayValue={false}
                      margin={0}
                      background="transparent"
                    />
                  </div>
                  <span className="text-[7px] font-black text-slate-300 uppercase tracking-[0.2em] mt-2">
                    Scan ID
                  </span>
                </div>
              )}

            {/* スタッツ情報: flex-1で各要素を広げ、横幅いっぱいに使う */}
            <div className="flex items-center justify-between w-full px-4 py-6 rounded-2xl  border-slate-100">
              {[
                { label: "Grade", value: myInfo?.data?.grade || "---" },
                { label: "Major", value: myInfo?.data?.major || "Design" },
                { label: "Rentals", value: myInfo?.data?.rentals?.length || 0 },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex flex-col items-center gap-1 flex-1"
                >
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    {stat.label}
                  </span>
                  <span className="text-lg font-black text-slate-800">
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 2. POSSESSION セクション */}
        <section className="px-6 mb-12">
          <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
            <span className="text-[16px] font-black text-black uppercase tracking-widest">
              MyRentals
            </span>
            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
              Limit: {myInfo?.data?.rentalSetting?.maxItems || 0} items
            </span>
          </div>

          {myInfo?.data?.rentals && myInfo.data.rentals.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {myInfo.data.rentals.map((rental: any) => (
                <Card
                  key={rental.id}
                  className="border border-slate-100 shadow-none bg-white hover:bg-slate-50 transition-colors"
                  radius="sm"
                >
                  <CardBody className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-300 border border-slate-100">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        </svg>
                      </div>
                      <Chip
                        size="sm"
                        variant="flat"
                        color="primary"
                        className="text-[8px] font-black uppercase"
                      >
                        Active
                      </Chip>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        {rental.item.itemType.genre.name}
                      </p>
                      <h3 className="font-bold text-[12px] text-slate-800 line-clamp-1 leading-none mb-2">
                        {rental.item.itemType.title}
                      </h3>
                      <p className="text-[10px] text-blue-500 font-bold tabular-nums">
                        ID: {rental.item.barcode}
                      </p>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-xl">
              <p className="text-xs text-slate-300 font-medium">
                No active rentals
              </p>
            </div>
          )}
        </section>

        {/* 3. STORAGE セクション */}
        <section className="px-6">
          <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
            <span className="text-[16px] font-black text-black uppercase tracking-widest">
              Storage
            </span>
            <div className="flex gap-2">
              <Input
                placeholder="Search..."
                value={searchQuery}
                onValueChange={setSearchQuery}
                variant="flat"
                className="w-32"
                size="sm"
              />
              <Button
                isIconOnly
                variant="flat"
                size="sm"
                onPress={() => setIsFilterModalOpen(true)}
              >
                <FilterIcon />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {filteredItemTypes.map((group) => (
              <Card
                key={group.itemType.title}
                isPressable
                className="border-none bg-white shadow-sm hover:bg-slate-50"
                onPress={() =>
                  router.push(
                    `/items/${encodeURIComponent(group.itemType.title)}`,
                  )
                }
              >
                <div className="aspect-square w-full bg-slate-50 relative border-b border-slate-100">
                  <div className="absolute top-2 right-2 z-10">
                    <Badge
                      color={group.availableCount > 0 ? "success" : "danger"}
                      size="sm"
                    >
                      {group.availableCount}
                    </Badge>
                  </div>
                </div>
                <div className="p-2">
                  <h3 className="font-bold text-[10px] text-slate-800 line-clamp-1">
                    {group.itemType.title}
                  </h3>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </main>

      {/* フィルタモーダル */}
      <Modal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        backdrop="blur"
        size="xs"
      >
        <ModalContent>
          <ModalHeader className="text-xs uppercase tracking-[0.2em] font-black">
            Filter Settings
          </ModalHeader>
          <ModalBody className="pb-8">
            <div className="space-y-4">
              <Select
                label="Category"
                variant="flat"
                size="sm"
                selectedKeys={categoryFilter === "ALL" ? [] : [categoryFilter]}
                onChange={(e) => setCategoryFilter(e.target.value || "ALL")}
              >
                {categories.map((cat) => (
                  <SelectItem key={cat} className="text-xs">
                    {cat}
                  </SelectItem>
                ))}
              </Select>
              <Select
                label="Genre"
                variant="flat"
                size="sm"
                selectedKeys={genreFilter === "ALL" ? [] : [genreFilter]}
                onChange={(e) => setGenreFilter(e.target.value || "ALL")}
              >
                {genres.map((gen) => (
                  <SelectItem key={gen} className="text-xs">
                    {gen}
                  </SelectItem>
                ))}
              </Select>
            </div>
          </ModalBody>
          <ModalFooter className="border-t border-slate-100">
            <Button
              variant="light"
              size="sm"
              className="font-bold text-[10px] uppercase"
              onPress={() => {
                setGenreFilter("ALL");
                setCategoryFilter("ALL");
              }}
            >
              Reset
            </Button>
            <Button
              color="primary"
              size="sm"
              className="font-black text-[10px] uppercase"
              onPress={() => setIsFilterModalOpen(false)}
            >
              Apply
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

const BarcodeIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 5h2v14H3zM7 5h1v14H7zM10 5h2v14h-2zM14 5h1v14h-1zM17 5h3v14h-3z" />
  </svg>
);

const FilterIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);
