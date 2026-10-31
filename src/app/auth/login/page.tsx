import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import { Login } from "@/app/components/auth/Login";
import { getRoleHomePath } from "@/lib/role-home";

const page = async () => {
    const session = await auth();
    if (session?.user) {
        redirect(getRoleHomePath(session.user.role));
    }
    return <Login />;
}

export default page;