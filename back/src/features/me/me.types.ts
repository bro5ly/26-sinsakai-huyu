// 本人の機能の中の型。Prismaの型はrepositoryの中だけで使い、serviceはここの名前の付いた型だけを見る(docs/backlog.md 0.7 T2・T3、0.9)
import type { RentalRecord } from "@/features/rentals/rental.types.js";

// このシステムのDBにある本人。名前・メールなどは名簿(Roster)から取る
export interface MeUserRecord {
  id: string;
  studentId: string;
  role: "MEMBER" | "ADMIN";
  canBorrow: boolean;
  maxItems: number;
  suspendedUntil: Date | null;
  // PINのハッシュやロックの日時は渡さず、画面に要る「登録済みか・ロック中か」だけにする(P3)
  pin: { registered: boolean; locked: boolean };
}

// repositoryに渡す入力(0.9 M3)
export interface NewPin {
  userId: string;
  pinHash: string;
}

export interface MeStore {
  findUserById(userId: string): Promise<MeUserRecord | null>;
  // 返却されていない貸し出しを、借りた日の新しい順で。形は貸し出しと同じ(rental.select.ts。D3)
  findActiveRentalsByUserId(userId: string): Promise<RentalRecord[]>;
  // PINを変える前に、パスワードを入れ直させて確かめる(P1)
  findPasswordHashByUserId(userId: string): Promise<string | null>;
  // PINを保存し、失敗の回数を0に戻してロックを解く(R-A7)
  savePin(data: NewPin): Promise<void>;
}

// serviceが返す形。日付は中ではDateのまま持ち、APIの境目(routes)でISOの文字列にする(T5)
export interface MeView {
  id: string;
  name: string;
  studentId: string;
  userType: "STUDENT" | "FACULTY" | "EXTERNAL";
  role: "MEMBER" | "ADMIN";
  email: string;
  grade: string | null;
  major: string | null;
  borrowing: {
    canBorrow: boolean;
    maxItems: number;
    suspendedUntil: Date | null;
    activeCount: number;
    hasOverdue: boolean;
  };
  pin: { registered: boolean; locked: boolean };
}
