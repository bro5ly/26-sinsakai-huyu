"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { authApi, ApiError, type ItemsResponse } from "@/lib/auth-api";
import {
  Card,
  CardBody,
  Button,
  Chip,
  Spinner,
  Divider,
  Image,
} from "@heroui/react";

export default function ItemDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { isAuthenticated, accessToken } = useAuth();
  const title = decodeURIComponent(params.title as string);

  const [allItems, setAllItems] = useState<ItemsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth");
      return;
    }
    loadData();
  }, [isAuthenticated]);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const itemsData = await authApi.getAllItems();
      setAllItems(itemsData);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("情報の取得に失敗しました");
      }
    } finally {
      setLoading(false);
    }
  };

  const items =
    allItems?.data?.filter((item) => item.itemType.title === title) || [];
  const itemType = items.length > 0 ? items[0].itemType : null;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white">
        <Spinner size="lg" color="current" />
        <p className="text-sm font-medium text-default-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 pb-20 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-divider">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Button
            variant="light"
            size="sm"
            onPress={() => router.back()}
            className="font-bold text-default-500 hover:text-black"
            startContent={<span>←</span>}
          >
            BACK
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-default-300">
              Item Details
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-10 space-y-12">
        {error && (
          <div className="p-4 bg-danger-50 text-danger text-xs font-bold rounded-lg border border-danger-100">
            {error}
          </div>
        )}

        {itemType && (
          <section className="grid grid-cols-1 md:grid-cols-12 gap-10">
            {/* Left: Image Card */}
            <div className="md:col-span-5">
              <Card className="border-none bg-white p-2" shadow="sm">
                <div className="aspect-square rounded-lg overflow-hidden bg-default-50 flex items-center justify-center">
                  {itemType.imageUrl ? (
                    <img
                      src={itemType.imageUrl}
                      alt={title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-default-200 font-black text-4xl italic">
                      NO IMAGE
                    </span>
                  )}
                </div>
              </Card>
            </div>

            {/* Right: Info Area */}
            <div className="md:col-span-7 flex flex-col justify-center">
              <div className="space-y-2 mb-6">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em]">
                  {itemType.genre.category.name} / {itemType.genre.name}
                </p>
                <h1 className="text-3xl font-black tracking-tighter leading-none">
                  {title}
                </h1>
              </div>

              <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                <div className="border-l-2 border-default-100 pl-4">
                  <p className="text-[10px] text-default-400 font-bold uppercase tracking-wider">
                    Manufacturer
                  </p>
                  <p className="text-sm font-bold">
                    {itemType.manufacturer || "N/A"}
                  </p>
                </div>
                <div className="border-l-2 border-default-100 pl-4">
                  <p className="text-[10px] text-default-400 font-bold uppercase tracking-wider">
                    Model
                  </p>
                  <p className="text-sm font-bold">{itemType.model || "N/A"}</p>
                </div>
                <div className="border-l-2 border-default-100 pl-4">
                  <p className="text-[10px] text-default-400 font-bold uppercase tracking-wider">
                    Rental Period
                  </p>
                  <p className="text-sm font-bold">
                    {itemType.rentalPeriodDays} Days
                  </p>
                </div>
                <div className="border-l-2 border-default-100 pl-4">
                  <p className="text-[10px] text-default-400 font-bold uppercase tracking-wider">
                    Total Stock
                  </p>
                  <p className="text-sm font-bold">{items.length} units</p>
                </div>
              </div>

              {itemType.description && (
                <div className="mt-8 pt-6 border-t border-default-100">
                  <p className="text-[10px] text-default-400 font-bold uppercase tracking-wider mb-2">
                    Description
                  </p>
                  <p className="text-sm text-default-600 leading-relaxed max-w-md">
                    {itemType.description}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        <Divider className="opacity-50" />

        {/* Inventory List */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-bold text-default-400 uppercase tracking-[0.2em]">
              Inventory List
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-4">
            {items.map((item) => (
              <Card
                key={item.id}
                className="border-none bg-white border border-transparent hover:border-default-200 transition-all"
                shadow="sm"
              >
                <CardBody className="p-4 flex flex-row items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-default-400 font-bold uppercase tracking-tighter mb-1">
                      Asset ID
                    </span>
                    <span className="text-md font-mono font-black">
                      {item.barcode}
                    </span>
                    {item.location && (
                      <span className="text-[10px] text-default-500 mt-1 uppercase">
                        Loc: {item.location}
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <Chip
                      color={
                        item.status === "AVAILABLE"
                          ? "success"
                          : item.status === "RENTED"
                            ? "warning"
                            : "default"
                      }
                      variant="flat"
                      size="sm"
                      className="px-2 font-black text-[10px] uppercase h-7"
                    >
                      {item.status === "AVAILABLE"
                        ? "Available"
                        : item.status === "RENTED"
                          ? "On Loan"
                          : "Maintenance"}
                    </Chip>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>

          {items.length === 0 && (
            <div className="py-20 text-center border-2 border-dashed border-default-100 rounded-2xl">
              <p className="text-xs font-bold text-default-300 uppercase tracking-widest">
                No inventory found
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
