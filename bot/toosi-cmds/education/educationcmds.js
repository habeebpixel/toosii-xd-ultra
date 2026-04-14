'use strict';

const { getBotName } = require('../../lib/botname');

function box(title, icon, content) {
    const name = getBotName();
    return `╔═|〔  ${icon} ${title} 〕\n║\n${content}\n║\n╚═╝`;
}

async function apiFetch(url, timeoutMs = 12000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'ToosiiBot/1.0' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    } finally { clearTimeout(timer); }
}

// ── 1. DICTIONARY (dictionaryapi.dev — free, no key) ─────────────────────────
const dictCmd = {
    name: 'dict',
    aliases: ['dictionary', 'define', 'meaning'],
    description: 'Get the definition of a word',
    category: 'education',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try { await sock.sendMessage(chatId, { react: { text: '📖', key: msg.key } }); } catch {}

        const word = args[0]?.toLowerCase().trim();
        if (!word) return sock.sendMessage(chatId, {
            text: `╔═|〔  DICTIONARY 〕\n║\n║ ▸ *Usage*   : ${prefix}dict <word>\n║ ▸ *Example* : ${prefix}dict serendipity\n║\n╚═╝`
        }, { quoted: msg });

        try {
            const data = await apiFetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
            const entry = Array.isArray(data) ? data[0] : data;
            if (!entry?.word) throw new Error('Word not found');

            const phonetic = entry.phonetic || entry.phonetics?.find(p => p.text)?.text || '';
            const meanings = entry.meanings || [];
            let out = `║ ▸ *Word*  : ${entry.word}${phonetic ? `  _${phonetic}_` : ''}\n║`;

            for (const m of meanings.slice(0, 3)) {
                out += `\n║ ▸ *${m.partOfSpeech}*`;
                for (const d of (m.definitions || []).slice(0, 2)) {
                    out += `\n║   • ${d.definition}`;
                    if (d.example) out += `\n║     _"${d.example}"_`;
                }
                out += `\n║`;
            }

            await sock.sendMessage(chatId, {
                text: `╔═|〔  DICTIONARY 〕\n║\n${out}\n╚═╝`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  DICTIONARY 〕\n║\n║ ▸ *Status* : ❌ Not found\n║ ▸ *Word*   : ${word}\n║\n╚═╝`
            }, { quoted: msg });
        }
    }
};

// ── 2. FRUIT INFO (fruityvice.com — free, no key) ────────────────────────────
const fruitCmd = {
    name: 'fruit',
    aliases: ['fruitinfo', 'fruity'],
    description: 'Get nutritional info about a fruit',
    category: 'education',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try { await sock.sendMessage(chatId, { react: { text: '🍎', key: msg.key } }); } catch {}

        const q = args.join(' ').trim();
        if (!q) return sock.sendMessage(chatId, {
            text: `╔═|〔  FRUIT INFO 〕\n║\n║ ▸ *Usage*   : ${prefix}fruit <name>\n║ ▸ *Example* : ${prefix}fruit mango\n║\n╚═╝`
        }, { quoted: msg });

        try {
            const r = await apiFetch(`https://www.fruityvice.com/api/fruit/${encodeURIComponent(q.toLowerCase())}`);
            if (!r?.name) throw new Error('Fruit not found');

            const nut = r.nutritions || {};
            const lines = [
                `║ ▸ *Name*    : ${r.name}`,
                r.family   ? `║ ▸ *Family*  : ${r.family}`  : null,
                r.genus    ? `║ ▸ *Genus*   : ${r.genus}`   : null,
                r.order    ? `║ ▸ *Order*   : ${r.order}`   : null,
                `║`,
                `║ 📊 *Nutritions (per 100g)*`,
                nut.calories       !== undefined ? `║   • Calories  : ${nut.calories} kcal`      : null,
                nut.carbohydrates  !== undefined ? `║   • Carbs     : ${nut.carbohydrates}g`     : null,
                nut.protein        !== undefined ? `║   • Protein   : ${nut.protein}g`           : null,
                nut.fat            !== undefined ? `║   • Fat       : ${nut.fat}g`               : null,
                nut.sugar          !== undefined ? `║   • Sugar     : ${nut.sugar}g`             : null,
                nut.fiber          !== undefined ? `║   • Fiber     : ${nut.fiber}g`             : null,
            ].filter(Boolean).join('\n');

            await sock.sendMessage(chatId, {
                text: `╔═|〔  FRUIT INFO 〕\n║\n${lines}\n║\n╚═╝`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  FRUIT INFO 〕\n║\n║ ▸ *Status* : ❌ Not found\n║ ▸ *Fruit*  : ${q}\n║\n╚═╝`
            }, { quoted: msg });
        }
    }
};

// ── 3. RANDOM POEM (poetrydb.org — free, no key) ─────────────────────────────
const poemCmd = {
    name: 'poem',
    aliases: ['poetry', 'randompoem'],
    description: 'Get a random classic poem',
    category: 'education',
    async execute(sock, msg) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try { await sock.sendMessage(chatId, { react: { text: '📜', key: msg.key } }); } catch {}

        try {
            const data = await apiFetch('https://poetrydb.org/random/1');
            const r    = Array.isArray(data) ? data[0] : data;
            if (!r?.title) throw new Error('No poem returned');

            const lines = (r.lines || []).join('\n');
            await sock.sendMessage(chatId, {
                text: `╔═|〔  POEM 〕\n║\n║ ▸ *Title*  : ${r.title}\n║ ▸ *Author* : ${r.author || 'Unknown'}\n║\n${lines.slice(0, 1500)}\n║\n╚═╝`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  POEM 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═╝`
            }, { quoted: msg });
        }
    }
};

// ── 4. CURRENCY EXCHANGE (open.er-api.com — free, no key) ────────────────────
const currencyCmd = {
    name: 'currency',
    aliases: ['exchange', 'rate', 'forex'],
    description: 'Get USD exchange rate for any currency code',
    category: 'education',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try { await sock.sendMessage(chatId, { react: { text: '💱', key: msg.key } }); } catch {}

        const code = (args[0] || '').toUpperCase().trim();
        if (!code || code.length < 2) return sock.sendMessage(chatId, {
            text: `╔═|〔  CURRENCY 〕\n║\n║ ▸ *Usage*   : ${prefix}currency <code>\n║ ▸ *Example* : ${prefix}currency KES\n║ ▸ *Note*    : Base is always USD\n║\n╚═╝`
        }, { quoted: msg });

        try {
            const data = await apiFetch('https://open.er-api.com/v6/latest/USD');
            if (data.result !== 'success') throw new Error('Exchange data unavailable');
            const rate = data.rates?.[code];
            if (!rate) throw new Error(`Currency code "${code}" not found`);

            await sock.sendMessage(chatId, {
                text: `╔═|〔  CURRENCY 〕\n║\n║ ▸ *Base*   : 1 USD\n║ ▸ *Target* : ${code}\n║ ▸ *Rate*   : ${rate}\n║ ▸ *Date*   : ${data.time_last_update_utc?.split(' 00:')[0] || 'Today'}\n║\n╚═╝`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  CURRENCY 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Code*   : ${code}\n║ ▸ *Reason* : ${e.message}\n║\n╚═╝`
            }, { quoted: msg });
        }
    }
};

module.exports = [dictCmd, fruitCmd, poemCmd, currencyCmd];
