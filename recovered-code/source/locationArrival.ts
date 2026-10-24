export type LocationArrivalState = { initialized: boolean; shareId: string | null };

export function nextLocationArrival(state: LocationArrivalState, incomingShareId: string | null) {
  if (!state.initialized) return { state: { initialized: true, shareId: incomingShareId }, shouldAnnounce: false };
  if (incomingShareId === state.shareId) return { state, shouldAnnounce: false };
  return { state: { initialized: true, shareId: incomingShareId }, shouldAnnounce: incomingShareId !== null };
}

export function shouldPlayLocationArrivalSound(soundEnabled: boolean, reducedMotion: boolean) {
  return soundEnabled && !reducedMotion;
}
