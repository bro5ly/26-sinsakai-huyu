import bcrypt from "bcrypt";

// パスワードはbcryptのハッシュだけを持つ(R-10)。10は2010年代からの既定の重さで、1回あたり数十ミリ秒かかり総当たりを遅くする。
// サービスには buildDeps() から渡す(テストでは速い偽物を渡せる。docs/backlog.md「2. 登録・ログイン」)
export const bcryptPasswords = {
  hash: (plain: string): Promise<string> => bcrypt.hash(plain, 10),
  matches: (plain: string, hash: string): Promise<boolean> => bcrypt.compare(plain, hash),
};
