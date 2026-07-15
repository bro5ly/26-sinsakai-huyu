import { Card, CardBody } from "@heroui/react";

interface AuthLayoutProps {
  children: React.ReactNode;
  error?: string;
  success?: string;
}

export const AuthLayout = ({ children, error, success }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[120px] opacity-50" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100 rounded-full blur-[120px] opacity-50" />

      <div className="w-full max-w-[400px] z-10">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white font-black text-xl mb-4 shadow-xl">
            M
          </div>
          <h1 className="text-xl font-black tracking-tighter uppercase italic">
            貸し出し管理
          </h1>
          <p className="text-[10px] font-bold text-default-400 tracking-[0.3em] uppercase mt-1">
            Institutional Access
          </p>
        </div>

        <Card
          className="border-none bg-white/80 backdrop-blur-xl shadow-2xl shadow-gray-200/50"
          radius="lg"
        >
          <CardBody className="p-8">
            {/* Status Messages */}
            {error && (
              <div className="mb-6 p-3 bg-danger-50 text-danger text-[11px] font-bold rounded-lg border border-danger-100 text-center animate-appearance-in">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-6 p-3 bg-success-50 text-success text-[11px] font-bold rounded-lg border border-success-100 text-center animate-appearance-in">
                {success}
              </div>
            )}

            {children}
          </CardBody>
        </Card>

        {/* Footer Links */}
        <div className="mt-12 flex items-center justify-center gap-6">
          <a
            href="/tablet"
            className="text-[10px] font-bold text-default-400 hover:text-black transition-colors uppercase tracking-[0.2em]"
          >
            Tablet View
          </a>
          <div className="w-1 h-1 bg-default-200 rounded-full" />
          <a
            href="/barcodes"
            className="text-[10px] font-bold text-default-400 hover:text-black transition-colors uppercase tracking-[0.2em]"
          >
            Barcodes
          </a>
        </div>
      </div>
    </div>
  );
};
