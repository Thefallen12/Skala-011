import {
  getMenuAccessMatrix,
  getPageMaintenanceSettings,
} from "@/app/actions/settings";
import MaintenanceSettingsClient from "./MaintenanceSettingsClient";

export default async function SettingsPage() {
  const [settings, accessMatrix] = await Promise.all([
    getPageMaintenanceSettings(),
    getMenuAccessMatrix(),
  ]);

  return (
    <MaintenanceSettingsClient
      enabledKeys={settings.enabledKeys}
      canManage={settings.canManage}
      accessMatrix={accessMatrix}
    />
  );
}
