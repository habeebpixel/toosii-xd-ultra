'use strict';

const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { getBotName } = require('../../lib/botname');
const { execFile }   = require('child_process');
const { promisify }  = require('util');
const fs             = require('fs');
const os             = require('os');
const path           = require('path');

const execFileAsync = promisify(execFile);

module.exports = {
    name: 'sticker',
    aliases: ['s', 'stiker', 'stick'],
    description: 'Convert an image or video clip to a WhatsApp sticker',
    category: 'utility',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();

        try { await sock.sendMessage(chatId, { react: { text: '🎨', key: msg.key } }); } catch {}

        // ── Find quoted media ─────────────────────────────────────────────
        const ctxInfo  = msg.message?.extendedTextMessage?.contextInfo;
        const quoted   = ctxInfo?.quotedMessage;

        const hasImg = quoted?.imageMessage;
        const hasVid = quoted?.videoMessage;
        const hasStk = quoted?.stickerMessage;

        if (!quoted || (!hasImg && !hasVid && !hasStk)) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  STICKER 〕\n║\n║ ▸ *Usage* : Reply to an image or\n║            short video with *${prefix}s*\n║\n╚═╝`
            }, { quoted: msg });
        }

        // ── Download the media ────────────────────────────────────────────
        const syntheticMsg = {
            key: { remoteJid: chatId, id: ctxInfo.stanzaId, participant: ctxInfo.participant, fromMe: false },
            message: quoted
        };

        const buf = await downloadMediaMessage(syntheticMsg, 'buffer', {});
        if (!buf || buf.length === 0) throw new Error('Could not download media');

        // ── Decide input extension ────────────────────────────────────────
        const isVideo = !!(hasVid || hasStk?.isAnimated);
        const inExt   = isVideo ? 'mp4' : 'jpg';
        const tmpIn   = path.join(os.tmpdir(), `stkr_in_${Date.now()}.${inExt}`);
        const tmpOut  = path.join(os.tmpdir(), `stkr_out_${Date.now()}.webp`);

        try {
            fs.writeFileSync(tmpIn, buf);

            // ── Convert with ffmpeg ───────────────────────────────────────
            const ffArgs = isVideo
                ? ['-y', '-i', tmpIn, '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2,fps=15', '-t', '10', '-loop', '0', '-preset', 'default', '-an', '-vsync', '0', tmpOut]
                : ['-y', '-i', tmpIn, '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2', tmpOut];

            await execFileAsync('ffmpeg', ffArgs, { timeout: 30000 });

            const webpBuf = fs.readFileSync(tmpOut);
            await sock.sendMessage(chatId, { sticker: webpBuf }, { quoted: msg });

        } finally {
            try { fs.unlinkSync(tmpIn); } catch {}
            try { fs.unlinkSync(tmpOut); } catch {}
        }
    }
};
