import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
    title: "Ticket App",
};

const CreateTickets = () => {
    redirect("/apps/tickets");
};

export default CreateTickets;