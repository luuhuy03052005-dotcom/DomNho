import { hasSpecificAddress } from './spot-validation';

export interface GeocodedVietnamAddress {
  lat: number;
  lng: number;
  matchedAddress: string;
}

export async function geocodeAddressVietnamStrict(
  queryText: string
): Promise<GeocodedVietnamAddress | null> {
  if (!queryText || !hasSpecificAddress(queryText)) return null;

  const endpoint = new URL(
    'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates'
  );
  endpoint.searchParams.set('f', 'json');
  endpoint.searchParams.set('SingleLine', `${queryText}, Việt Nam`);
  endpoint.searchParams.set('countryCode', 'VNM');
  endpoint.searchParams.set('maxLocations', '1');

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;

    const payload = await response.json();
    const candidate = payload?.candidates?.[0];
    if (!candidate?.location || Number(candidate.score || 0) < 75) return null;

    return {
      lat: Number(Number(candidate.location.y).toFixed(6)),
      lng: Number(Number(candidate.location.x).toFixed(6)),
      matchedAddress: String(candidate.address || queryText),
    };
  } catch {
    return null;
  }
}

export function buildGoogleMapsLinks(
  lat: number,
  lng: number,
  placeTitle: string,
  address: string
) {
  const query = encodeURIComponent(
    `${placeTitle || ''} ${address || ''}`.trim()
  );

  return {
    googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${query}`,
    googleMapsDirectionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=two-wheeler`,
    googleMapsEmbedUrl: `https://maps.google.com/maps?q=${lat},${lng}&hl=vi&z=16&output=embed`,
  };
}
