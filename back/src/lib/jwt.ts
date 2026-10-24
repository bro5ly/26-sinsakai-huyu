// lib/jwt.ts
import jwt from 'jsonwebtoken';
import { DomainError } from './domain-error.js';
import { getConfig } from '@/config.js';

// 鍵は読み込みの時点ではなく、使うときに設定から取る(読み込みの順番で鍵が空になっていたため)。0.8で用途ごとの鍵に作り直す
const ACCESS_SECRET = () => getConfig().jwt.accessSecret;
const REFRESH_SECRET = () => getConfig().jwt.refreshSecret;
const REGISTRATION_SECRET = () => getConfig().jwt.refreshSecret;

export const signAccessToken = (payload: object) => {
  return jwt.sign(payload, ACCESS_SECRET(), { expiresIn: '15m' });
};

export const signRefreshToken = (payload: object) => {
  return jwt.sign(payload, REFRESH_SECRET(), { expiresIn: '7d' });
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, ACCESS_SECRET());
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, REFRESH_SECRET());
};

export const signRegistrationToken = (payload: {studentId: string}) => {
    return jwt.sign(payload,REGISTRATION_SECRET(),{expiresIn: "15m"})
}

export const verifyRegistrationToken = (token: string) => {
    try{
        return jwt.verify(token,REFRESH_SECRET())

    }catch(err){
        throw new Error('INVALID_OR_EXPIRED_REGISTRATION_TOKEN')
    }
}

export const signTabletToken = (payload: { sub: string; role: string }) => {
  return jwt.sign(payload, ACCESS_SECRET(), { expiresIn: '3m' });
};

// 検証用（既存の verifyAccessToken を使っても良いですが、名前を分けておくと分かりやすいです）
// 期限切れは「もう一度カードを読む」、それ以外(改ざん・壊れたトークン)はログインしていない扱い(docs/backlog.md 0.7 H5)
export const verifyTabletToken = (token: string) => {
  try {
    return jwt.verify(token, ACCESS_SECRET());
  } catch (err) {
    throw new DomainError(err instanceof jwt.TokenExpiredError ? 'SESSION_EXPIRED' : 'UNAUTHENTICATED');
  }
};