import { useState } from "react";
import { Button, Input } from "@heroui/react";

interface TabletPinInputProps {
  loading: boolean;
  onSubmit: (pin: string) => void;
  onCancel: () => void;
}

// カードを読んだあとに入れる4桁のPIN(docs/auth.md R-A6)。入れた数字は画面に出さない
export const TabletPinInput = ({ loading, onSubmit, onCancel }: TabletPinInputProps) => {
  const [pin, setPin] = useState("");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (/^\d{4}$/.test(pin)) {
          onSubmit(pin);
          setPin("");
        }
      }}
    >
      <Input
        label="PIN(4桁)"
        variant="flat"
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        autoFocus
        value={pin}
        onValueChange={(value) => setPin(value.replace(/\D/g, ""))}
      />
      <div className="flex gap-3">
        <Button
          type="submit"
          color="primary"
          size="lg"
          className="flex-1 font-black"
          isLoading={loading}
          isDisabled={pin.length !== 4}
        >
          OK
        </Button>
        <Button variant="flat" size="lg" className="font-black" onPress={onCancel}>
          やめる
        </Button>
      </div>
    </form>
  );
};
