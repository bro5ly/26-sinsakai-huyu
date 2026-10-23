# スキルの出典とライセンス

このプロジェクト用に、GitHub上の公開されているClaude Codeのスキルを観点ごとに選び、`.claude/skills/`にコピーしたもの。2026-10-23に取得した。各フォルダに、元のリポジトリのライセンスの全文を`LICENSE-upstream`として入れている。**`LICENSE-upstream`は消さないこと。**

## 一覧

| 観点 | スキル | 出典(取得したコミット) | ライセンス | 改変 |
|---|---|---|---|---|
| TDD | `test-driven-development` | [obra/superpowers](https://github.com/obra/superpowers) `skills/test-driven-development` (2ce8aa1) | MIT, Copyright (c) 2025 Jesse Vincent | あり: 冒頭に「このプロジェクトでの使い方」(テストは開発者が書く、既存コードを消さない) |
| テストの書き方 | `javascript-testing-patterns` | [wshobson/agents](https://github.com/wshobson/agents) `plugins/javascript-typescript/skills/javascript-testing-patterns` (0874a27) | MIT, Copyright (c) 2024 Seth Hobson | なし |
| テストの考え方 | `property-based-testing` | [trailofbits/skills](https://github.com/trailofbits/skills) `plugins/property-based-testing/skills/property-based-testing` (1e0cb77) | CC BY-SA 4.0, Trail of Bits | なし(改変するなら、改変した部分もCC BY-SA 4.0で公開し、変えたことを書く) |
| Node.js・Express | `nodejs-backend-patterns` | wshobson/agents `plugins/javascript-typescript/skills/nodejs-backend-patterns` | MIT, Copyright (c) 2024 Seth Hobson | なし |
| TypeScript | `typescript-advanced-types` | wshobson/agents `plugins/javascript-typescript/skills/typescript-advanced-types` | MIT, Copyright (c) 2024 Seth Hobson | なし |
| Prisma | `prisma-patterns` | [affaan-m/everything-claude-code](https://github.com/affaan-m/everything-claude-code) `skills/prisma-patterns` (90606c8) | MIT, Copyright (c) 2026 Affaan Mustafa | なし |
| マイグレーション | `database-migrations` | affaan-m/everything-claude-code `skills/database-migrations` | MIT, Copyright (c) 2026 Affaan Mustafa | なし |
| DB設計 | `postgresql-table-design` | wshobson/agents `plugins/database-design/skills/postgresql-table-design` | MIT, Copyright (c) 2024 Seth Hobson | なし |
| API | `rest-api-design` | affaan-m/everything-claude-code `skills/api-design` | MIT, Copyright (c) 2026 Affaan Mustafa | あり: `name`を`api-design`から変更(個人スキルと同名のため)、冒頭に使い方 |
| アーキテクチャ | `hexagonal-architecture` | affaan-m/everything-claude-code `skills/hexagonal-architecture` | MIT, Copyright (c) 2026 Affaan Mustafa | あり: 冒頭に使い方(層を増やさない、ポートは差し替える理由があるものだけ) |
| 通信・サーバー | `backend-patterns` | affaan-m/everything-claude-code `skills/backend-patterns` | MIT, Copyright (c) 2026 Affaan Mustafa | なし |
| セキュリティ | `owasp-security` | [agamm/claude-code-owasp](https://github.com/agamm/claude-code-owasp) `.claude/skills/owasp-security` (8ac7965) | MIT, Copyright (c) 2026 | なし |
| 認証 | `auth-implementation-patterns` | wshobson/agents `plugins/developer-essentials/skills/auth-implementation-patterns` | MIT, Copyright (c) 2024 Seth Hobson | なし |
| CI/CD | `github-actions-templates` | wshobson/agents `plugins/cicd-automation/skills/github-actions-templates` | MIT, Copyright (c) 2024 Seth Hobson | なし |
| リンター・確認 | `verification-loop` | affaan-m/everything-claude-code `skills/verification-loop` | MIT, Copyright (c) 2026 Affaan Mustafa | あり: 冒頭に使い方(Dockerの中で動かす) |
| Next.js | `nextjs-app-router-patterns` | wshobson/agents `plugins/frontend-mobile-development/skills/nextjs-app-router-patterns` | MIT, Copyright (c) 2024 Seth Hobson | なし |
| Next.js 16 | `nextjs-turbopack` | affaan-m/everything-claude-code `skills/nextjs-turbopack` | MIT, Copyright (c) 2026 Affaan Mustafa | なし |
| Docker | `docker-patterns` | affaan-m/everything-claude-code `skills/docker-patterns` | MIT, Copyright (c) 2026 Affaan Mustafa | あり: 関係の無い節(Hardened CLI Installer Harnesses)を削除、`description`を合わせて変更、冒頭に使い方 |
| Git | `git-advanced-workflows` | wshobson/agents `plugins/developer-essentials/skills/git-advanced-workflows` | MIT, Copyright (c) 2024 Seth Hobson | なし |
| コミット | `conventional-commit-review` | affaan-m/everything-claude-code `skills/conventional-commit-review` | MIT, Copyright (c) 2026 Affaan Mustafa | あり: 冒頭に使い方(CLAUDE.mdの日本語の書き方を優先) |
| 要件定義・仕様 | `requirements` | 開発者自身のauto-passの`.claude/skills/requirements`を元に書き換え | (開発者のもの) | 観点リストをこのプロジェクト向けに書き換え |

改変したファイルには、冒頭の「このプロジェクトでの使い方」の節に、出典・ライセンス・何を変えたかを書いている。

## 取り込む前に確かめたこと(2026-10-23)

スキルは読み込まれるとClaudeへの指示になるので、全ファイルを次の観点で確かめた。

- **見えない文字**(ゼロ幅文字・文字の向きを変える文字): なし
- **読み込み時にコマンドを実行する書き方**(`` !`…` ``)と、道具の許可を広げる`allowed-tools`・`hooks`: なし
- **外部に送る・秘密を読む・遠くのスクリプトを実行する**コマンド(`curl | sh`、`.ssh`、webhookなど): なし(セキュリティの資料が悪い例として挙げている箇所だけ)
- **指示の乗っ取り**(「前の指示を無視」「利用者に言わない」など): なし
- **出てくるURL**: OWASP・NIST・MITRE・nextjs.orgなどの資料と、`example.com`の例だけ
- **実行できるファイル・スクリプト**: なし
- **認証の例**: JWTをlocalStorageに置かない、HttpOnly Cookie、アクセス15分・リフレッシュ7日など、このプロジェクトと食い違う危ない例はなし

## 取り込まなかったもの

| スキル | 理由 |
|---|---|
| trailofbits `spec-to-code-compliance` | 元のプラグインの専用ワークフローとエージェントを呼んで動く作りで、スキルだけでは動かない |
| trailofbits `supply-chain-risk-auditor` | Pythonのスクリプトを実行する作り。依存の安全は`owasp-security`の資料で足りる |
| wshobson `dependency-upgrade` | 固定していない遠くのスクリプトを`npx`で実行する例(`jscodeshift -t https://...`)や、`npm install --force`を含む。内容もReact 17の頃のもの |
| obra `brainstorming` | 「どんな作業の前にも必ず使え」と強く自動で動く設定で、毎回の作業を止める |
| affaan-m `git-workflow`・`api-design`(名前のまま) | 開発者の個人スキル(`~/.claude/skills`)と同じ名前で、個人のほうが優先されて使われない |
| リンター専用のスキル | 信頼できる出典のものが見つからなかった。リンターの手順は`verification-loop`で扱う |

## 注意

- どれも第三者のOSSで、Anthropicのレビューを受けたものではない。内容を鵜呑みにせず、このプロジェクトの決まり(CLAUDE.md・`.claude/rules/`・`docs/`)と食い違うときは、プロジェクトの決まりを優先する
- 更新するときは、元のリポジトリから取り直し、上の確認をやり直してから入れ替える
- 開発者の個人スキル(`~/.claude/skills`: api-design・architecture・cicd・db-design・git-workflow・http-networking・security-basics・testing-strategyなど)も同時に読み込まれる。観点が重なるものがある
