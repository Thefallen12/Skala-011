import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserRole } from "@/generated/prisma/enums";

const roleLabels: Record<UserRole, string> = {
  [UserRole.DIRECTOR]: "Direktur",
  [UserRole.DEPUTY_DIRECTOR]: "Wakil Direktur",
  [UserRole.DRAFTER]: "Administrasi Dokumen",
  [UserRole.FINANCE]: "Keuangan",
  [UserRole.LOGISTICS]: "Logistik",
  [UserRole.KOORDINATOR]: "Koordinator Lapangan",
  [UserRole.FIELD_TEAM]: "Tim Lapangan",
  [UserRole.MOVER]: "Pengiriman",
  [UserRole.ADMINISTRATIONS]: "Administrasi",
};

const ProfileWelcome = ({
  name,
  role,
  profilePhotoUrl,
}: {
  name: string;
  role: UserRole;
  profilePhotoUrl: string | null;
}) => {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("id-ID");

  return (
    <div className="flex items-center gap-4 rounded-lg bg-lightsecondary p-6">
      <Avatar className="size-12 shrink-0">
        <AvatarImage src={profilePhotoUrl ?? undefined} alt="" />
        <AvatarFallback>{initials || "SP"}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <h5 className="card-title truncate">Selamat datang, {name}</h5>
        <p className="mb-0 text-sm text-muted-foreground">
          {roleLabels[role]} · Ringkasan operasional konstruksi
        </p>
      </div>
    </div>
  );
};

export default ProfileWelcome;
