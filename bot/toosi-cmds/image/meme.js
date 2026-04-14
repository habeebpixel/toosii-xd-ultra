'use strict';

const { getBotName } = require('../../lib/botname');

const SUBREDDITS = [
    'memes', 'dankmemes', 'me_irl', 'teenagers', 'funny',
    'AdviceAnimals', 'ProgrammerHumor', 'blackpeopletwitter',
];

async function fetchMeme(subreddit = '') {
    const sub = subreddit || SUBREDDITS[Math.floor(Math.random() * SUBREDDITS.length)];
    const url  = `https://meme-api.com/gimme/${encodeURIComponent(sub)}`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'ToosiiBot/1.0' } });
    if (!res.ok) throw new Error(`Meme API HTTP ${res.status}`);
    const data = await res.json();
    if (!data.url) throw new Error('No meme returned');
    return data;
}

async function imgBuffer(url) {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120' } });
    if (!res.ok) throw new Error(`Image HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
}

module.exports = {
    name: 'meme',
    aliases: ['memes', 'randmeme', 'dankmeme', 'funnymeme'],
    description: 'Get a random meme image — .meme [subreddit]',
    category: 'image',

    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try { await sock.sendMessage(chatId, { react: { text: '😂', key: msg.key } }); } catch {}

        const sub = args[0]?.replace(/^r\//, '') || '';

        try {
            const data = await fetchMeme(sub);
            const buf  = await imgBuffer(data.url);

            const caption = [
                `╔═|〔  MEME 😂 〕`,
                `║`,
                `║ ▸ *Title* : ${(data.title || '').slice(0, 80)}`,
                `║ ▸ *From*  : r/${data.subreddit}`,
                `║ ▸ *Upvotes* : 👍 ${(data.ups || 0).toLocaleString()}`,
                `║`,
                `╚═╝`,
            ].join('\n');

            await sock.sendMessage(chatId, { image: buf, caption }, { quoted: msg });

        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  MEME 〕\n║\n║ ▸ *Status* : ❌ ${e.message}\n║\n╚═╝`
            }, { quoted: msg });
        }
    }
};
