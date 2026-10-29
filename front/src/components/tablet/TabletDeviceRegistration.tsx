import { Button, Card, CardBody, Input } from "@heroui/react";
import { useDeviceRegistrationForm } from "@/hooks/useDeviceRegistrationForm";

interface TabletDeviceRegistrationProps {
  onRegistered: () => Promise<void> | void;
}

// 登録されていないタブレットに出す画面(UC-20)。管理者がこの場で学籍番号とパスワードを入れて登録する。
// 管理者のWebのログインは作らないので、登録が済んだら、そのまま受付の画面になる(D2)
export const TabletDeviceRegistration = ({ onRegistered }: TabletDeviceRegistrationProps) => {
  const form = useDeviceRegistrationForm(onRegistered);

  return (
    <div className="h-screen bg-[#F8F9FB] flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-sm border border-slate-100">
        <CardBody className="p-8">
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              void form.submit();
            }}
          >
            <div className="space-y-1">
              <h1 className="text-lg font-bold">この端末を登録</h1>
              <p className="text-xs text-default-500">
                このタブレットは、貸し出しの受付の端末として登録されていません。管理者の学籍番号とパスワードを入れ、置く場所が分かる名前を付けてください。
              </p>
            </div>
            <Input
              label="管理者の学籍番号"
              variant="flat"
              inputMode="numeric"
              autoComplete="off"
              value={form.studentId}
              onValueChange={form.setStudentId}
              isRequired
            />
            <Input
              label="パスワード"
              variant="flat"
              type="password"
              autoComplete="off"
              value={form.password}
              onValueChange={form.setPassword}
              isRequired
            />
            <Input
              label="端末の名前(例: 図書室入口)"
              variant="flat"
              maxLength={50}
              value={form.name}
              onValueChange={form.setName}
              isRequired
            />
            {form.error && <p className="text-xs text-danger">{form.error}</p>}
            <Button type="submit" color="primary" className="w-full font-bold" isLoading={form.loading}>
              登録する
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
};
