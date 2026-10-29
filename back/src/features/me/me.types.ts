// features/me/me.types.ts
// 本人の機能の中の型。Prismaの型はrepositoryの中だけで使い、serviceはここの名前の付いた型だけを見る(docs/backlog.md 0.7 T2・T3)
import type { RentalState } from "@sinsakai/shared";

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

export interface ActiveRentalRecord {
    id: string;
    rentedAt: Date;
    dueDate: Date;
    returnedAt: Date | null;
    item: { id: string; barcode: string };
    itemType: { id: string; title: string; genre: { id: string; name: string } };
}

export interface MeStore {
    findUser(userId: string): Promise<MeUserRecord | null>;
    // 返却されていない貸し出しを、借りた日の新しい順で
    findActiveRentals(userId: string): Promise<ActiveRentalRecord[]>;
    // PINを変える前に、パスワードを入れ直させて確かめる(P1)
    findPasswordHash(userId: string): Promise<string | null>;
    // PINを保存し、失敗の回数を0に戻してロックを解く(R-A7)
    savePin(data: { userId: string; pinHash: string }): Promise<void>;
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
    cardNumber: string | null;
    borrowing: {
        canBorrow: boolean;
        maxItems: number;
        suspendedUntil: Date | null;
        activeCount: number;
        hasOverdue: boolean;
    };
    pin: { registered: boolean; locked: boolean };
}

export type RentalView = ActiveRentalRecord & { state: RentalState };
