export const AUTH = { GM: "GM", PLAYER: "PLAYER" } as const;

export type Visibility = "PRIVATE" | "SHARED" | "GM_SHARED";

export function isGM(role?: string) {
  return role === AUTH.GM;
}

export function canSeeEntity(userRole: string | undefined, entityGmOnly?: string | null): boolean {
  // GM-only content: only GM sees it. No entity field sent to players otherwise.
  if (entityGmOnly) return isGM(userRole);
  return true;
}