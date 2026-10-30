// タブレットの端末の機能の中の型。Prismaの型はrepositoryの中だけで使い、serviceはここの名前の付いた型だけを見る(docs/backlog.md 0.7 T1〜T3、0.9)
import type { UserRecord } from "@/features/auth/auth.types.js";

export interface TabletDeviceRecord {
  id: string;
  name: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
}

// repositoryに渡す入力(0.9 M3)
export interface NewDevice {
  name: string;
  tokenHash: string;
  registeredById: string;
}

export interface DeviceStore {
  createDevice(data: NewDevice): Promise<TabletDeviceRecord>;
  findDeviceByTokenHash(tokenHash: string): Promise<TabletDeviceRecord | null>;
  findDeviceById(id: string): Promise<TabletDeviceRecord | null>;
  // 取り消していない端末を、登録した日の新しい順で
  findActiveDevices(): Promise<TabletDeviceRecord[]>;
  // タブレットのAPIが呼ばれるたびに、最後に使った日時を書き換える
  saveDeviceLastUsedAt(id: string, now: Date): Promise<void>;
  // 行は消さない(返却を受け付けた端末を、貸し出しの記録から指すため。D4)
  saveDeviceRevokedAt(id: string, now: Date): Promise<void>;
}

export interface RegisteredDevice {
  device: TabletDeviceRecord;
  token: string; // Cookie用。応答の本文には入れない
}

// 学籍番号とパスワードで本人を確かめる(AuthService.verifyCredentials)。登録の場で管理者を確かめるのに使う(D2)
export interface CredentialVerifier {
  verifyCredentials(input: { studentId: string; password: string }, now: Date): Promise<{ user: UserRecord }>;
}
