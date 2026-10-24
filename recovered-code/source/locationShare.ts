import type { WorkspaceMember } from "./workspaceIdentity";

export const LOCATION_SHARE_TTL_MS = 10 * 60_000;

export type LocationShare = {
  id: string;
  sender: WorkspaceMember;
  recipient: WorkspaceMember;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  placeLabel: string;
  createdAtMs: number;
  expiresAtMs: number;
};

export function partnerSlot(member: WorkspaceMember): WorkspaceMember {
  return member === "saif" ? "haneen" : "saif";
}

export function createLocationShare(
  sender: WorkspaceMember,
  coordinates: Pick<GeolocationCoordinates, "latitude" | "longitude" | "accuracy">,
  now = Date.now(),
  placeLabel?: string,
): LocationShare {
  const latitude = Number(coordinates.latitude.toFixed(5));
  const longitude = Number(coordinates.longitude.toFixed(5));
  return {
    id: crypto.randomUUID(),
    sender,
    recipient: partnerSlot(sender),
    latitude,
    longitude,
    accuracyMeters: Number.isFinite(coordinates.accuracy) ? Math.round(coordinates.accuracy) : null,
    placeLabel: (placeLabel?.replace(/\s+/g, " ").trim() || `نقطة الخريطة: ${latitude}، ${longitude}`).slice(0, 160),
    createdAtMs: now,
    expiresAtMs: now + LOCATION_SHARE_TTL_MS,
  };
}

export function normalizeLocationShare(value: unknown): LocationShare | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const sender = raw.sender === "saif" || raw.sender === "haneen" ? raw.sender : null;
  const recipient = raw.recipient === "saif" || raw.recipient === "haneen" ? raw.recipient : null;
  const latitude = Number(raw.latitude);
  const longitude = Number(raw.longitude);
  const createdAtMs = Number(raw.createdAtMs);
  const expiresAtMs = Number(raw.expiresAtMs);
  const accuracy = raw.accuracyMeters === null || raw.accuracyMeters === undefined ? null : Number(raw.accuracyMeters);
  if (
    typeof raw.id !== "string" || !sender || !recipient || recipient !== partnerSlot(sender)
    || !Number.isFinite(latitude) || latitude < -90 || latitude > 90
    || !Number.isFinite(longitude) || longitude < -180 || longitude > 180
    || !Number.isFinite(createdAtMs) || !Number.isFinite(expiresAtMs) || expiresAtMs <= createdAtMs
    || expiresAtMs - createdAtMs > LOCATION_SHARE_TTL_MS
    || (accuracy !== null && (!Number.isFinite(accuracy) || accuracy < 0))
  ) return null;
  const placeLabel = typeof raw.placeLabel === "string" ? raw.placeLabel.replace(/\s+/g, " ").trim().slice(0, 160) : `نقطة الخريطة: ${latitude.toFixed(5)}، ${longitude.toFixed(5)}`;
  return { id: raw.id, sender, recipient, latitude, longitude, accuracyMeters: accuracy, placeLabel, createdAtMs, expiresAtMs };
}

export function isLocationShareActive(share: LocationShare | null | undefined, now = Date.now()) {
  return Boolean(share && share.expiresAtMs > now && share.createdAtMs <= now);
}

export function getLocationShareForMember(value: unknown, member: WorkspaceMember, now = Date.now()) {
  const share = normalizeLocationShare(value);
  return share && share.recipient === member && isLocationShareActive(share, now) ? share : null;
}

export function formatLocationShareRemaining(share: LocationShare, now = Date.now()) {
  const minutes = Math.max(0, Math.ceil((share.expiresAtMs - now) / 60_000));
  return minutes ? `متاح لمدة ${minutes} د` : "انتهت المشاركة";
}

export function requestBrowserLocation() {
  return new Promise<GeolocationCoordinates>((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("المتصفح ده مش بيدعم تحديد المكان."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => resolve(position.coords),
      error => reject(error),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
    );
  });
}
