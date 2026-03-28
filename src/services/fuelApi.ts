import { haversineKm } from "./distance";

const API_URL =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";

const USANSOLO_LAT = 43.217194;
const USANSOLO_LON = -2.817696;

interface RawStation {
  IDEESS: string;
  "Rótulo": string;
  "Dirección": string;
  Municipio: string;
  Latitud: string;
  "Longitud (WGS84)": string;
  "Precio Gasolina 95 E5": string;
  "Precio Gasoleo A": string;
  [key: string]: string;
}

interface ApiResponse {
  ListaEESSPrecio: RawStation[];
}

export interface FuelStation {
  id: string;
  name: string;
  address: string;
  municipality: string;
  lat: number;
  lon: number;
  price95: number | null;
  priceDiesel: number | null;
  distanceKm: number;
}

function parseCommaFloat(raw: string): number | null {
  if (!raw || raw.trim() === "") return null;
  const value = parseFloat(raw.replace(",", "."));
  return isNaN(value) ? null : value;
}

async function fetchAllStations(): Promise<RawStation[]> {
  const response = await fetch(API_URL, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as ApiResponse;
  return data.ListaEESSPrecio;
}

function parseStationsNear(
  raw: RawStation[],
  refLat: number,
  refLon: number,
  radiusKm: number,
): FuelStation[] {
  const stations: FuelStation[] = [];

  for (const s of raw) {
    const lat = parseCommaFloat(s["Latitud"]);
    const lon = parseCommaFloat(s["Longitud (WGS84)"]);

    if (lat === null || lon === null) continue;

    const distanceKm = haversineKm(refLat, refLon, lat, lon);
    if (distanceKm > radiusKm) continue;

    stations.push({
      id: s["IDEESS"],
      name: s["Rótulo"],
      address: s["Dirección"],
      municipality: s["Municipio"],
      lat,
      lon,
      price95: parseCommaFloat(s["Precio Gasolina 95 E5"]),
      priceDiesel: parseCommaFloat(s["Precio Gasoleo A"]),
      distanceKm,
    });
  }

  return stations;
}

export async function fetchNearbyStations(radiusKm: number): Promise<FuelStation[]> {
  const raw = await fetchAllStations();
  return parseStationsNear(raw, USANSOLO_LAT, USANSOLO_LON, radiusKm);
}

export async function fetchNearbyStationsAt(
  lat: number,
  lon: number,
  radiusKm: number,
): Promise<FuelStation[]> {
  const raw = await fetchAllStations();
  return parseStationsNear(raw, lat, lon, radiusKm);
}
