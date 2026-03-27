import cron from "node-cron";
import { InputFile, type Bot } from "grammy";
import { getSubscribers } from "../services/subscribers";
import { fetchNearbyStations } from "../services/fuelApi";
import { buildCaption } from "../services/format";
import { generateFuelChart } from "../charts/generator";

export function startScheduler(bot: Bot): void {
  cron.schedule(
    "0 8 * * *",
    async () => {
      const subscribers = getSubscribers();
      if (subscribers.length === 0) {
        console.log("[scheduler] No subscribers, skipping broadcast.");
        return;
      }

      console.log(`[scheduler] Broadcasting to ${subscribers.length} subscriber(s)...`);

      let stations;
      try {
        stations = await fetchNearbyStations(10);
      } catch (err) {
        console.error("[scheduler] Failed to fetch stations:", err);
        return;
      }

      const stations95 = stations
        .filter((s) => s.price95 !== null)
        .sort((a, b) => (a.price95 ?? 0) - (b.price95 ?? 0));

      const stationsDiesel = stations
        .filter((s) => s.priceDiesel !== null)
        .sort((a, b) => (a.priceDiesel ?? 0) - (b.priceDiesel ?? 0));

      let buffer: Buffer;
      let caption: string;
      try {
        buffer = await generateFuelChart(stations95.slice(0, 10), stationsDiesel.slice(0, 10));
        caption = buildCaption(stations95.slice(0, 5), stationsDiesel.slice(0, 5));
      } catch (err) {
        console.error("[scheduler] Failed to generate chart/caption:", err);
        return;
      }

      const results = await Promise.allSettled(
        subscribers.map((chatId) =>
          bot.api.sendPhoto(chatId, new InputFile(buffer, "precios.png"), {
            caption,
            parse_mode: "MarkdownV2",
          }),
        ),
      );

      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected");
      console.log(`[scheduler] Done: ${succeeded} sent, ${failed.length} failed`);

      for (const f of failed) {
        if (f.status === "rejected") {
          console.error("[scheduler] Send failed:", f.reason);
        }
      }
    },
    { timezone: "Europe/Madrid" },
  );

  console.log("[scheduler] Cron scheduled: daily at 08:00 Europe/Madrid");
}
