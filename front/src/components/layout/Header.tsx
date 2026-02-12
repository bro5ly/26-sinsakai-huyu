import { Button } from "@heroui/react";

interface HeaderProps {
  onLogout?: () => void;
  showLogout?: boolean;
}

export const Header = ({ onLogout, showLogout = false }: HeaderProps) => {
  return (
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
        {showLogout && onLogout && (
          <Button
            variant="light"
            color="danger"
            size="sm"
            className="font-bold text-[10px] uppercase tracking-widest"
            onPress={onLogout}
          >
            Logout
          </Button>
        )}
      </div>
    </header>
  );
};
