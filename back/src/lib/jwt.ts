// lib/jwt.ts
import jwt from 'jsonwebtoken';
import { DomainError } from './domain-error.js';
import { getConfig } from '@/config.js';

// 残っているのはタブレットの今のトークンだけ。Webと登録用はDBの番号にした(docs/backlog.md 0.8 A8-3・A8-8)。
// タブレットもサーバーのセッションにする(0.8のe)ときに、このファイルごと消す。
// 鍵は読み込みの時点ではなく、使うときに設定から取る(読み込みの順番で鍵が空になっていたため)
const TABLET_SECRET = () => getConfig().jwt.accessSecret;

export const signTabletToken = (payload: { sub: string; role: string }) => {
  return jwt.sign(payload, TABLET_SECRET(), { expiresIn: '3m' });
};

// 期限切れは「もう一度カードを読む」、それ以外(改ざん・壊れたトークン)はログインしていない扱い(docs/backlog.md 0.7 H5)
export const verifyTabletToken = (token: string) => {
  try {
    return jwt.verify(token, TABLET_SECRET());
  } catch (err) {
    throw new DomainError(err instanceof jwt.TokenExpiredError ? 'SESSION_EXPIRED' : 'UNAUTHENTICATED');
  }
};
