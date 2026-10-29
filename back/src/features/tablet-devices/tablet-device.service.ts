import { DomainError } from "@/lib/domain-error.js";
import { hashToken, newToken } from "@/lib/session-token.js";
import { checkDevice } from "./device.check.js";
import type { CredentialVerifier, DeviceStore, RegisteredDevice, TabletDeviceRecord } from "./tablet-device.types.js";

// タブレットの端末の登録・確かめ・取り消し(docs/auth.md R-A1〜A3、docs/spec.md UC-20)
export class TabletDeviceService {
    constructor(private readonly devices: DeviceStore, private readonly credentials: CredentialVerifier) {}

    // 置くタブレットの上で、管理者がその場で学籍番号とパスワードを入れて登録する。
    // Webのセッションは作らない(公共の場のタブレットに、管理者のログインを残さないため。D2)
    async register(input: { studentId: string; password: string; name: string }): Promise<RegisteredDevice> {
        const { user } = await this.credentials.verifyCredentials(input.studentId, input.password);
        if (user.role !== "ADMIN") throw new DomainError("FORBIDDEN");

        // 番号そのものは端末のCookieにだけ置き、DBにはハッシュだけを置く(A8-5)
        const token = newToken();
        const device = await this.devices.create({ name: input.name, tokenHash: hashToken(token), registeredById: user.id });
        return { device, token };
    }

    async authenticate(token: string | undefined, now: Date): Promise<TabletDeviceRecord> {
        if (!token) throw new DomainError("DEVICE_NOT_REGISTERED");
        const result = checkDevice(await this.devices.findByTokenHash(hashToken(token)));
        if (!result.ok) throw new DomainError(result.reason);
        await this.devices.touch(result.device.id, now);
        return result.device;
    }

    async list(): Promise<TabletDeviceRecord[]> {
        return this.devices.findActive();
    }

    // 取り消し済みなら何もしない(何度押してもよい。最初に取り消した日時を残す)
    async revoke(id: string, now: Date): Promise<void> {
        const device = await this.devices.findById(id);
        if (!device) throw new DomainError("NOT_FOUND");
        if (device.revokedAt) return;
        await this.devices.revoke(id, now);
    }
}
