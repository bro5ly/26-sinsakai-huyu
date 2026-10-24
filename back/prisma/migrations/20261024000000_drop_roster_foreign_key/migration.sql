-- 名簿(external_user)への外部キーを消す(docs/backlog.md 0.6、F1)。
-- 本番の名簿は学校のDBかAPIなので、このシステムのDBから名簿へ外部キーは張れない。
-- 名簿は名簿の窓口(src/features/roster)からだけ読む。名簿にいない利用者は、サービスで断る(docs/spec.md Q13)

-- DropForeignKey
ALTER TABLE "user" DROP CONSTRAINT "user_student_id_fkey";
