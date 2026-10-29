import { useState } from "react";
import { Avatar, Button } from "@heroui/react";
import type { Me } from "@sinsakai/shared";
import { PinSettingModal } from "./PinSettingModal";

interface UserProfileProps {
  user: Me;
  onLogout: () => void;
  // PINを保存したあとに、本人(PINの状態)を取り直す
  onPinSaved: () => Promise<void> | void;
}

// PINの状態の文言。ロック中はタブレットで借りられないので、目立たせる(R-A7)
const pinStatus = (pin: Me["pin"]) =>
  pin.locked
    ? { text: "PINがロックされています。登録し直してください", className: "text-danger" }
    : pin.registered
      ? { text: "PINは登録済みです", className: "text-slate-400" }
      : { text: "タブレットで借りるには、PINの登録が必要です", className: "text-warning-600" };

export const UserProfile = ({
  user,
  onPinSaved,
}: UserProfileProps) => {
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const status = pinStatus(user.pin);

  return (
    <section className="px-6 pb-12">
      <div className="flex flex-col items-center gap-8">
        <div className="flex flex-row items-center justify-center gap-8 w-full">
          <div className="relative flex-shrink-0">
            <Avatar
              name={user.name}
              className="w-20 h-20 text-xl bg-slate-50 text-slate-400 border border-slate-100 shadow-sm"
            />
            <div className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" />
          </div>

          <div className="flex flex-col justify-center min-w-0">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight mb-0.5 truncate">
              {user.name}
            </h1>
            <p className="text-xs font-semibold text-slate-400 tabular-nums mb-3">
              ID: {user.studentId}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="flat"
                className="h-8 font-bold text-[10px] px-4 rounded-md uppercase tracking-wider"
              >
                Edit Profile
              </Button>
            </div>
          </div>
        </div>

        {/* タブレット用のPIN(UC-7) */}
        <div className="flex items-center justify-between w-full px-4 gap-3">
          <p className={`text-xs font-medium ${status.className}`}>{status.text}</p>
          <Button
            size="sm"
            variant="flat"
            color={user.pin.registered && !user.pin.locked ? "default" : "primary"}
            className="h-8 font-bold text-[10px] px-4 rounded-md flex-shrink-0"
            onPress={() => setIsPinModalOpen(true)}
          >
            {user.pin.registered ? "PINを変える" : "PINを登録"}
          </Button>
        </div>
        <PinSettingModal
          isOpen={isPinModalOpen}
          onClose={() => setIsPinModalOpen(false)}
          onSaved={onPinSaved}
        />

        {/* スタッツ情報 */}
        <div className="flex items-center justify-between w-full px-4 py-6 rounded-2xl border-slate-100">
          {[
            { label: "Grade", value: user.grade || "---" },
            { label: "Major", value: user.major || "Design" },
            { label: "Rentals", value: user.borrowing.activeCount },
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
  );
};
