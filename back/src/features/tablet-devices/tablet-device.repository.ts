import type { PrismaClient } from "@/generated/prisma/client.js";
import type { DeviceStore, NewDevice, TabletDeviceRecord } from "./tablet-device.types.js";

const deviceSelect = { id: true, name: true, createdAt: true, lastUsedAt: true, revokedAt: true } as const;

// タブレットの端末の行を読み書きするだけ。通してよいかの判断は device.check.ts
export class TabletDeviceRepository implements DeviceStore {
  constructor(private readonly db: PrismaClient) {}

  async createDevice(data: NewDevice): Promise<TabletDeviceRecord> {
    return this.db.tabletDevice.create({ data, select: deviceSelect });
  }

  async findDeviceByTokenHash(tokenHash: string): Promise<TabletDeviceRecord | null> {
    return this.db.tabletDevice.findUnique({ where: { tokenHash }, select: deviceSelect });
  }

  async findDeviceById(id: string): Promise<TabletDeviceRecord | null> {
    return this.db.tabletDevice.findUnique({ where: { id }, select: deviceSelect });
  }

  async findActiveDevices(): Promise<TabletDeviceRecord[]> {
    return this.db.tabletDevice.findMany({
      where: { revokedAt: null },
      orderBy: { createdAt: "desc" },
      select: deviceSelect,
    });
  }

  async saveDeviceLastUsedAt(id: string, now: Date): Promise<void> {
    await this.db.tabletDevice.update({ where: { id }, data: { lastUsedAt: now } });
  }

  async saveDeviceRevokedAt(id: string, now: Date): Promise<void> {
    await this.db.tabletDevice.update({ where: { id }, data: { revokedAt: now } });
  }
}
