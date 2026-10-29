"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody } from "@heroui/react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminTabletDevices } from "@/hooks";
import { Header, LoadingSpinner } from "@/components";

const formatDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("ja-JP", { dateStyle: "short", timeStyle: "short" }) : "まだ使われていない";

// 管理者がタブレットの端末を見て、取り消す(UC-20・R-A3。2026-10-29 D6)。一覧と「取り消す」だけ
export default function AdminTabletsPage() {
  const router = useRouter();
  const { status, user, logout } = useAuth();
  const isAdmin = status === "authenticated" && user?.role === "ADMIN";
  const { devices, error, loading, revoke } = useAdminTabletDevices(isAdmin);

  // 確かめ終えて、ログインしていないと分かったときだけ送る(Ca6〜Ca8)
  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth");
  }, [status, router]);

  if (status !== "authenticated" || !user) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-slate-900 pb-20 font-sans flex flex-col items-center">
      <Header onLogout={logout} showLogout />
      <main className="w-full max-w-xl px-6 pt-10 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">タブレットの端末</h1>
          <Button size="sm" variant="light" onPress={() => router.push("/dashboard")}>
            ダッシュボードへ
          </Button>
        </div>

        {/* 画面では隠すだけで、守りはAPI(/api/admin の入口で管理者かを確かめる。D1) */}
        {!isAdmin && <p className="text-sm text-default-500">この画面は管理者だけが使えます。</p>}

        {isAdmin && (
          <>
            <p className="text-xs text-default-500">
              端末を登録するには、置くタブレットでタブレットの画面を開き、管理者の学籍番号とパスワードを入れてください。盗まれた・使わなくなった端末は、ここで取り消すと次の操作から使えなくなります。
            </p>
            {error && <p className="text-sm text-danger">{error}</p>}
            {loading && <LoadingSpinner />}
            {devices && devices.length === 0 && <p className="text-sm text-default-500">登録されている端末はありません。</p>}
            {devices?.map((device) => (
              <Card key={device.id} className="shadow-none border border-slate-100">
                <CardBody className="flex flex-row items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-bold truncate">{device.name}</p>
                    <p className="text-xs text-default-500">登録: {formatDateTime(device.createdAt)}</p>
                    <p className="text-xs text-default-500">最後に使った: {formatDateTime(device.lastUsedAt)}</p>
                  </div>
                  <Button
                    size="sm"
                    color="danger"
                    variant="flat"
                    onPress={() => {
                      if (window.confirm(`「${device.name}」を取り消しますか? この端末は次の操作から使えなくなります。`)) void revoke(device.id);
                    }}
                  >
                    取り消す
                  </Button>
                </CardBody>
              </Card>
            ))}
          </>
        )}
      </main>
    </div>
  );
}
