'use strict';

const { casperGet, dlBuffer } = require('../../lib/keithapi');
const { getBotName } = require('../../lib/botname');

async function apiFetch(url, timeoutMs = 12000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'ToosiiBot/1.0' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    } finally { clearTimeout(timer); }
}

// ── Bible (bible-api.com — free, no key) ─────────────────────────────────────
const bibleCmd = {
    name: 'bible',
    aliases: ['verse', 'scripture', 'holybook'],
    description: 'Look up any Bible verse or passage',
    category: 'search',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const query  = args.join(' ').trim().replace(/\s+/g, '+');
        if (!query) return sock.sendMessage(chatId, {
            text: `╔═|〔  📖 BIBLE 〕\n║\n║ ▸ *Usage* : ${prefix}bible <reference>\n║ ▸ *Example* : ${prefix}bible john3:16\n║\n╚═|〔 ${name} 〕`
        }, { quoted: msg });
        try {
            await sock.sendMessage(chatId, { react: { text: '📖', key: msg.key } });
            const data = await apiFetch(`https://bible-api.com/${query}?translation=web`);
            if (!data?.reference) throw new Error('Verse not found');

            const verses = (data.verses || []).map(v => `║ ▸ [${v.verse}] ${v.text.trim()}`).join('\n');
            await sock.sendMessage(chatId, {
                text: `╔═|〔  📖 BIBLE 〕\n║\n║ ▸ *Reference* : ${data.reference}\n║ ▸ *Version*   : ${data.translation_name || 'WEB'}\n║\n${verses}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  📖 BIBLE 〕\n║\n║ ▸ *Status* : ❌ Not found\n║ ▸ *Tip*    : Use format like john3:16 or psalm23\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

// ── Lyrics (Casper /api/search/lyrics — working ✅) ───────────────────────────
const lyricsCmd = {
    name: 'lyrics',
    aliases: ['lyric', 'songlyrics', 'getlyrics'],
    description: 'Get lyrics for any song',
    category: 'search',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const query  = args.join(' ').trim();
        if (!query) return sock.sendMessage(chatId, {
            text: `╔═|〔  🎵 LYRICS 〕\n║\n║ ▸ *Usage* : ${prefix}lyrics <song name>\n║ ▸ *Example* : ${prefix}lyrics faded alan walker\n║\n╚═|〔 ${name} 〕`
        }, { quoted: msg });
        try {
            await sock.sendMessage(chatId, { react: { text: '🎵', key: msg.key } });
            const data = await casperGet('/api/search/lyrics', { q: query });
            if (!data.success || !data.tracks?.length) throw new Error('No lyrics found');

            const track = data.tracks[0];
            const lyricsText = (track.lyrics || track.plainLyrics || '').substring(0, 3000);
            if (!lyricsText) throw new Error('Lyrics not available for this song');

            await sock.sendMessage(chatId, {
                text: `╔═|〔  🎵 LYRICS 〕\n║\n║ ▸ *Song*   : ${track.name || query}\n║ ▸ *Artist* : ${track.trackName || 'Unknown'}\n║\n${lyricsText}${lyricsText.length >= 3000 ? '\n║\n║ ▸ [lyrics truncated]' : ''}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🎵 LYRICS 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

// ── Movie Search (OMDb — free trial key) ──────────────────────────────────────
const movieCmd = {
    name: 'movie',
    aliases: ['film', 'moviesearch', 'imdb'],
    description: 'Search for any movie or TV show',
    category: 'search',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const query  = args.join(' ').trim();
        if (!query) return sock.sendMessage(chatId, {
            text: `╔═|〔  🎬 MOVIE SEARCH 〕\n║\n║ ▸ *Usage* : ${prefix}movie <title>\n║ ▸ *Example* : ${prefix}movie avengers\n║\n╚═|〔 ${name} 〕`
        }, { quoted: msg });
        try {
            await sock.sendMessage(chatId, { react: { text: '🎬', key: msg.key } });
            const data = await apiFetch(`https://www.omdbapi.com/?t=${encodeURIComponent(query)}&apikey=trilogy`);
            if (data.Response === 'False') throw new Error(data.Error || 'Movie not found');

            const banner =
                `╔═|〔  🎬 MOVIE 〕\n║\n` +
                `║ ▸ *Title*    : ${data.Title} (${data.Year})\n` +
                `║ ▸ *Genre*    : ${data.Genre}\n` +
                `║ ▸ *Director* : ${data.Director}\n` +
                `║ ▸ *Actors*   : ${data.Actors}\n` +
                `║ ▸ *Runtime*  : ${data.Runtime}\n` +
                `║ ▸ *Rated*    : ${data.Rated}\n` +
                `║ ▸ *IMDB*     : ⭐ ${data.imdbRating}/10\n` +
                `║\n║ 📝 *Plot* : ${data.Plot}\n║\n` +
                `╚═|〔 ${name} 〕`;
            await sock.sendMessage(chatId, { text: banner }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🎬 MOVIE SEARCH 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

module.exports = [bibleCmd, lyricsCmd, movieCmd];
