// タブレット用のPIN(docs/auth.md R-A5)。画面(入力のその場の注意)とサーバー(入力の検証)の両方で同じ判断を使う

// 推測しやすいPIN: 同じ数字の並び(0000)と、1ずつ増える・減る数字(1234・4321)。
// 4桁の数字は「1234」だけで約11%を占めるという分析があり、5回でロックしても最初に試されると通ってしまう(2026-10-28 P2)。
// 9から0への回り込み(7890)は入れない。決まりを2つだけにして、利用者に説明できる形にするため
export const isGuessablePin = (pin: string): boolean => {
  const digits = [...pin].map(Number);
  const steps = digits.slice(1).map((d, i) => d - (digits[i] ?? d));
  return steps.length > 0 && steps.every((step) => step === steps[0]) && [0, 1, -1].includes(steps[0] ?? NaN);
};
