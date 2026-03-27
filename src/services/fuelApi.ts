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

export async function fetchNearbyStations(radiusKm: number): Promise<FuelStation[]> {
  const response = await fetch(API_URL, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as ApiResponse;
  const stations: FuelStation[] = [];

  for (const raw of data.ListaEESSPrecio) {
    const lat = parseCommaFloat(raw["Latitud"]);
    const lon = parseCommaFloat(raw["Longitud (WGS84)"]);

    if (lat === null || lon === null) continue;

    const distanceKm = haversineKm(USANSOLO_LAT, USANSOLO_LON, lat, lon);
    if (distanceKm > radiusKm) continue;

    stations.push({
      id: raw["IDEESS"],
      name: raw["Rótulo"],
      address: raw["Dirección"],
      municipality: raw["Municipio"],
      lat,
      lon,
      price95: parseCommaFloat(raw["Precio Gasolina 95 E5"]),
      priceDiesel: parseCommaFloat(raw["Precio Gasoleo A"]),
      distanceKm,
    });
  }

  return stations;
}
