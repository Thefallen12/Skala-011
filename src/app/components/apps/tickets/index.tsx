"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Activity, ChartNoAxesCombined, SearchCheck } from "lucide-react";
import CardBox from "@/app/components/shared/CardBox";
import { Button } from "@/components/ui/button";
import TicketFilter from "@/app/components/apps/tickets/TicketFilter";
import TicketListing from "@/app/components/apps/tickets/TicketListing";
import TicketOverviewPanels from "@/app/components/apps/tickets/TicketOverviewPanels";
import TicketStatisticsModal from "./TicketStatisticsModal";
import type {
  TicketPageRole,
  TicketProjectOption,
  TicketRow,
} from "@/app/(DashboardLayout)/types/ticket";
import { TicketStatus, TicketType, UserRole } from "@/generated/prisma/enums";
import {
  formatTicketCurrency,
  getTicketMonthlyStatistics,
  getTotalTicketValueInCents,
} from "./ticket-statistics";

const TicketStatisticsChart = dynamic(
  () => import("./TicketStatisticsChart"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[340px] items-center justify-center text-sm text-muted-foreground">
        Memuat grafik statistik...
      </div>
    ),
  },
);

const TicketRequestDistributionChart = dynamic(
  () => import("./TicketRequestDistributionChart"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        Memuat distribusi permintaan...
      </div>
    ),
  },
);

function requiresRoleAction(role: TicketPageRole, ticket: TicketRow): boolean {
  switch (role) {
    case UserRole.DIRECTOR:
      return ticket.status === TicketStatus.PENDING_DIRECTOR;
    case UserRole.FINANCE:
      return (
        ticket.status === TicketStatus.WAITING_FINANCE_PAYMENT ||
        ticket.status === TicketStatus.PROCESSED_FINANCE
      );
    case UserRole.LOGISTICS:
      return (
        ticket.type === TicketType.MATERIAL &&
        (ticket.status === TicketStatus.PROCESSED_LOGISTIC ||
          ticket.status === TicketStatus.IN_TRANSIT)
      );
    case UserRole.MOVER:
      return (
        ticket.type === TicketType.MATERIAL &&
        ticket.status === TicketStatus.ASSIGNED_TO_MOVER
      );
    case UserRole.ADMINISTRATIONS:
      return (
        ticket.status !== TicketStatus.DRAFT &&
        ticket.status !== TicketStatus.COMPLETED &&
        ticket.status !== TicketStatus.REJECTED
      );
    default:
      return ticket.status === TicketStatus.DRAFT && ticket.canSubmit;
  }
}

export default function TicketsApp({
  tickets,
  projects,
  role,
  initialOpenSheet,
}: {
  tickets: TicketRow[];
  projects: TicketProjectOption[];
  role: TicketPageRole;
  initialOpenSheet?: string;
}) {
  const [filter, setFilter] = useState("ALL");
  const [ticketSearch, setTicketSearch] = useState("");

  const actionRequired = useMemo(
    () => tickets.filter((ticket) => requiresRoleAction(role, ticket)),
    [role, tickets],
  );
  const actionRequiredIds = useMemo(
    () => new Set(actionRequired.map((ticket) => ticket.id)),
    [actionRequired],
  );
  const monthlyStatistics = useMemo(
    () => getTicketMonthlyStatistics(tickets, 12),
    [tickets],
  );
  const formattedTotal = formatTicketCurrency(
    getTotalTicketValueInCents(tickets),
  );

  const visibleTickets = useMemo(() => {
    const search = ticketSearch.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const matchesFilter =
        filter === "ALL" ||
        (filter === "ACTION_REQUIRED"
          ? actionRequiredIds.has(ticket.id)
          : ticket.status === filter);
      const matchesSearch =
        !search ||
        `${ticket.ticketNumber} ${ticket.title} ${ticket.requester.name}`
          .toLowerCase()
          .includes(search);
      return matchesFilter && matchesSearch;
    });
  }, [actionRequiredIds, filter, ticketSearch, tickets]);

  const focusTicket = (ticketNumber: string) => {
    setFilter("ALL");
    setTicketSearch(ticketNumber);
  };

  return (
    <div className="my-6 space-y-6">
      <TicketFilter
        tickets={tickets}
        activeFilter={filter}
        setFilter={setFilter}
        actionRequiredCount={actionRequired.length}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <CardBox className="overflow-hidden xl:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h3 className="font-semibold">Tren Tiket & Transaksi</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Jumlah tiket dan nilai transaksi 12 bulan terakhir
              </p>
            </div>
            <TicketStatisticsModal
              tickets={tickets}
              formattedTotal={formattedTotal}
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="Lihat statistik nilai & transaksi"
                  aria-label="Lihat statistik nilai & transaksi"
                  className="shrink-0"
                >
                  <ChartNoAxesCombined
                    className="size-5"
                    aria-hidden="true"
                  />
                </Button>
              }
            />
          </div>
          <div className="p-4">
            <TicketStatisticsChart
              months={monthlyStatistics.months}
              categoryLabel="Semua jenis permintaan"
            />
          </div>
        </CardBox>
        <CardBox className="h-full overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h3 className="font-semibold">Distribusi Jenis Permintaan</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Proporsi tiket yang dapat Anda akses
            </p>
          </div>
          <div className="p-4">
            <TicketRequestDistributionChart tickets={tickets} />
          </div>
        </CardBox>
      </div>

      <TicketOverviewPanels
        tickets={tickets}
        actionRequired={actionRequired}
        onSelectTicket={focusTicket}
        onFilter={setFilter}
      />

      <CardBox className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h3 className="font-semibold">Direktori Tiket</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Cari, tinjau, dan proses tiket yang tersedia untuk akun Anda
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {filter === "ACTION_REQUIRED" ? (
              <Activity className="size-4" aria-hidden="true" />
            ) : (
              <SearchCheck className="size-4" aria-hidden="true" />
            )}
            {visibleTickets.length} tiket
          </div>
        </div>
        <div className="px-5">
          <TicketListing
            tickets={visibleTickets}
            projects={projects}
            role={role}
            ticketSearch={ticketSearch}
            searchTickets={setTicketSearch}
            initialOpenSheet={initialOpenSheet}
          />
          {filter !== "ALL" && (
            <div className="border-t border-border py-3">
              <button
                type="button"
                className="text-sm font-medium text-primary hover:underline"
                onClick={() => setFilter("ALL")}
              >
                Tampilkan semua tiket
              </button>
            </div>
          )}
        </div>
      </CardBox>
    </div>
  );
}
