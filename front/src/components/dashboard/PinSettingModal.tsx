import { Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { usePinForm } from "@/hooks/usePinForm";

interface PinSettingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

// タブレットで借りるときに、カードと一緒に入れるPIN(docs/auth.md R-A5・R-A6)
export const PinSettingModal = ({ isOpen, onClose, onSaved }: PinSettingModalProps) => {
  const form = usePinForm(async () => {
    await onSaved();
    onClose();
  });

  const close = () => {
    form.reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={close} backdrop="blur" size="xs">
      <ModalContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void form.submit();
          }}
        >
          <ModalHeader className="text-sm font-bold">タブレット用のPIN</ModalHeader>
          <ModalBody className="space-y-3">
            <p className="text-xs text-default-500">
              タブレットで借りるときに、カードと一緒に入れる4桁の数字です。同じ数字の並び(0000など)や、連続した数字(1234など)は使えません。
            </p>
            <Input
              label="新しいPIN(4桁)"
              variant="flat"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              value={form.pin}
              onValueChange={form.setPin}
              isRequired
            />
            {/* PINは本人だと示すものなので、変えるときはパスワードで本人を確かめ直す(P1) */}
            <Input
              label="いまのパスワード"
              variant="flat"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onValueChange={form.setPassword}
              isRequired
            />
            {form.error && <p className="text-xs text-danger">{form.error}</p>}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" size="sm" onPress={close}>
              やめる
            </Button>
            <Button type="submit" color="primary" size="sm" isLoading={form.loading}>
              保存する
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};
