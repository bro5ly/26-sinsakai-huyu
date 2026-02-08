// lib/jwt.ts
import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const REGISTRATION_SECRET = process.env.JWT_REFRESH_SECRET!;

export const signAccessToken = (payload: object) => {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });
};

export const signRefreshToken = (payload: object) => {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, ACCESS_SECRET);
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, REFRESH_SECRET);
};

export const signRegistrationToken = (payload: {studentId: string}) => {
    return jwt.sign(payload,REGISTRATION_SECRET,{expiresIn: "15m"})
}

export const verifyRegistrationToken = (token: string) => {
    try{
        return jwt.verify(token,REFRESH_SECRET)

    }catch(err){
        throw new Error('INVALID_OR_EXPIRED_REGISTRATION_TOKEN')
    }
}