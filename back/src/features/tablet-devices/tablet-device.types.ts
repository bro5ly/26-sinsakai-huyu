// features/tablet-devices/tablet-device.types.ts
// タブレットの端末の機能の中の型。Prismaの型はrepositoryの中だけで使い、serviceはここの名前の付いた型だけを見る(docs/backlog.md 0.7 T1〜T3)
import type { UserRecord } from "@/features/auth/auth.types.js";

export interface TabletDeviceRecord {
  id: string;
  name: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
}

export interface DeviceStore {
  create(data: { name: string; tokenHash: string; registeredById: string }): Promise<TabletDeviceRecord>;
  findByTokenHash(tokenHash: string): Promise<TabletDeviceRecord | null>;
  findById(id: string): Promise<TabletDeviceRecord | null>;
  // 取り消していない端末を、登録した日の新しい順で
  findActive(): Promise<TabletDeviceRecord[]>;
  // タブレットのAPIが呼ばれるたびに、最後に使った日時を書き換える
  touch(id: string, now: Date): Promise<void>;
  revoke(id: string, now: Date): Promise<void>;
}

export interface RegisteredDevice {
  device: TabletDeviceRecord;
  token: string; // Cookie用。応答の本文には入れない
}

// 学籍番号とパスワードで本人を確かめる(AuthService.verifyCredentials)。登録の場で管理者を確かめるのに使う(D2)
export interface CredentialVerifier {
  verifyCredentials(input: { studentId: string; password: string }, now: Date): Promise<{ user: UserRecord }>;
}
