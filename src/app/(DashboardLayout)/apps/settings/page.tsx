import { redirect } from "next/navigation";
import {
  getMenuAccessMatrix,
  getPageMaintenanceSettings,
} from "@/app/actions/settings";
import { auth } from "../../../../../auth";
import { SETTINGS_MENU_ROLES } from "@/lib/config/menus";
import { canManageUsers } from "@/lib/user-access";
import UsersDirectory from "@/components/settings/UsersDirectory";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login");
  }
  if (!SETTINGS_MENU_ROLES.includes(session.user.role)) {
    redirect("/");
  }

  const { tab } = await searchParams;
  const [settings, accessMatrix] = await Promise.all([
    getPageMaintenanceSettings(),
    getMenuAccessMatrix(),
  ]);
  const canManageUsersAccess = canManageUsers(session.user.role);
  const usersDirectory = canManageUsersAccess ? <UsersDirectory /> : null;
  const initialTab =
    tab === "maintenance"
      ? "maintenance"
      : tab === "users" && canManageUsersAccess
        ? "users"
        : "menu-access";

  return (
    <SettingsClient
      enabledKeys={settings.enabledKeys}
      canManage={settings.canManage}
      accessMatrix={accessMatrix}
      usersDirectory={usersDirectory}
      initialTab={initialTab}
    />
  );
}
