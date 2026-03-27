import { InputFile, type Bot } from "grammy";
import { fetchNearbyStations } from "../services/fuelApi";
import { subscribe, unsubscribe } from "../services/subscribers";
import { buildCaption } from "../services/format";
import { generateFuelChart } from "../charts/generator";
import { log } from "../services/logger";

async function sendFuelPrices(
  bot: Bot,
  chatId: number,
  replyFn?: (caption: string, inputFile: InputFile) => Promise<unknown>,
): Promise<void> {
  const stations = await fetchNearbyStations(10);

  const stations95 = stations
    .filter((s) => s.price95 !== null)
    .sort((a, b) => (a.price95 ?? 0) - (b.price95 ?? 0));

  const stationsDiesel = stations
    .filter((s) => s.priceDiesel !== null)
    .sort((a, b) => (a.priceDiesel ?? 0) - (b.priceDiesel ?? 0));

  const top5_95 = stations95.slice(0, 5);
  const top5_diesel = stationsDiesel.slice(0, 5);
  const top10_95 = stations95.slice(0, 10);
  const top10_diesel = stationsDiesel.slice(0, 10);

  const caption = buildCaption(top5_95, top5_diesel);
  const buffer = await generateFuelChart(top10_95, top10_diesel);
  const inputFile = new InputFile(buffer, "precios.png");

  if (replyFn) {
    await replyFn(caption, inputFile);
  } else {
    await bot.api.sendPhoto(chatId, inputFile, {
      caption,
      parse_mode: "MarkdownV2",
    });
  }
}

export function registerCommands(bot: Bot): void {
  bot.command(["start", "subscribe"], async (ctx) => {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    subscribe(chatId);
    log(`[commands] /start chatId=${chatId} subscribed`);

    await ctx.reply(
      "✅ *Suscrito correctamente*\n\n" +
        "Recibirás los precios de combustible cada día a las 8:00 AM\\.\n\n" +
        "*Comandos disponibles:*\n" +
        "• /precios — Consultar precios ahora\n" +
        "• /stop — Cancelar suscripción\n",
      { parse_mode: "MarkdownV2" },
    );
  });

  bot.command(["stop", "unsubscribe"], async (ctx) => {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    unsubscribe(chatId);
    log(`[commands] /stop chatId=${chatId} unsubscribed`);

    await ctx.reply(
      "❌ *Suscripción cancelada*\n\nYa no recibirás actualizaciones diarias\\. Usa /start para volver a suscribirte\\.",
      { parse_mode: "MarkdownV2" },
    );
  });

  bot.command("precios", async (ctx) => {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    log(`[commands] /precios requested by chatId=${chatId}`);
    await ctx.replyWithChatAction("upload_photo");

    try {
      await sendFuelPrices(bot, chatId, async (caption, inputFile) => {
        await ctx.replyWithPhoto(inputFile, {
          caption,
          parse_mode: "MarkdownV2",
        });
      });
    } catch (err) {
      log(`[commands] /precios error: ${err}`);
      await ctx.reply(
        "⚠️ Error al obtener los precios\\. Inténtalo de nuevo más tarde\\.",
        { parse_mode: "MarkdownV2" },
      );
    }
  });
}

export { sendFuelPrices };
