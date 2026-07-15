import { useState } from "react";
import { Avatar, Button } from "@heroui/react";
import Barcode from "react-barcode";
import { User, RentalSetting } from "@/types";

interface UserProfileProps {
  user: User;
  rentalSetting: RentalSetting | null;
  rentalsCount: number;
  onLogout: () => void;
}

const BarcodeIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 5v14" />
    <path d="M8 5v14" />
    <path d="M12 5v14" />
    <path d="M17 5v14" />
    <path d="M21 5v14" />
  </svg>
);

export const UserProfile = ({
  user,
  rentalSetting,
  rentalsCount,
}: UserProfileProps) => {
  const [showBarcode, setShowBarcode] = useState(false);

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
        {showBarcode && user.serialNumber && (
          <div className="flex flex-col items-center animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
              <Barcode
                value={user.serialNumber}
                width={1.2}
                height={50}
                displayValue={false}
                margin={0}
                background="transparent"
              />
            </div>
            <span className="text-[7px] font-black text-slate-300 uppercase tracking-[0.2em] mt-2">
              Serial Number
            </span>
          </div>
        )}

        {/* serialNumberがない場合の警告 */}
        {showBarcode && !user.serialNumber && (
          <div className="flex flex-col items-center animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <p className="text-xs text-orange-600 font-medium">
                Serial Number not found. Please contact administrator.
              </p>
              <p className="text-[10px] text-orange-400 mt-1">
                Student ID: {user.studentId}
              </p>
            </div>
          </div>
        )}

        {/* スタッツ情報 */}
        <div className="flex items-center justify-between w-full px-4 py-6 rounded-2xl border-slate-100">
          {[
            { label: "Grade", value: user.grade || "---" },
            { label: "Major", value: user.major || "Design" },
            { label: "Rentals", value: rentalsCount },
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
