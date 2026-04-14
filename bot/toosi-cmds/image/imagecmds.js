'use strict';

const { dlBuffer } = require('../../lib/keithapi');
const { getBotName } = require('../../lib/botname');

async function fetchImg(url, timeout = 20000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
        const res = await fetch(url, { signal: controller.signal, redirect: 'follow', headers: { 'User-Agent': 'ToosiiBot/1.0' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res;
    } finally { clearTimeout(timer); }
}

async function fetchJson(url, timeout = 12000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
        const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'ToosiiBot/1.0' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    } finally { clearTimeout(timer); }
}

// ── Wallpaper (LoremFlickr — free, keyword-aware) ─────────────────────────────
const wallpaperCmd = {
    name: 'wallpaper',
    aliases: ['wall', 'wp', 'wallpap'],
    description: 'Get an HD wallpaper by keyword — .wallpaper <keyword>',
    category: 'image',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const query  = args.join(' ').trim() || 'nature';
        try {
            await sock.sendMessage(chatId, { react: { text: '🖼️', key: msg.key } });
            const lock = Math.floor(Math.random() * 1000000);
            const res  = await fetchImg(`https://loremflickr.com/1920/1080/${encodeURIComponent(query)}?lock=${lock}`);
            const buf  = Buffer.from(await res.arrayBuffer());
            if (buf.length < 5000) throw new Error('No image returned');
            await sock.sendMessage(chatId, {
                image: buf, mimetype: 'image/jpeg',
                caption: `╔═|〔  🖼️ WALLPAPER 〕\n║\n║ ▸ *Query* : ${query}\n║ ▸ *Size*  : ${(buf.length / 1024).toFixed(0)} KB\n║\n╚═╝`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🖼️ WALLPAPER 〕\n║\n║ ▸ *Usage*  : ${prefix}wallpaper <keyword>\n║ ▸ *Status* : ❌ Failed — ${e.message}\n║\n╚═╝`
            }, { quoted: msg });
        }
    }
};

// ── Cat photo (TheCatAPI — free, no key for basics) ───────────────────────────
const catCmd = {
    name: 'cat',
    aliases: ['catpic', 'kitty', 'catphoto', 'meow'],
    description: 'Get a random cute cat photo',
    category: 'image',
    async execute(sock, msg) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try {
            await sock.sendMessage(chatId, { react: { text: '🐱', key: msg.key } });
            // cataas.com — cat as a service, direct image
            const buf = await dlBuffer(`https://cataas.com/cat?${Date.now()}`);
            if (!buf || buf.length < 3000) throw new Error('No cat today 😿');
            await sock.sendMessage(chatId, {
                image: buf, mimetype: 'image/jpeg',
                caption: `╔═|〔  🐱 CAT PHOTO 〕\n║\n║ ▸ *Meow!* Here's your random cat 😻\n║\n╚═╝`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🐱 CAT PHOTO 〕\n║\n║ ▸ *Status* : ❌ ${e.message}\n║\n╚═╝`
            }, { quoted: msg });
        }
    }
};

// ── Dog photo (random.dog — free, no key) ─────────────────────────────────────
const dogCmd = {
    name: 'dog',
    aliases: ['dogpic', 'dogphoto', 'puppy', 'woof'],
    description: 'Get a random cute dog photo',
    category: 'image',
    async execute(sock, msg) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try {
            await sock.sendMessage(chatId, { react: { text: '🐶', key: msg.key } });
            // Try dog.ceo first (reliable)
            const data = await fetchJson('https://dog.ceo/api/breeds/image/random');
            if (!data?.message) throw new Error('No dog found');
            const imgUrl = data.message;
            const ext    = imgUrl.split('.').pop().toLowerCase();
            // Skip gifs and videos
            if (['mp4','webm'].includes(ext)) throw new Error('Got video, retrying...');
            const buf  = await dlBuffer(imgUrl);
            const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
            await sock.sendMessage(chatId, {
                image: buf, mimetype: mime,
                caption: `╔═|〔  🐶 DOG PHOTO 〕\n║\n║ ▸ *Woof!* Here's your random dog 🐾\n║\n╚═╝`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🐶 DOG PHOTO 〕\n║\n║ ▸ *Status* : ❌ ${e.message}\n║\n╚═╝`
            }, { quoted: msg });
        }
    }
};

// ── Fox photo (randomfox.ca — free, no key) ───────────────────────────────────
const foxCmd = {
    name: 'fox',
    aliases: ['foxpic', 'foxphoto', 'foxy'],
    description: 'Get a random fox photo',
    category: 'image',
    async execute(sock, msg) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try {
            await sock.sendMessage(chatId, { react: { text: '🦊', key: msg.key } });
            const data = await fetchJson('https://randomfox.ca/floof/');
            if (!data?.image) throw new Error('No fox found');
            const buf  = await dlBuffer(data.image);
            await sock.sendMessage(chatId, {
                image: buf, mimetype: 'image/jpeg',
                caption: `╔═|〔  🦊 FOX PHOTO 〕\n║\n║ ▸ *Yip!* Here's your random fox 🦊\n║\n╚═╝`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🦊 FOX PHOTO 〕\n║\n║ ▸ *Status* : ❌ ${e.message}\n║\n╚═╝`
            }, { quoted: msg });
        }
    }
};

module.exports = [wallpaperCmd, catCmd, dogCmd, foxCmd];
