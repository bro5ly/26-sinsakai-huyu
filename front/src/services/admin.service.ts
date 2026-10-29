import type { TabletDevices } from "@sinsakai/shared";
import { ApiService } from "./api.service";

// 管理者だけのAPI(docs/api.md 4.5)。Webのセッションで、管理者でなければ403 FORBIDDEN
class AdminService extends ApiService {
  async listTabletDevices(): Promise<TabletDevices> {
    return this.get<TabletDevices>("/api/admin/tablet-devices");
  }

  // 盗まれた・使わなくなった端末を止める(R-A3)。その端末は次の操作から断られる
  async revokeTabletDevice(id: string): Promise<void> {
    await this.delete<void>(`/api/admin/tablet-devices/${encodeURIComponent(id)}`);
  }
}

export const adminService = new AdminService();
