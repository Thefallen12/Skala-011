export type VehicleTripLogRow = {
  id: string;
  createdAt: string;
  doNumber: string | null;
  projectName: string;
  plateNumber: string;
  vehicleType: string;
  kilometerStart: string;
  kilometerEnd: string;
  distanceKm: string;
  fuelLiter: string;
  createdByName: string;
};
