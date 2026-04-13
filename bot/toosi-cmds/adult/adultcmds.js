'use strict';

const { getBotName } = require('../../lib/botname');
const BASE = 'https://apiskeith.top';

async function kFetch(path) {
    const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

// ── 1. XVIDEOS SEARCH ─────────────────────────────────────────────────────────
const xvideosSearchCmd = {
    name: 'xvideossearch',
    aliases: ['xvs', 'xvsearch'],
    description: 'Search for videos on XVideos',
    category: 'adult',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try { await sock.sendMessage(chatId, { react: { text: '🔞', key: msg.key } }); } catch {}

        const query = args.join(' ').trim();
        if (!query) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  XVIDEOS SEARCH 〕\n║\n║ ▸ *Usage*   : ${prefix}xvs <query>\n║ ▸ *Example* : ${prefix}xvs big booty\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        try {
            const data = await kFetch(`/search/xvideos?q=${encodeURIComponent(query)}`);
            const results = data.result || [];
            if (!results.length) {
                return sock.sendMessage(chatId, {
                    text: `╔═|〔  XVIDEOS SEARCH 〕\n║\n║ ▸ *Query* : ${query}\n║ ▸ No results found\n║\n╚═|〔 ${name} 〕`
                }, { quoted: msg });
            }

            const top = results.slice(0, 6);
            const lines = [
                `╔═|〔  🔞 XVIDEOS SEARCH 〕`,
                `║`,
                `║ ▸ *Query* : ${query}`,
                `║ ▸ *Found* : ${results.length} results`,
                `║`,
            ];
            top.forEach((v, i) => {
                lines.push(`║ ${i + 1}. *${v.title}*`);
                if (v.duration) lines.push(`║    ⏱️ ${v.duration}`);
                lines.push(`║    🔗 ${v.url}`);
                lines.push(`║`);
            });
            lines.push(`║ 💡 Use *${prefix}xvdl <url>* to download`);
            lines.push(`╚═|〔 ${name} 〕`);

            return sock.sendMessage(chatId, { text: lines.join('\n') }, { quoted: msg });
        } catch (e) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  XVIDEOS SEARCH 〕\n║\n║ ▸ ❌ Error: ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

// ── 2. XVIDEOS DOWNLOAD ───────────────────────────────────────────────────────
const xvideosDownloadCmd = {
    name: 'xvideosdownload',
    aliases: ['xvdl', 'xvdownload'],
    description: 'Download a video from XVideos',
    category: 'adult',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try { await sock.sendMessage(chatId, { react: { text: '⏬', key: msg.key } }); } catch {}

        const url = args[0]?.trim();
        if (!url || !url.includes('xvideos.com')) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  XVIDEOS DOWNLOAD 〕\n║\n║ ▸ *Usage*   : ${prefix}xvdl <xvideos-url>\n║ ▸ *Example* : ${prefix}xvdl https://www.xvideos.com/video.xxx\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        try {
            const data = await kFetch(`/download/xvideos?url=${encodeURIComponent(url)}`);
            const r    = data.result;
            if (!r?.download_url) throw new Error('No download URL returned');

            await sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  🔞 XVIDEOS DOWNLOAD 〕`,
                    `║`,
                    `║ ▸ *Title* : ${r.title}`,
                    `║ ▸ *Size*  : ${r.size || 'unknown'}`,
                    `║ ▸ *Views* : ${r.views || 'N/A'}`,
                    `║`,
                    `╚═|〔 ${name} 〕`,
                ].join('\n')
            }, { quoted: msg });

            return sock.sendMessage(chatId, {
                video: { url: r.download_url },
                caption: `🔞 *${r.title}*\n📦 ${r.size || ''}\n\n> ${name}`,
                mimetype: 'video/mp4',
            }, { quoted: msg });
        } catch (e) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  XVIDEOS DOWNLOAD 〕\n║\n║ ▸ ❌ Error: ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

// ── 3. XNXX SEARCH ────────────────────────────────────────────────────────────
const xnxxSearchCmd = {
    name: 'xnxxsearch',
    aliases: ['xns', 'xnxxs'],
    description: 'Search for videos on XNXX',
    category: 'adult',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try { await sock.sendMessage(chatId, { react: { text: '🔞', key: msg.key } }); } catch {}

        const query = args.join(' ').trim();
        if (!query) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  XNXX SEARCH 〕\n║\n║ ▸ *Usage*   : ${prefix}xns <query>\n║ ▸ *Example* : ${prefix}xns milf\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        try {
            const data    = await kFetch(`/search/xnxx?q=${encodeURIComponent(query)}`);
            const results = data.result || [];
            if (!results.length) {
                return sock.sendMessage(chatId, {
                    text: `╔═|〔  XNXX SEARCH 〕\n║\n║ ▸ *Query* : ${query}\n║ ▸ No results found\n║\n╚═|〔 ${name} 〕`
                }, { quoted: msg });
            }

            const top   = results.slice(0, 6);
            const lines = [
                `╔═|〔  🔞 XNXX SEARCH 〕`,
                `║`,
                `║ ▸ *Query* : ${query}`,
                `║ ▸ *Found* : ${results.length} results`,
                `║`,
            ];
            top.forEach((v, i) => {
                lines.push(`║ ${i + 1}. *${v.title}*`);
                lines.push(`║    🔗 ${v.link}`);
                lines.push(`║`);
            });
            lines.push(`║ 💡 Use *${prefix}xndl <url>* to download`);
            lines.push(`╚═|〔 ${name} 〕`);

            return sock.sendMessage(chatId, { text: lines.join('\n') }, { quoted: msg });
        } catch (e) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  XNXX SEARCH 〕\n║\n║ ▸ ❌ Error: ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

// ── 4. XNXX DOWNLOAD ──────────────────────────────────────────────────────────
const xnxxDownloadCmd = {
    name: 'xnxxdownload',
    aliases: ['xndl', 'xnxxdl'],
    description: 'Download a video from XNXX',
    category: 'adult',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try { await sock.sendMessage(chatId, { react: { text: '⏬', key: msg.key } }); } catch {}

        const url = args[0]?.trim();
        if (!url || !url.includes('xnxx.com')) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  XNXX DOWNLOAD 〕\n║\n║ ▸ *Usage*   : ${prefix}xndl <xnxx-url>\n║ ▸ *Example* : ${prefix}xndl https://www.xnxx.com/video-xxx\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        try {
            const data = await kFetch(`/download/xnxx?url=${encodeURIComponent(url)}`);
            const r    = data.result;
            const dlUrl = r?.files?.low || r?.files?.high || r?.download_url;
            if (!dlUrl) throw new Error('No download URL returned');

            await sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  🔞 XNXX DOWNLOAD 〕`,
                    `║`,
                    `║ ▸ *Title*    : ${r.title}`,
                    `║ ▸ *Duration* : ${r.duration ? Math.round(r.duration / 60) + ' min' : 'N/A'}`,
                    `║ ▸ *Quality*  : ${r.info || 'N/A'}`,
                    `║`,
                    `╚═|〔 ${name} 〕`,
                ].join('\n')
            }, { quoted: msg });

            return sock.sendMessage(chatId, {
                video: { url: dlUrl },
                caption: `🔞 *${r.title}*\n\n> ${name}`,
                mimetype: 'video/mp4',
            }, { quoted: msg });
        } catch (e) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  XNXX DOWNLOAD 〕\n║\n║ ▸ ❌ Error: ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

// ── 5. HENTAI (RANDOM) ────────────────────────────────────────────────────────
const hentaiCmd = {
    name: 'hentai',
    aliases: ['hentaivid', 'hentaivideo', 'hentai18'],
    description: 'Get a random hentai video',
    category: 'adult',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try { await sock.sendMessage(chatId, { react: { text: '🔞', key: msg.key } }); } catch {}

        try {
            const data = await kFetch('/dl/hentaivid');
            const r    = (data.result || [])[0];
            if (!r) throw new Error('No hentai result returned');

            const dlUrl = r.media?.video_url || r.media?.fallback_url;
            if (!dlUrl) throw new Error('No video URL in response');

            return sock.sendMessage(chatId, {
                video: { url: dlUrl },
                caption: [
                    `╔═|〔  🔞 HENTAI 〕`,
                    `║`,
                    `║ ▸ *Title*    : ${r.title}`,
                    `║ ▸ *Category* : ${r.category || 'N/A'}`,
                    `║ ▸ *Views*    : ${r.views_count || 'N/A'}`,
                    `║`,
                    `╚═|〔 ${name} 〕`,
                ].join('\n'),
                mimetype: 'video/mp4',
            }, { quoted: msg });
        } catch (e) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  HENTAI 〕\n║\n║ ▸ ❌ Error: ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

module.exports = [xvideosSearchCmd, xvideosDownloadCmd, xnxxSearchCmd, xnxxDownloadCmd, hentaiCmd];
