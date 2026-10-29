"use client";

import { useState } from "react";
import { useTabletOperations } from "@/hooks/useTabletOperations";
import { useTabletDevice } from "@/hooks/useTabletDevice";
import { TabletDeviceRegistration } from "@/components/tablet/TabletDeviceRegistration";
import { TabletPinInput } from "@/components/tablet/TabletPinInput";
import BarcodeScanner from "@/components/BarcodeScanner";
import BarcodeInput from "@/components/BarcodeInput";
import { Button, Chip, Spinner, Avatar, Switch, Divider } from "@heroui/react";

export default function TabletPage() {
  // 登録された端末か。登録されていなければ、受付の前に登録の画面を出す(UC-20・D5)
  const tabletDevice = useTabletDevice();
  const {
    step,
    stepInfo,
    userData,
    loading,
    error,
    successMessage,
    completedItem,
    handleScan,
    submitPin,
    handleReset,
    selectCheckout,
    selectReturn,
    backToActionSelect,
    resetInactivityTimer,
  } = useTabletOperations(tabletDevice.markUnregistered);

  const [isManualInput, setIsManualInput] = useState(false);

  if (tabletDevice.status === "loading") {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F8F9FB]">
        <Spinner size="lg" color="current" />
      </div>
    );
  }

  if (tabletDevice.status === "unregistered") {
    return <TabletDeviceRegistration onRegistered={tabletDevice.check} />;
  }

  return (
    <div className="h-screen bg-[#F8F9FB] text-slate-900 flex overflow-hidden font-sans select-none">
      {/* --- LEFT: Scanner Live Monitor --- */}
      <div className="relative w-[60%] h-full bg-white flex items-center justify-center overflow-hidden border-r border-slate-100 shadow-inner">
        {/* メインコンテナ：450pxの正方形 */}
        <div className="relative w-[450px] h-[450px] flex items-center justify-center z-10">
          {/* カメラ本体：R(角丸)5remでクリップ */}
          <div className="absolute inset-0 rounded-[5rem] overflow-hidden border border-slate-100 shadow-2xl bg-black">
            <BarcodeScanner
              key={step}
              onScan={handleScan}
              onError={() => {}}
              isActive={step === "signin" || step === "checkout" || step === "return"}
            />
          </div>

          {/* 四隅の大型コーナーガイド：カメラの端にピッタリ合わせる(inset-0) */}
          {(step === "signin" || step === "checkout" || step === "return") && (
            <div className="absolute inset-0 pointer-events-none z-20 animate-fade-in">
              <div className="absolute top-0 left-0 w-24 h-24 border-t-[10px] border-l-[10px] border-blue-500 rounded-tl-[5rem]" />
              <div className="absolute top-0 right-0 w-24 h-24 border-t-[10px] border-r-[10px] border-blue-500 rounded-tr-[5rem]" />
              <div className="absolute bottom-0 left-0 w-24 h-24 border-b-[10px] border-l-[10px] border-blue-500 rounded-bl-[5rem]" />
              <div className="absolute bottom-0 right-0 w-24 h-24 border-b-[10px] border-r-[10px] border-blue-500 rounded-br-[5rem]" />

              {/* レーザー走査線 */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[3px] bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.6)] animate-pulse" />
            </div>
          )}
        </div>

        {/* 下部テキスト：背景ボックスなしのクリーンな表示 */}
        {(step === "signin" || step === "checkout" || step === "return") && (
          <div className="absolute bottom-16 z-30">
            <p className="text-[14px] font-black tracking-[0.5em] text-blue-600 uppercase italic">
              Active Scanning Mode
            </p>
          </div>
        )}

        {/* ステータス表示（左上） */}
        <div className="absolute top-10 left-10 flex items-center gap-3 px-6 py-4 bg-white rounded-2xl shadow-sm border border-slate-100 z-30">
          <div
            className={`w-3 h-3 rounded-full ${loading ? "bg-amber-400 animate-bounce" : "bg-green-500 animate-pulse"}`}
          />
          <span className="text-[10px] font-black tracking-widest uppercase text-slate-500">
            System Ready
          </span>
        </div>
      </div>

      {/* --- RIGHT: Control Panel --- */}
      <div className="w-[40%] h-full bg-[#FBFBFC] p-12 flex flex-col justify-between overflow-y-auto relative">
        <header className="space-y-8">
          <div
            className="flex justify-between items-center"
            onClick={resetInactivityTimer}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black">
                T
              </div>
              <h1 className="text-xl font-black italic tracking-tighter uppercase leading-none">
                Vantan
              </h1>
            </div>
            <Switch
              size="sm"
              isSelected={isManualInput}
              onValueChange={setIsManualInput}
            >
              <span className="text-[9px] font-black uppercase text-slate-400">
                Manual
              </span>
            </Switch>
          </div>

          <Divider className="opacity-40" />

          {userData && (
            <div className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-4 animate-appearance-in">
              <Avatar
                name={userData.displayName}
                size="sm"
                className="bg-blue-50 text-blue-600 font-black"
              />
              <div className="flex-grow">
                <p className="text-sm font-black text-slate-800 leading-none">
                  {userData.displayName}
                </p>
                {/* 借りている物の名前・期限・延滞だけを出す(学籍番号などはAPIが返さない。R-A13) */}
                {userData.rentals.map((rental, i) => (
                  <p key={i} className={`text-[10px] font-bold mt-1 ${rental.state === "OVERDUE" ? "text-danger" : "text-slate-400"}`}>
                    {rental.title}・{new Date(rental.dueDate).toLocaleDateString("ja-JP")}まで{rental.state === "OVERDUE" ? "(延滞)" : ""}
                  </p>
                ))}
              </div>
              <Chip
                size="sm"
                color="primary"
                variant="flat"
                className="font-black"
              >
                {userData.rentals.length} Items
              </Chip>
            </div>
          )}
        </header>

        <div className="flex-grow flex flex-col justify-center py-10">
          {error && (
            <div className="mb-8 p-6 bg-red-50 border-2 border-red-100 rounded-[2.5rem] text-red-600 animate-shake">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1">
                Error
              </p>
              <p className="text-sm font-bold">{error}</p>
            </div>
          )}

          {(step === "signin" || step === "checkout" || step === "return") && (
            <div className="space-y-8 animate-appearance-in">
              <div className="space-y-3">
                <h2
                  className={`text-6xl font-black tracking-tighter uppercase italic leading-[0.85] ${stepInfo.color}`}
                >
                  {stepInfo.title}
                </h2>
                <p className="text-sm font-medium text-slate-400">
                  {stepInfo.sub}
                </p>
              </div>
              {isManualInput && (
                <div className="pt-4">
                  <BarcodeInput onSubmit={handleScan} buttonText="Proceed" />
                </div>
              )}
              {/* カード無しで返す(返すのは本人でなくてよい。A-Q4・E7) */}
              {step === "signin" && (
                <Button
                  onPress={selectReturn}
                  className="h-20 bg-emerald-500 text-white font-black italic text-2xl rounded-[2rem] shadow-xl shadow-emerald-200"
                >
                  返す(カード不要)
                </Button>
              )}
              {step !== "signin" && (
                <Button
                  variant="flat"
                  size="lg"
                  className="rounded-full px-8 font-black text-xs"
                  onPress={backToActionSelect}
                >
                  Back
                </Button>
              )}
            </div>
          )}

          {step === "pin" && (
            <div className="space-y-8 animate-appearance-in">
              <div className="space-y-3">
                <h2 className={`text-6xl font-black tracking-tighter uppercase italic leading-[0.85] ${stepInfo.color}`}>{stepInfo.title}</h2>
                <p className="text-sm font-medium text-slate-400">{stepInfo.sub}</p>
              </div>
              <TabletPinInput loading={loading} onSubmit={submitPin} onCancel={handleReset} />
            </div>
          )}

          {step === "action-select" && (
            <div className="grid grid-cols-1 gap-6 animate-appearance-in">
              <Button
                onPress={selectCheckout}
                className="h-32 bg-blue-600 text-white font-black italic text-4xl rounded-[2.5rem] shadow-xl shadow-blue-200"
              >
                CHECKOUT
              </Button>
              <Button
                onPress={selectReturn}
                className="h-32 bg-emerald-500 text-white font-black italic text-4xl rounded-[2.5rem] shadow-xl shadow-emerald-200"
              >
                RETURN
              </Button>
              <Button
                variant="light"
                color="danger"
                className="mt-4 font-black text-xs opacity-30"
                onPress={handleReset}
              >
                終わる
              </Button>
            </div>
          )}

          {step === "complete" && (
            <div className="space-y-10 py-6 animate-appearance-in">
              <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center text-5xl shadow-inner border border-emerald-100">
                ✓
              </div>
              <div className="space-y-3">
                <h2 className="text-6xl font-black tracking-tighter uppercase italic text-emerald-500 leading-none">
                  Success
                </h2>
                <p className="text-sm font-medium text-slate-500">
                  {successMessage}
                </p>
              </div>
              {completedItem && (
                <div className="p-8 bg-white border border-slate-100 rounded-[3rem] shadow-sm">
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-3">
                    Target Item
                  </p>
                  <p className="font-black text-2xl text-slate-800 tracking-tight">
                    {completedItem.title}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 pt-6">
                <Button
                  color="primary"
                  size="lg"
                  className="h-20 font-black italic text-2xl rounded-3xl shadow-xl shadow-blue-200"
                  onPress={backToActionSelect}
                >
                  Next Operation
                </Button>
                <Button
                  variant="light"
                  className="font-bold text-slate-300 uppercase tracking-widest text-[10px]"
                  onPress={handleReset}
                >
                  終わる
                </Button>
              </div>
            </div>
          )}
        </div>

        <footer className="pt-10 border-t border-slate-100 text-center">
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em] italic leading-none">
            Institutional Tablet v2.5 Stable
          </p>
        </footer>
      </div>

      {loading && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-md flex flex-col items-center justify-center z-50 animate-fade-in">
          <div className="p-12 bg-white/90 rounded-[4rem] shadow-2xl flex flex-col items-center border border-white">
            <Spinner size="lg" color="primary" />
            <p className="mt-6 text-[10px] font-black uppercase tracking-[0.4em] text-blue-600 animate-pulse">
              Communicating...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
