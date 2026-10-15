/**
 * Formats a clean public player ID (e.g. #GB-4F7K).
 * Never exposes raw Supabase auth UUIDs or emails to other players.
 */
export function formatPublicId(profileOrId: { id?: string; publicId?: string; public_id?: string } | string | null | undefined): string {
  if (!profileOrId) return '#GB-GBDU';

  if (typeof profileOrId === 'string') {
    // If already in GB-XXXX format
    if (profileOrId.startsWith('GB-') || profileOrId.startsWith('#GB-')) {
      return profileOrId.startsWith('#') ? profileOrId : `#${profileOrId}`;
    }
    // Deterministic short hash from string
    return generateDeterministicPublicId(profileOrId);
  }

  const explicit = profileOrId.publicId || profileOrId.public_id;
  if (explicit) {
    return explicit.startsWith('#') ? explicit : `#${explicit}`;
  }

  if (profileOrId.id) {
    return generateDeterministicPublicId(profileOrId.id);
  }

  return '#GB-GBDU';
}

function generateDeterministicPublicId(seed: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  let result = '';
  for (let i = 0; i < 4; i++) {
    const idx = (hash + i * 13) % chars.length;
    result += chars[idx];
    hash = Math.floor(hash / chars.length) + (seed.charCodeAt(i % seed.length) * 7);
  }
  return `#GB-${result}`;
}
