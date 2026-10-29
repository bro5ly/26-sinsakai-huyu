import bcrypt from "bcrypt";

// パスワードとPINのハッシュ。serviceは buildDeps() から受け取る(テストでは速い偽物を渡せる。docs/backlog.md 0.9 D1)
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  // 平文とハッシュはどちらも文字列なので、取り違えないように名前で渡す(0.7 T4)
  matches(input: { plain: string; hash: string }): Promise<boolean>;
}

// パスワードはbcryptのハッシュだけを持つ(R-10)。10は2010年代からの既定の重さで、1回あたり数十ミリ秒かかり総当たりを遅くする
export const bcryptPasswords: PasswordHasher = {
  hash: (plain) => bcrypt.hash(plain, 10),
  matches: ({ plain, hash }) => bcrypt.compare(plain, hash),
};
