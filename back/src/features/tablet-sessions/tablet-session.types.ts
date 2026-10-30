// タブレットの本人確認(カード + PIN)の中の型。Prismaの型はrepositoryの中だけで使う(docs/backlog.md 0.7 T1〜T3、0.9)

// カードを持つ人の、このシステムのDBにある分(PINの状態)。名前は名簿から取る
export interface CardHolderRecord {
  id: string;
  role: "MEMBER" | "ADMIN";
  isActive: boolean;
  pinHash: string | null;
  pinFailedAttempts: number;
  pinLockedAt: Date | null;
}

// PINを試した結果(間違えた回数と、ロックした日時)。repositoryに渡す入力(0.9 M3)
export interface PinAttempt {
  userId: string;
  failedAttempts: number;
  lockedAt: Date | null;
}

export interface CardHolderStore {
  findCardHolderByStudentId(studentId: string): Promise<CardHolderRecord | null>;
  savePinAttempt(data: PinAttempt): Promise<void>;
}

// タブレットで本人確認が通ったときに返すもの。借りている物・学籍番号・学年・専攻・利用者のID・カードの番号は入れない
// (docs/auth.md R-A13・2026-10-30 A2)
export interface StartedTabletSession {
  token: string; // Authorization: Bearer で送り返してもらう。DBにはハッシュだけ
  expiresAt: Date;
  displayName: string;
}
