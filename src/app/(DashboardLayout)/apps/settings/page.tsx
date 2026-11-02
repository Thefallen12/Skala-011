import { redirect } from "next/navigation";
import {
  getMenuAccessMatrix,
  getPageMaintenanceSettings,
} from "@/app/actions/settings";
import { auth } from "../../../../../auth";
import { SETTINGS_MENU_ROLES } from "@/lib/config/menus";
import MaintenanceSettingsClient from "./MaintenanceSettingsClient";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login");
  }
  if (!SETTINGS_MENU_ROLES.includes(session.user.role)) {
    redirect("/");
  }

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
