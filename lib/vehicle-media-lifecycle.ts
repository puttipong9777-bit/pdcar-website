export type PublicVehicleStatus = "available" | "reserved" | "sold" | string;

export type VehicleMediaPublication = {
  fileId: string;
  websitePublished: boolean;
  vehicleStatus: PublicVehicleStatus;
  sourceVersion: string;
  derivativeVersion: string;
  authorizedAt: string;
};

export type PublicVehicleMediaManifestEntry = {
  fileId: string;
  sourceVersion: string;
  derivativeVersion: string;
  authorizedAt: string;
};

export type StoredDerivative = {
  key: string;
};

const FILE_ID = /^FILE-[A-Za-z0-9-]{1,96}$/;
const VERSION = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

function validTimestamp(value: string) {
  return Number.isFinite(Date.parse(value));
}

export function publicVehicleMediaManifestEntry(publication: VehicleMediaPublication): PublicVehicleMediaManifestEntry | null {
  if (!publication.websitePublished || (publication.vehicleStatus !== "available" && publication.vehicleStatus !== "reserved")) return null;
  if (!FILE_ID.test(publication.fileId) || !VERSION.test(publication.sourceVersion) || !VERSION.test(publication.derivativeVersion) || !validTimestamp(publication.authorizedAt)) {
    throw new Error("invalid_public_media_manifest");
  }
  return {
    fileId: publication.fileId,
    sourceVersion: publication.sourceVersion,
    derivativeVersion: publication.derivativeVersion,
    authorizedAt: publication.authorizedAt
  };
}

export function immutableVehicleDerivativeKey(entry: PublicVehicleMediaManifestEntry) {
  if (!FILE_ID.test(entry.fileId) || !VERSION.test(entry.sourceVersion) || !VERSION.test(entry.derivativeVersion)) {
    throw new Error("invalid_public_media_manifest");
  }
  return `vehicles/${entry.fileId}/${entry.sourceVersion}/${entry.derivativeVersion}.webp`;
}

export function publicMediaManifestState(entry: PublicVehicleMediaManifestEntry | null, now = Date.now(), maxAgeMs = 5 * 60_000) {
  if (!entry) return "not_found" as const;
  const authorizedAt = Date.parse(entry.authorizedAt);
  if (!Number.isFinite(authorizedAt) || !Number.isFinite(now) || !Number.isFinite(maxAgeMs) || maxAgeMs <= 0) return "unavailable" as const;
  return now - authorizedAt <= maxAgeMs ? "current" as const : "expired" as const;
}

export function planVehicleDerivativeRefresh(entry: PublicVehicleMediaManifestEntry, stored?: StoredDerivative | null) {
  const key = immutableVehicleDerivativeKey(entry);
  return stored?.key === key
    ? { action: "skip" as const, key }
    : { action: "write_immutable" as const, key };
}
