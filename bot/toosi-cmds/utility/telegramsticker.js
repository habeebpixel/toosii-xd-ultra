'use strict';

const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { getBotName }           = require('../../lib/botname');
const { execFile }             = require('child_process');
const { promisify }            = require('util');
const sharp                    = require('sharp');
const fs                       = require('fs');
const os                       = require('os');
const path                     = require('path');

const execFileAsync = promisify(execFile);

// ── Telegram Bot API helpers (only used when TOKEN is set) ───────────────────
function tgBotToken() {
    return process.env.TELEGRAM_BOT_TOKEN || '';
}

async function tgApiGet(method, params = {}) {
    const token = tgBotToken();
    if (!token) throw new Error('TELEGRAM_BOT_TOKEN not set');
    const qs  = new URLSearchParams(params).toString();
    const url = `https://api.telegram.org/bot${token}/${method}${qs ? '?' + qs : ''}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    const j   = await res.json();
    if (!j.ok) throw new Error(j.description || 'Telegram API error');
    return j.result;
}

async function tgFileUrl(fileId) {
    const info  = await tgApiGet('getFile', { file_id: fileId });
    const token = tgBotToken();
    return `https://api.telegram.org/file/bot${token}/${info.file_path}`;
}

async function downloadUrl(url) {
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
}

// ── Convert any media buffer → 512×512 WebP sticker ─────────────────────────
async function toStickerWebp(buf, isAnimated = false) {
    const tmpDir = os.tmpdir();
    const ts     = Date.now();

    if (isAnimated) {
        // Animated TGS (gzip-compressed Lottie JSON) → animated WebP via ffmpeg
        const tmpIn  = path.join(tmpDir, `tgstk_${ts}.tgs`);
        const tmpOut = path.join(tmpDir, `tgstk_${ts}.webp`);
        try {
            fs.writeFileSync(tmpIn, buf);
            await execFileAsync('ffmpeg', [
                '-y', '-i', tmpIn,
                '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2,fps=15',
                '-t', '10', '-loop', '0', '-preset', 'default', '-an', '-vsync', '0',
                tmpOut
            ], { timeout: 30000 });
            return fs.readFileSync(tmpOut);
        } finally {
            try { fs.unlinkSync(tmpIn); } catch {}
            try { fs.unlinkSync(tmpOut); } catch {}
        }
    }

    // Static image / WebP → resize to 512×512 via sharp
    return sharp(buf)
        .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ lossless: true })
        .toBuffer();
}

// ── Parse pack name from link or raw text ────────────────────────────────────
function parsePack(input) {
    const m = input.match(/(?:t\.me\/addstickers\/|tg:\/\/addstickers\?set=)([A-Za-z0-9_]+)/);
    return m ? m[1] : input.trim();
}

module.exports = {
    name:        'telegramsticker',
    aliases:     ['tgsticker', 'tgstk', 'telestk', 'tsticker'],
    description: 'Convert a Telegram sticker to WhatsApp — reply to a .webp doc or use .telegramsticker <pack>',
    category:    'utility',

    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const input  = args.join(' ').trim();

        try { await sock.sendMessage(chatId, { react: { text: '🎭', key: msg.key } }); } catch {}

        // ── Mode A: Pack URL / name provided ─────────────────────────────
        if (input) {
            const token = tgBotToken();
            if (!token) {
                return sock.sendMessage(chatId, {
                    text: [
                        `╔═|〔  🎭 TELEGRAM STICKER 〕`, `║`,
                        `║ ▸ Pack downloads need a Telegram bot token.`,
                        `║ ▸ Ask owner to set *TELEGRAM_BOT_TOKEN* env var.`,
                        `║`,
                        `║ 💡 *Alternative*: Forward a Telegram sticker`,
                        `║    as a document then reply with *${prefix}telegramsticker*`,
                        `║`,
                        `╚═|〔 ${name} 〕`,
                    ].join('\n')
                }, { quoted: msg });
            }

            const packName = parsePack(input);
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🎭 TELEGRAM STICKER 〕\n║\n║ ⏳ Fetching pack *${packName}*...\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });

            try {
                const pack     = await tgApiGet('getStickerSet', { name: packName });
                const stickers = pack.stickers || [];
                if (!stickers.length) throw new Error('Sticker pack is empty');

                await sock.sendMessage(chatId, {
                    text: `╔═|〔  🎭 TELEGRAM STICKER 〕\n║\n║ ▸ *Pack*  : ${pack.title}\n║ ▸ *Count* : ${stickers.length} stickers\n║ ▸ Sending first 5...\n║\n╚═|〔 ${name} 〕`
                }, { quoted: msg });

                const toSend = stickers.slice(0, 5);
                for (const stk of toSend) {
                    try {
                        const fileUrl  = await tgFileUrl(stk.file_id);
                        const buf      = await downloadUrl(fileUrl);
                        const webpBuf  = await toStickerWebp(buf, stk.is_animated || false);
                        await sock.sendMessage(chatId, { sticker: webpBuf }, { quoted: msg });
                        await new Promise(r => setTimeout(r, 800));
                    } catch { }
                }

            } catch (e) {
                await sock.sendMessage(chatId, {
                    text: `╔═|〔  🎭 TELEGRAM STICKER 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
                }, { quoted: msg });
            }
            return;
        }

        // ── Mode B: Reply to a forwarded Telegram sticker / .webp doc ────
        const ctxInfo = msg.message?.extendedTextMessage?.contextInfo;
        const quoted  = ctxInfo?.quotedMessage;

        const hasDoc = quoted?.documentMessage;
        const hasImg = quoted?.imageMessage;
        const hasStk = quoted?.stickerMessage;
        const hasVid = quoted?.videoMessage;

        if (!quoted || (!hasDoc && !hasImg && !hasStk && !hasVid)) {
            return sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  🎭 TELEGRAM STICKER 〕`, `║`,
                    `║ *Two ways to use this:*`, `║`,
                    `║ 1️⃣  Reply to a Telegram sticker forwarded`,
                    `║      as a .webp file/document`,
                    `║`,
                    `║ 2️⃣  ${prefix}telegramsticker <pack name or t.me link>`,
                    `║      (requires TELEGRAM_BOT_TOKEN to be set)`,
                    `║`,
                    `║ 💡 Example: ${prefix}telegramsticker Animals`,
                    `║`,
                    `╚═|〔 ${name} 〕`,
                ].join('\n')
            }, { quoted: msg });
        }

        try {
            const syntheticMsg = {
                key: { remoteJid: chatId, id: ctxInfo.stanzaId, participant: ctxInfo.participant, fromMe: false },
                message: quoted,
            };

            const buf = await downloadMediaMessage(syntheticMsg, 'buffer', {});
            if (!buf || buf.length === 0) throw new Error('Could not download media');

            const mime      = hasDoc?.mimetype || hasImg?.mimetype || hasStk?.mimetype || '';
            const isAnimated = mime.includes('tgs') || (hasStk?.isAnimated) || mime.includes('video');

            const webpBuf = await toStickerWebp(buf, isAnimated);
            await sock.sendMessage(chatId, { sticker: webpBuf }, { quoted: msg });

        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🎭 TELEGRAM STICKER 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};
