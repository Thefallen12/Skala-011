import Link from "next/link";
import CardBox from "../shared/CardBox";
import { Badge } from "@/components/ui/badge";

type DashboardTicket = {
  id: string;
  ticketNumber: string;
  title: string;
  createdAt: string;
  totalAmount: string;
  statusLabel: string;
};

export const RecentTransaction = ({
  tickets,
}: {
  tickets: DashboardTicket[];
}) => (
  <CardBox className="h-full w-full">
    <div className="flex flex-col">
      <h5 className="card-title">Tiket Terbaru</h5>
      <p className="text-sm font-normal text-muted-foreground">
        Permintaan terbaru yang tercatat
      </p>
    </div>
    <div className="mt-6">
      {tickets.length ? (
        tickets.map((ticket, index) => (
          <div className="flex gap-x-3" key={ticket.id}>
            <div className="w-1/4 text-end">
              <span className="text-xs font-medium text-muted-foreground">
                {ticket.createdAt}
              </span>
            </div>
            <div
              className={`relative ${
                index === tickets.length - 1 ? "after:hidden" : ""
              } after:absolute after:bottom-0 after:start-3.5 after:top-7 after:w-px after:-translate-x-[0.5px] after:bg-border`}
            >
              <div className="relative z-1 flex h-7 w-7 items-center justify-center">
                <span className="size-3 rounded-full border-2 border-primary" />
              </div>
            </div>
            <div className="w-1/4 grow pb-5 pt-0.5">
              <Link
                href="/apps/tickets"
                className="text-sm font-semibold text-foreground hover:text-primary"
              >
                {ticket.title}
              </Link>
              <p className="mt-1 text-xs text-muted-foreground">
                {ticket.ticketNumber}
                {ticket.totalAmount !== "—" ? ` · ${ticket.totalAmount}` : ""}
              </p>
              <Badge variant="gray" className="mt-2">
                {ticket.statusLabel}
              </Badge>
            </div>
          </div>
        ))
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Belum ada tiket.
        </p>
      )}
    </div>
  </CardBox>
);
