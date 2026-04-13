'use strict';

const { getBotName } = require('../../lib/botname');
const BASE = 'https://apiskeith.top';

async function keithFetch(path) {
    const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

// ── 1. URL SHORTENER ──────────────────────────────────────────────────────────
const shortenCmd = {
    name: 'shorten',
    aliases: ['short', 'tinyurl', 'bitly'],
    description: 'Shorten a long URL (TinyURL / Bitly)',
    category: 'utility',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try { await sock.sendMessage(chatId, { react: { text: '🔗', key: msg.key } }); } catch {}

        const url = args[0];
        if (!url || !/^https?:\/\//i.test(url)) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  SHORTENER 〕\n║\n║ ▸ *Usage*   : ${prefix}shorten <url>\n║ ▸ *Example* : ${prefix}shorten https://google.com\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        try {
            const provider = (msg.body || '').toLowerCase().includes('bitly') ? 'bitly' : 'tinyurl';
            const data = await keithFetch(`/shortener/${provider}?url=${encodeURIComponent(url)}`);
            const result = data?.result;
            if (!result?.shortened) throw new Error('No shortened URL returned');

            await sock.sendMessage(chatId, {
                text: `╔═|〔  SHORTENER 〕\n║\n║ ▸ *Provider* : ${provider.toUpperCase()}\n║ ▸ *Original* : ${url.slice(0, 60)}${url.length > 60 ? '…' : ''}\n║ ▸ *Short*    : ${result.shortened}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  SHORTENER 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

// ── 2. FANCY TEXT ─────────────────────────────────────────────────────────────
const fancyCmd = {
    name: 'fancy',
    aliases: ['fancytext', 'stylish', 'fantext'],
    description: 'Transform text into a random fancy style',
    category: 'utility',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try { await sock.sendMessage(chatId, { react: { text: '✨', key: msg.key } }); } catch {}

        const ctxQuoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedText = ctxQuoted?.conversation || ctxQuoted?.extendedTextMessage?.text;
        const text = args.join(' ') || quotedText;

        if (!text) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  FANCY TEXT 〕\n║\n║ ▸ *Usage*   : ${prefix}fancy <text>\n║ ▸ *Example* : ${prefix}fancy toosii xd\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        try {
            const data = await keithFetch(`/fancytext/random?q=${encodeURIComponent(text)}`);
            const result = data?.result;
            if (!result) throw new Error('No result returned');

            await sock.sendMessage(chatId, {
                text: `╔═|〔  FANCY TEXT 〕\n║\n║ ▸ *Input*  : ${text}\n║ ▸ *Styled* : ${result}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  FANCY TEXT 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

// ── 3. ON WHATSAPP CHECK ──────────────────────────────────────────────────────
const onwaCmd = {
    name: 'onwa',
    aliases: ['checkwa', 'iswa', 'wacheck'],
    description: 'Check if a number is on WhatsApp',
    category: 'utility',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try { await sock.sendMessage(chatId, { react: { text: '📱', key: msg.key } }); } catch {}

        const raw = args[0]?.replace(/[^0-9]/g, '');
        if (!raw || raw.length < 7) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  WA CHECK 〕\n║\n║ ▸ *Usage*   : ${prefix}onwa <number>\n║ ▸ *Example* : ${prefix}onwa 254712345678\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        let on = null;
        let method = '';

        // ── Primary: Keith API ─────────────────────────────────────────────
        try {
            const data = await keithFetch(`/onwhatsapp?q=${raw}`);
            const r    = data?.result;
            on     = r?.status === true || r?.onWhatsApp === true;
            method = 'API';
        } catch { /* fall through to native */ }

        // ── Fallback: native sock.onWhatsApp() — like .pp uses sock.profilePictureUrl() ──
        if (on === null) {
            try {
                const jid     = raw.includes('@') ? raw : `${raw}@s.whatsapp.net`;
                const results = await sock.onWhatsApp(jid);
                on     = results?.[0]?.exists === true;
                method = 'Native';
            } catch { on = null; }
        }

        if (on === null) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  WA CHECK 〕\n║\n║ ▸ *Number* : +${raw}\n║ ▸ *Status* : ⚠️ Could not determine\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        await sock.sendMessage(chatId, {
            text: `╔═|〔  WA CHECK 〕\n║\n║ ▸ *Number* : +${raw}\n║ ▸ *Status* : ${on ? '✅ On WhatsApp' : '❌ Not on WhatsApp'}\n║ ▸ *Method* : ${method}\n║\n╚═|〔 ${name} 〕`
        }, { quoted: msg });
    }
};

// ── 4. ASCII ART ──────────────────────────────────────────────────────────────
const asciiCmd = {
    name: 'ascii',
    aliases: ['asciiart', 'art'],
    description: 'Generate ASCII art for a keyword',
    category: 'utility',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try { await sock.sendMessage(chatId, { react: { text: '🎨', key: msg.key } }); } catch {}

        const q = args.join(' ').trim();
        if (!q) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  ASCII ART 〕\n║\n║ ▸ *Usage*   : ${prefix}ascii <keyword>\n║ ▸ *Example* : ${prefix}ascii dragon\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        try {
            const data = await keithFetch(`/tools/ascii?q=${encodeURIComponent(q)}`);
            const arts  = data?.result?.arts;
            if (!arts?.length) throw new Error('No art found');

            const pick = arts[Math.floor(Math.random() * Math.min(arts.length, 10))];

            await sock.sendMessage(chatId, {
                text: `╔═|〔  ASCII ART — ${q.toUpperCase()} 〕\n║\n${pick}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  ASCII ART 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

// ── 5. WHATSAPP LINK CREATOR ──────────────────────────────────────────────────
const walinkCmd = {
    name: 'walink',
    aliases: ['wlink', 'waurl', 'wame'],
    description: 'Create a WhatsApp chat link for a number + message',
    category: 'utility',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try { await sock.sendMessage(chatId, { react: { text: '📎', key: msg.key } }); } catch {}

        const raw = args[0]?.replace(/[^0-9]/g, '');
        const text = args.slice(1).join(' ') || 'Hello';

        if (!raw || raw.length < 7) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  WA LINK 〕\n║\n║ ▸ *Usage*   : ${prefix}walink <number> [message]\n║ ▸ *Example* : ${prefix}walink 254712345678 Hi there\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        try {
            const data = await keithFetch(`/tools/walink?q=${encodeURIComponent(text)}&number=${raw}`);
            const link  = data?.result?.shortUrl || data?.result?.url;
            if (!link) throw new Error('No link returned');

            await sock.sendMessage(chatId, {
                text: `╔═|〔  WA LINK 〕\n║\n║ ▸ *Number*  : +${raw}\n║ ▸ *Message* : ${text}\n║ ▸ *Link*    : ${link}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  WA LINK 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

// ── 6. IP LOOKUP ──────────────────────────────────────────────────────────────
const ipCmd = {
    name: 'ip',
    aliases: ['iplookup', 'ipinfo', 'geoip'],
    description: 'Look up details of an IP address',
    category: 'utility',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try { await sock.sendMessage(chatId, { react: { text: '🌍', key: msg.key } }); } catch {}

        const q = args[0]?.trim();
        if (!q) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  IP LOOKUP 〕\n║\n║ ▸ *Usage*   : ${prefix}ip <address>\n║ ▸ *Example* : ${prefix}ip 8.8.8.8\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        try {
            const data = await keithFetch(`/ip/lookup?q=${encodeURIComponent(q)}`);
            const r    = data?.result;
            if (!r || !r.ip) throw new Error('No data returned');

            const lines = [
                `╔═|〔  IP LOOKUP 〕`,
                `║`,
                `║ ▸ *IP*       : ${r.ip}`,
                r.hostname   ? `║ ▸ *Hostname* : ${r.hostname}`   : null,
                r.city       ? `║ ▸ *City*     : ${r.city}`       : null,
                r.region     ? `║ ▸ *Region*   : ${r.region}`     : null,
                r.country    ? `║ ▸ *Country*  : ${r.country}`    : null,
                r.org        ? `║ ▸ *ISP*      : ${r.org}`        : null,
                r.timezone   ? `║ ▸ *Timezone* : ${r.timezone}`   : null,
                r.loc        ? `║ ▸ *Coords*   : ${r.loc}`        : null,
                `║`,
                `╚═|〔 ${name} 〕`,
            ].filter(Boolean).join('\n');

            await sock.sendMessage(chatId, { text: lines }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  IP LOOKUP 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

// ── 7. JS CODE ENCRYPTOR ──────────────────────────────────────────────────────
const encryptCmd = {
    name: 'encrypt',
    aliases: ['jsencrypt', 'obfuscate', 'jsenc'],
    description: 'Encrypt / obfuscate JavaScript code',
    category: 'utility',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try { await sock.sendMessage(chatId, { react: { text: '🔒', key: msg.key } }); } catch {}

        const ctxQuoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedText = ctxQuoted?.conversation || ctxQuoted?.extendedTextMessage?.text;
        const code = args.join(' ') || quotedText;

        if (!code) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  JS ENCRYPT 〕\n║\n║ ▸ *Usage*   : ${prefix}encrypt <js code>\n║            OR reply JS code with\n║            ${prefix}encrypt\n║ ▸ *Example* : ${prefix}encrypt console.log('hello')\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        try {
            const data = await keithFetch(`/tools/encrypt?q=${encodeURIComponent(code)}`);
            const r    = data?.result;
            const out  = r?.encrypted || r?.result || r;
            if (!out) throw new Error('No output returned');

            const outStr = typeof out === 'string' ? out : JSON.stringify(out);

            await sock.sendMessage(chatId, {
                text: `╔═|〔  JS ENCRYPT 〕\n║\n║ ▸ *Method* : Preemptive\n║ ▸ *Input*  : ${code.slice(0, 50)}${code.length > 50 ? '…' : ''}\n║\n${outStr.slice(0, 3000)}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  JS ENCRYPT 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

module.exports = [
    shortenCmd,
    fancyCmd,
    onwaCmd,
    asciiCmd,
    walinkCmd,
    ipCmd,
    encryptCmd,
];
