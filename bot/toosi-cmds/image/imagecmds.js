'use strict';

const { dlBuffer } = require('../../lib/keithapi');
const { getBotName } = require('../../lib/botname');

// ── Wallpaper (Unsplash — free, no key, via redirect) ────────────────────────
const wallpaperCmd = {
    name: 'wallpaper',
    aliases: ['wall', 'wp', 'wallpap'],
    description: 'Get an HD wallpaper by keyword from Unsplash',
    category: 'image',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const query  = args.join(' ').trim() || 'nature';
        try {
            await sock.sendMessage(chatId, { react: { text: '🖼️', key: msg.key } });

            // Unsplash source: follows redirect to actual image
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 20000);
            const res = await fetch(
                `https://source.unsplash.com/1920x1080/?${encodeURIComponent(query)}`,
                { signal: controller.signal, redirect: 'follow' }
            );
            clearTimeout(timer);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const ab  = await res.arrayBuffer();
            const buf = Buffer.from(ab);
            if (buf.length < 1000) throw new Error('No image returned');

            const mime = res.headers.get('content-type') || 'image/jpeg';
            await sock.sendMessage(chatId, {
                image: buf,
                mimetype: mime,
                caption: `╔═|〔  🖼️ WALLPAPER 〕\n║\n║ ▸ *Query* : ${query}\n║ ▸ *Size*  : ${(buf.length / 1024).toFixed(0)} KB\n║ ▸ *Via*   : Unsplash\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🖼️ WALLPAPER 〕\n║\n║ ▸ *Usage*  : ${prefix}wallpaper <keyword>\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

module.exports = [wallpaperCmd];
