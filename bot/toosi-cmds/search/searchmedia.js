'use strict';

const { dlBuffer } = require('../../lib/keithapi');
const { getBotName } = require('../../lib/botname');

// ── Image Search (Unsplash source — free, no key) ─────────────────────────────
// Returns a random Unsplash image matching the query
const imgCmd = {
    name: 'img',
    aliases: ['image', 'imgsearch', 'images', 'pic'],
    description: 'Search for an image by keyword',
    category: 'search',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const query  = args.join(' ').trim();
        if (!query) return sock.sendMessage(chatId, {
            text: `╔═|〔  🖼️ IMAGE SEARCH 〕\n║\n║ ▸ *Usage* : ${prefix}img <query>\n║ ▸ *Example* : ${prefix}img sunset ocean\n║\n╚═|〔 ${name} 〕`
        }, { quoted: msg });

        try {
            await sock.sendMessage(chatId, { react: { text: '🖼️', key: msg.key } });
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 20000);
            const res = await fetch(
                `https://source.unsplash.com/featured/?${encodeURIComponent(query)},${Date.now()}`,
                { signal: controller.signal, redirect: 'follow' }
            );
            clearTimeout(timer);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const ab  = await res.arrayBuffer();
            const buf = Buffer.from(ab);
            if (buf.length < 1000) throw new Error('No image returned');

            await sock.sendMessage(chatId, {
                image: buf,
                caption: `╔═|〔  🖼️ IMAGE SEARCH 〕\n║\n║ ▸ *Query* : ${query}\n║ ▸ *Via*   : Unsplash\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🖼️ IMAGE SEARCH 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

module.exports = [imgCmd];
