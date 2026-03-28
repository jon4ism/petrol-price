import type { FuelStation } from "./fuelApi";

function priceStr(price: number): string {
  return price.toFixed(3).replace(".", ",");
}

// Escape all MarkdownV2 special characters in a plain text value
function esc(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!\\-]/g, "\\$&");
}

// Escape characters that must be escaped inside a MarkdownV2 URL (inside parentheses)
function escUrl(url: string): string {
  return url.replace(/[)\\]/g, "\\$&");
}

function mapsLink(station: FuelStation): string {
  const url = escUrl(`https://maps.google.com/?q=${station.lat},${station.lon}`);
  return `[${esc(station.address)}](${url})`;
}

export function buildCaption(
  top5_95: FuelStation[],
  top5_diesel: FuelStation[],
  locationLabel = "Usansolo",
): string {
  const now = new Date().toLocaleString("es-ES", {
    timeZone: "Europe/Madrid",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const lines95 = top5_95.map((s, i) => {
    const price = s.price95 !== null ? `${esc(priceStr(s.price95))} €/L` : "N/D";
    return `${i + 1}\\. ${esc(s.name)} \\- ${mapsLink(s)} → ${price}`;
  });

  const linesDiesel = top5_diesel.map((s, i) => {
    const price = s.priceDiesel !== null ? `${esc(priceStr(s.priceDiesel))} €/L` : "N/D";
    return `${i + 1}\\. ${esc(s.name)} \\- ${mapsLink(s)} → ${price}`;
  });

  return [
    "⛽ *Top 5 Gasolina 95:*",
    ...lines95,
    "",
    "🚗 *Top 5 Diésel:*",
    ...linesDiesel,
    "",
    `📍 Radio: 10km desde ${esc(locationLabel)}`,
    `🕐 Actualizado: ${esc(now)}`,
  ].join("\n");
}
