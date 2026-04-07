import { InputFile, type Bot } from "grammy";
import { fetchNearbyStationsAt } from "../services/fuelApi";
import { subscribe, unsubscribe, getSubscribers } from "../services/subscribers";
import { buildCaption } from "../services/format";
import { generateFuelChart } from "../charts/generator";
import { log } from "../services/logger";

const mainKeyboard = {
  keyboard: [[{ text: "📍 Ver precios cerca de mí", request_location: true }]],
  resize_keyboard: true,
  persistent: true,
};

function senderTag(ctx: { from?: { id: number; first_name?: string; last_name?: string; username?: string } }): string {
  const f = ctx.from;
  if (!f) return "unknown";
  const name = [f.first_name, f.last_name].filter(Boolean).join(" ");
  return f.username ? `${name} (@${f.username})` : name || `id:${f.id}`;
}

export function registerCommands(bot: Bot): void {
  bot.command(["start", "subscribe"], async (ctx) => {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    subscribe(chatId);
    log(`[commands] /start chatId=${chatId} user="${senderTag(ctx)}" subscribed`);

    await ctx.reply(
      "✅ *Suscrito correctamente*\n\n" +
        "Recibirás los precios de combustible cada día a las 8:00 AM\\.\n\n" +
        "Pulsa el botón *📍 Ver precios cerca de mí* para consultar las gasolineras más baratas en 10km a tu alrededor\\.\n\n" +
        "⚠️ Si no tienes el GPS activado, puedes compartir tu ubicación manualmente: toca el clip 📎 → *Ubicación* → mueve el pin al lugar que quieras\\.\n\n" +
        "Usa /stop para cancelar la suscripción\\.",
      { parse_mode: "MarkdownV2", reply_markup: mainKeyboard },
    );
  });

  bot.command(["stop", "unsubscribe"], async (ctx) => {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    unsubscribe(chatId);
    log(`[commands] /stop chatId=${chatId} user="${senderTag(ctx)}" unsubscribed`);

    await ctx.reply(
      "❌ *Suscripción cancelada*\n\nYa no recibirás actualizaciones diarias\\. Usa /start para volver a suscribirte\\.",
      { parse_mode: "MarkdownV2", reply_markup: { remove_keyboard: true } },
    );
  });

  bot.command("broadcast", async (ctx) => {
    const ownerId = Number(process.env.BROADCAST_OWNER_ID);
    if (!ownerId || ctx.from?.id !== ownerId) {
      await ctx.reply("⛔ No tienes permiso para usar este comando.");
      return;
    }

    const text = ctx.match?.trim();
    if (!text) {
      await ctx.reply("Uso: /broadcast <mensaje>");
      return;
    }

    const subscribers = getSubscribers();
    const results = await Promise.allSettled(
      subscribers.map((chatId) => bot.api.sendMessage(chatId, text)),
    );

    const ok = results.filter((r) => r.status === "fulfilled").length;
    log(`[commands] /broadcast by ${senderTag(ctx)}: ${ok}/${subscribers.length} sent`);
    await ctx.reply(`✅ Enviado a ${ok} de ${subscribers.length} suscriptores.`);
  });

  bot.on("message:location", async (ctx) => {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const { latitude, longitude } = ctx.message.location;
    log(`[commands] location received chatId=${chatId} user="${senderTag(ctx)}" lat=${latitude} lon=${longitude}`);
    await ctx.replyWithChatAction("upload_photo");

    try {
      const stations = await fetchNearbyStationsAt(latitude, longitude, 10);

      const stations95 = stations
        .filter((s) => s.price95 !== null)
        .sort((a, b) => (a.price95 ?? 0) - (b.price95 ?? 0));

      const stationsDiesel = stations
        .filter((s) => s.priceDiesel !== null)
        .sort((a, b) => (a.priceDiesel ?? 0) - (b.priceDiesel ?? 0));

      if (stations95.length === 0 && stationsDiesel.length === 0) {
        await ctx.reply(
          "📍 No se han encontrado gasolineras en un radio de 10km desde tu ubicación\\.",
          { parse_mode: "MarkdownV2" },
        );
        return;
      }

      const top5_95 = stations95.slice(0, 5);
      const top5_diesel = stationsDiesel.slice(0, 5);
      const top10_95 = stations95.slice(0, 10);
      const top10_diesel = stationsDiesel.slice(0, 10);

      const caption = buildCaption(top5_95, top5_diesel, "tu ubicación");
      const buffer = await generateFuelChart(top10_95, top10_diesel);
      const inputFile = new InputFile(buffer, "precios.png");

      await ctx.replyWithPhoto(inputFile, { caption, parse_mode: "MarkdownV2" });
    } catch (err) {
      log(`[commands] location error: ${err}`);
      await ctx.reply(
        "⚠️ Error al obtener los precios\\. Inténtalo de nuevo más tarde\\.",
        { parse_mode: "MarkdownV2" },
      );
    }
  });
}
