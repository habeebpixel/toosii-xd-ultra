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
    name: 'toimg',
    aliases: ['toimage', 'unsticker', 'stktoimg'],
    description: 'Convert a sticker back to an image',
    category: 'utility',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();

        try { await sock.sendMessage(chatId, { react: { text: '🖼️', key: msg.key } }); } catch {}

        const ctxInfo = msg.message?.extendedTextMessage?.contextInfo;
        const quoted  = ctxInfo?.quotedMessage;

        if (!quoted?.stickerMessage) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  TO IMAGE 〕\n║\n║ ▸ *Usage* : Reply to a sticker\n║            with *${prefix}toimg*\n║\n╚═╝`
            }, { quoted: msg });
        }

        const syntheticMsg = {
            key: { remoteJid: chatId, id: ctxInfo.stanzaId, participant: ctxInfo.participant, fromMe: false },
            message: quoted
        };

        const buf = await downloadMediaMessage(syntheticMsg, 'buffer', {});
        if (!buf || buf.length === 0) throw new Error('Could not download sticker');

        const tmpIn  = path.join(os.tmpdir(), `toimg_in_${Date.now()}.webp`);
        const tmpOut = path.join(os.tmpdir(), `toimg_out_${Date.now()}.png`);

        try {
            fs.writeFileSync(tmpIn, buf);
            await execFileAsync('ffmpeg', ['-y', '-i', tmpIn, tmpOut], { timeout: 15000 });
            const pngBuf = fs.readFileSync(tmpOut);

            await sock.sendMessage(chatId, {
                image: pngBuf,
                caption: `╔═|〔  TO IMAGE 〕\n║\n║ ▸ *Status* : ✅ Converted\n║\n╚═╝`
            }, { quoted: msg });
        } finally {
            try { fs.unlinkSync(tmpIn); } catch {}
            try { fs.unlinkSync(tmpOut); } catch {}
        }
    }
};
