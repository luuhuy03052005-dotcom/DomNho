import { DomSpot, isSpotDeletedOrHidden } from './types';
import { calculateDistanceMeters } from './security';
import { isSpotPinAllowedOnMap } from './spot-validation';

export interface VisualAnalysisResult {
  isPet?: boolean;
  species: 'cat' | 'dog' | 'other';
  breed: string;
  coatColor: string;
  primaryColors: string[];
  coatPattern: string;
  traits: string[];
  suggestedTitle: string;
  visualMatches?: Array<{
    spotId: string;
    confidence: number;
    reason: string;
  }>;
}

export interface VisualMatchItem {
  spot: DomSpot;
  matchPercent: number;
  matchReasons: string[];
  distanceMeters: number | null;
}

const COLOR_SYNONYMS: Record<string, string[]> = {
  vang: ['vàng', 'cam', 'ginger', 'orange', 'yellow', 'mướp vàng', 'vàng cam'],
  trang: ['trắng', 'white', 'kem', 'bạch'],
  den: ['đen', 'black', 'mun', 'mực'],
  xam: ['xám', 'xanh xám', 'grey', 'gray', 'tro'],
  nau: ['nâu', 'brown', 'socola', 'chocolate'],
  muop: ['mướp', 'vằn', 'tabby', 'sọc'],
  tam_the: ['tam thể', 'calico', 'ba màu'],
  nhi_the: ['nhị thể', 'hai màu', 'vàng trắng', 'đen trắng', 'bò sữa'],
};

function normalizeVi(str: string): string {
  return String(str || '')
    .toLowerCase()
    .trim();
}

function extractColorGroups(text: string): string[] {
  const lower = normalizeVi(text);
  const found: string[] = [];
  for (const [groupKey, words] of Object.entries(COLOR_SYNONYMS)) {
    if (words.some((w) => lower.includes(w))) {
      found.push(groupKey);
    }
  }
  return found;
}

function detectEffectiveSpecies(spot: DomSpot): {
  hasCat: boolean;
  hasDog: boolean;
  isOtherBird: boolean;
} {
  const fullText = normalizeVi(
    `${spot.title} ${spot.breed} ${spot.coatColor} ${spot.story} ${(spot.traits || []).join(' ')}`
  );

  if (
    fullText.includes('chim') ||
    fullText.includes('cú lợn') ||
    fullText.includes('đại bàng')
  ) {
    return { hasCat: false, hasDog: false, isOtherBird: true };
  }

  const mentionsCat =
    fullText.includes('mèo') ||
    fullText.includes('miu') ||
    spot.species === 'cat';
  const mentionsDog =
    fullText.includes('chó') ||
    fullText.includes('cún') ||
    fullText.includes('poodle') ||
    fullText.includes('husky') ||
    fullText.includes('corgi') ||
    spot.species === 'dog';

  return {
    hasCat: mentionsCat,
    hasDog: mentionsDog,
    isOtherBird: false,
  };
}

export function rankSpotsByVisualSimilarity(
  analysis: VisualAnalysisResult,
  spots: DomSpot[],
  userCoords?: { lat: number; lng: number },
  excludeSpotIdOrDeletedIds?: string | Set<string> | string[],
  deletedIdsParam?: Set<string> | string[]
): VisualMatchItem[] {
  if (analysis.isPet === false) {
    return [];
  }

  const excludeSpotId =
    typeof excludeSpotIdOrDeletedIds === 'string'
      ? excludeSpotIdOrDeletedIds
      : undefined;
  const deletedIds =
    deletedIdsParam ??
    (typeof excludeSpotIdOrDeletedIds === 'object'
      ? excludeSpotIdOrDeletedIds
      : undefined);

  const aiMap = new Map<string, { confidence: number; reason: string }>();
  if (Array.isArray(analysis.visualMatches)) {
    for (const m of analysis.visualMatches) {
      if (m && m.spotId && typeof m.confidence === 'number') {
        aiMap.set(m.spotId, {
          confidence: m.confidence,
          reason: m.reason || '',
        });
      }
    }
  }

  const queryColors = extractColorGroups(
    `${analysis.coatColor} ${(analysis.primaryColors || []).join(' ')} ${analysis.coatPattern || ''} ${analysis.breed}`
  );
  const queryBreed = normalizeVi(analysis.breed);
  const queryTraits = (analysis.traits || []).map(normalizeVi).filter(Boolean);

  const results: VisualMatchItem[] = [];
  const seenIds = new Set<string>(excludeSpotId ? [excludeSpotId] : []);

  for (const spot of spots) {
    if (!spot || !spot.id || seenIds.has(spot.id)) continue;
    seenIds.add(spot.id);

    if (isSpotDeletedOrHidden(spot, deletedIds)) continue;
    if (spot.status === 'RESOLVED' || spot.entityCategory === 'RESCUE_CENTER') {
      continue;
    }

    const spotSpecies = detectEffectiveSpecies(spot);

    if (analysis.species === 'cat') {
      if (spotSpecies.isOtherBird) continue;
      if (!spotSpecies.hasCat && spotSpecies.hasDog) continue;
    } else if (analysis.species === 'dog') {
      if (spotSpecies.isOtherBird) continue;
      if (!spotSpecies.hasDog && spotSpecies.hasCat) continue;
    } else if (analysis.species === 'other') {
      if (!spotSpecies.isOtherBird && spot.species !== 'other') continue;
    }

    const reasons: string[] = [];
    let deterministicScore = 0;
    let hasConcreteMatch = false;

    const isExactSingleSpecies =
      (analysis.species === 'cat' && spotSpecies.hasCat && !spotSpecies.hasDog) ||
      (analysis.species === 'dog' && spotSpecies.hasDog && !spotSpecies.hasCat) ||
      (analysis.species === 'other' && spotSpecies.isOtherBird);

    if (isExactSingleSpecies) {
      deterministicScore += 38;
      reasons.push(
        analysis.species === 'cat'
          ? 'Cùng loài mèo'
          : analysis.species === 'dog'
          ? 'Cùng loài chó'
          : 'Cùng loài động vật'
      );
    } else {
      deterministicScore += 24;
      reasons.push('Có cứu trợ cùng loài');
    }

    const spotFullText = normalizeVi(
      `${spot.title} ${spot.breed} ${spot.coatColor} ${spot.story} ${(spot.traits || []).join(' ')}`
    );

    const spotColors = extractColorGroups(spotFullText);
    const sharedColors = queryColors.filter((c) => spotColors.includes(c));
    if (sharedColors.length > 0) {
      hasConcreteMatch = true;
      deterministicScore += Math.min(28, 18 + sharedColors.length * 5);
      reasons.push(`Trùng màu lông (${analysis.coatColor})`);
    } else if (
      analysis.coatColor &&
      normalizeVi(analysis.coatColor) !== 'chưa rõ màu lông' &&
      spotFullText.includes(normalizeVi(analysis.coatColor))
    ) {
      hasConcreteMatch = true;
      deterministicScore += 22;
      reasons.push(`Trùng màu lông (${analysis.coatColor})`);
    }

    if (
      queryBreed &&
      queryBreed.length > 2 &&
      queryBreed !== 'chưa rõ giống' &&
      queryBreed !== 'mèo' &&
      queryBreed !== 'chó' &&
      queryBreed !== 'thú cưng' &&
      spotFullText.includes(queryBreed)
    ) {
      hasConcreteMatch = true;
      deterministicScore += 18;
      reasons.push(`Trùng giống (${analysis.breed})`);
    }

    const matchedTraits = queryTraits.filter((qt) => {
      if (qt.length < 3) return false;
      return spotFullText.includes(qt);
    });

    if (matchedTraits.length > 0) {
      hasConcreteMatch = true;
      deterministicScore += Math.min(16, matchedTraits.length * 8);
      reasons.push(`Khớp đặc điểm: ${matchedTraits.slice(0, 2).join(', ')}`);
    }

    let distanceMeters: number | null = null;
    if (userCoords && isSpotPinAllowedOnMap(spot)) {
      distanceMeters = calculateDistanceMeters(
        userCoords.lat,
        userCoords.lng,
        spot.publicLat,
        spot.publicLng
      );
      if (distanceMeters <= 5000) {
        deterministicScore += 6;
      }
    }

    const aiMatch = aiMap.get(spot.id);
    let finalPercent = deterministicScore;

    if (aiMatch && aiMatch.confidence > 0) {
      hasConcreteMatch = true;
      if (aiMatch.reason && !reasons.includes(aiMatch.reason)) {
        reasons.unshift(aiMatch.reason);
      }
      finalPercent = Math.round(aiMatch.confidence * 0.6 + deterministicScore * 0.4);
    }

    if (!hasConcreteMatch) {
      continue;
    }

    finalPercent = Math.min(98, Math.max(0, finalPercent));

    if (finalPercent >= 55) {
      results.push({
        spot,
        matchPercent: finalPercent,
        matchReasons: reasons.slice(0, 3),
        distanceMeters,
      });
    }
  }

  return results.sort((a, b) => {
    if (b.matchPercent !== a.matchPercent) {
      return b.matchPercent - a.matchPercent;
    }
    if (a.distanceMeters !== null && b.distanceMeters !== null) {
      return a.distanceMeters - b.distanceMeters;
    }
    return 0;
  });
}

