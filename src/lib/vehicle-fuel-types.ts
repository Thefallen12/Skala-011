export type VehicleFuelRequestView = {
  id: string;
  status:
    | "PENDING_FINANCE"
    | "FUNDED"
    | "REJECTED"
    | "PROOF_SUBMITTED"
    | "COMPLETED";
  source: "SPBU" | "RETAIL";
  disbursementMethod: "CASH" | "TRANSFER" | null;
  transferDestination: string | null;
  transferProofUrl: string | null;
  estimatedDistanceKm: string;
  tripDistanceKm: string | null;
  exceptionDistanceKm: string;
  exceptionReason: string | null;
  estimatedFuelLiter: string;
  unitPrice: string;
  requestedAmount: string;
  beforeFillingPhotoUrl: string;
  afterFillingPhotoUrl: string | null;
  receiptPhotoUrl: string | null;
  financeNote: string | null;
  createdAt: string;
  disbursedAt: string | null;
  proofSubmittedAt: string | null;
  doNumber: string;
  plateNumber: string;
  vehicleType: string;
  projectName: string;
  requestedByName: string;
  reviewerName: string | null;
};
