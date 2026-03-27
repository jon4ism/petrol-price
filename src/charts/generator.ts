import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import type { ChartConfiguration } from "chart.js";
import type { FuelStation } from "../services/fuelApi";

const WIDTH = 900;
const HEIGHT = 520;

// Singleton — created once to avoid repeated initialization overhead on Pi 3
const renderer = new ChartJSNodeCanvas({
  width: WIDTH,
  height: HEIGHT,
  backgroundColour: "#646464",
});

function truncate(str: string, len: number): string {
  return str.length <= len ? str : str.slice(0, len - 1) + "…";
}

export async function generateFuelChart(
  stations95: FuelStation[],
  stationsDiesel: FuelStation[],
): Promise<Buffer> {
  // Build a deduplicated ordered label list: 95-list first, then diesel-only stations
  const seen = new Set<string>();
  const merged: FuelStation[] = [];

  for (const s of stations95) {
    if (!seen.has(s.id)) {
      seen.add(s.id);
      merged.push(s);
    }
  }
  for (const s of stationsDiesel) {
    if (!seen.has(s.id)) {
      seen.add(s.id);
      merged.push(s);
    }
  }

  const stationMap = new Map<string, FuelStation>();
  for (const s of [...stations95, ...stationsDiesel]) {
    stationMap.set(s.id, s);
  }

  const labels = merged.map(
    (s) => `${truncate(s.name, 10)} ${truncate(s.municipality, 8)}`,
  );
  const data95 = merged.map((s) => stationMap.get(s.id)?.price95 ?? null);
  const dataDiesel = merged.map((s) => stationMap.get(s.id)?.priceDiesel ?? null);

  const allPrices = [...data95, ...dataDiesel].filter((p): p is number => p !== null);
  const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 1.3;

  const config: ChartConfiguration = {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Gasolina 95",
          data: data95,
          backgroundColor: "#009c27",
          borderColor: "#1cb442",
          borderWidth: 1,
        },
        {
          label: "Diésel",
          data: dataDiesel,
          backgroundColor: "#3f2903",
          borderColor: "#87640d",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: false,
      animation: false as never,
      plugins: {
        legend: {
          labels: {
            color: "#e5e7eb",
            font: { size: 13 },
          },
        },
        title: {
          display: true,
          text: "Precios de combustible — 10km desde Usansolo",
          color: "#f9fafb",
          font: { size: 15, weight: "bold" },
        },
      },
      scales: {
        x: {
          ticks: {
            color: "#d1d5db",
            font: { size: 10 },
            maxRotation: 45,
            minRotation: 30,
          },
          grid: { color: "#374151" },
        },
        y: {
          suggestedMin: minPrice * 0.97,
          ticks: {
            color: "#d1d5db",
            font: { size: 11 },
            callback: (value) => `${Number(value).toFixed(3)} €`,
          },
          grid: { color: "#374151" },
          title: {
            display: true,
            text: "€ / Litro",
            color: "#9ca3af",
          },
        },
      },
    },
  };

  return renderer.renderToBuffer(config) as Promise<Buffer>;
}
