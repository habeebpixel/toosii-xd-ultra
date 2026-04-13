'use strict';

const { getBotName } = require('../../lib/botname');

function trunc(s, n = 70) {
    if (!s) return 'N/A';
    return String(s).length > n ? String(s).substring(0, n) + '…' : String(s);
}

function fmtDate(d) {
    if (!d) return 'N/A';
    try { return new Date(d).toDateString(); } catch { return String(d); }
}

function box(title, icon, lines) {
    const name = getBotName();
    return `╔═|〔  ${icon} ${title} 〕\n║\n` + lines.filter(Boolean).join('\n') + `\n║\n╚═|〔 ${name} 〕`;
}

function err(title, icon, reason) {
    const name = getBotName();
    return `╔═|〔  ${icon} ${title} 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${reason}\n║\n╚═|〔 ${name} 〕`;
}

async function sdbFetch(path) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
        const res = await fetch(`https://www.thesportsdb.com/api/v1/json/3${path}`, {
            signal: controller.signal, headers: { 'User-Agent': 'ToosiiBot/1.0' }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    } finally { clearTimeout(timer); }
}

// ── Player Search (TheSportsDB — free) ───────────────────────────────────────
const playerSearchCmd = {
    name: 'playersearch',
    aliases: ['player', 'findplayer', 'playerinfo', 'pinfo'],
    description: 'Search for a sports player — .playersearch <name>',
    category: 'sports',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const query  = args.join(' ').trim();
        if (!query) return sock.sendMessage(chatId, {
            text: err('PLAYER SEARCH', '⚽', `Usage: ${prefix}playersearch <player name>`)
        }, { quoted: msg });

        try {
            await sock.sendMessage(chatId, { react: { text: '⚽', key: msg.key } });
            const data = await sdbFetch(`/searchplayers.php?p=${encodeURIComponent(query)}`);
            const list = data.player || [];
            if (!list.length) throw new Error('No players found');

            const top = list.slice(0, 5).map((p, i) => [
                `║ ▸ [${i + 1}] *${p.strPlayer}*  (${p.strTeam || 'N/A'})`,
                `║      🏅 ${p.strPosition || 'N/A'} | 🌍 ${p.strNationality || 'N/A'} | 🎂 ${fmtDate(p.dateBorn)}`,
                `║      🏆 ${p.strSport || 'Soccer'} | #${p.strNumber || 'N/A'}`,
            ].join('\n')).join('\n║\n');

            await sock.sendMessage(chatId, {
                text: box(`PLAYER SEARCH · ${query}`, '⚽', [top])
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: err('PLAYER SEARCH', '⚽', e.message) }, { quoted: msg });
        }
    }
};

// ── Team Search (TheSportsDB — free) ─────────────────────────────────────────
const teamSearchCmd = {
    name: 'teamsearch',
    aliases: ['team', 'findteam', 'clubinfo', 'club'],
    description: 'Search for a sports team/club — .teamsearch <name>',
    category: 'sports',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const query  = args.join(' ').trim();
        if (!query) return sock.sendMessage(chatId, {
            text: err('TEAM SEARCH', '🛡️', `Usage: ${prefix}teamsearch <team name>`)
        }, { quoted: msg });

        try {
            await sock.sendMessage(chatId, { react: { text: '🛡️', key: msg.key } });
            const data = await sdbFetch(`/searchteams.php?t=${encodeURIComponent(query)}`);
            const teams = data.teams || [];
            if (!teams.length) throw new Error('No teams found');
            const t = teams[0];
            const others = teams.slice(1, 4).map(x => x.strTeam).join(', ');

            await sock.sendMessage(chatId, {
                text: box(`TEAM INFO · ${t.strTeam}`, '🛡️', [
                    `║ ▸ *Name*      : ${t.strTeam}`,
                    `║ ▸ *Short*     : ${t.strTeamShort || t.strTeamAlternate || 'N/A'}`,
                    `║ ▸ *Sport*     : ${t.strSport || 'Soccer'}`,
                    `║ ▸ *League*    : ${t.strLeague || 'N/A'}`,
                    `║ ▸ *Country*   : ${t.strCountry || 'N/A'}`,
                    `║ ▸ *Stadium*   : ${t.strStadium || 'N/A'} (${t.intStadiumCapacity ? Number(t.intStadiumCapacity).toLocaleString() + ' cap' : 'N/A'})`,
                    `║ ▸ *Founded*   : ${t.intFormedYear || 'N/A'}`,
                    `║ ▸ *Colors*    : ${t.strKitColour1 || 'N/A'}`,
                    `║ ▸ *About*     : ${trunc(t.strDescriptionEN, 100)}`,
                    others ? `║\n║ 🔍 Also found: ${others}` : null,
                ])
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: err('TEAM SEARCH', '🛡️', e.message) }, { quoted: msg });
        }
    }
};

// ── Venue Search (TheSportsDB — free) ────────────────────────────────────────
const venueSearchCmd = {
    name: 'venuesearch',
    aliases: ['venue', 'stadium', 'findvenue', 'arena'],
    description: 'Search for a sports venue/stadium — .venuesearch <name>',
    category: 'sports',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const query  = args.join(' ').trim();
        if (!query) return sock.sendMessage(chatId, {
            text: err('VENUE SEARCH', '🏟️', `Usage: ${prefix}venuesearch <stadium name>`)
        }, { quoted: msg });

        try {
            await sock.sendMessage(chatId, { react: { text: '🏟️', key: msg.key } });
            const data = await sdbFetch(`/searchvenues.php?e=${encodeURIComponent(query)}`);
            const venues = data.venues || [];
            if (!venues.length) throw new Error('No venues found');

            const top = venues.slice(0, 4).map((v, i) => [
                `║ ▸ [${i + 1}] *${v.strVenue}*`,
                `║      📍 ${v.strLocation || 'N/A'}, ${v.strCountry || 'N/A'}`,
                `║      👥 Capacity: ${v.intCapacity ? Number(v.intCapacity).toLocaleString() : 'N/A'} | 🏆 ${v.strSport || 'N/A'}`,
                v.strDescriptionEN ? `║      ${trunc(v.strDescriptionEN, 60)}` : null,
            ].filter(Boolean).join('\n')).join('\n║\n');

            await sock.sendMessage(chatId, {
                text: box(`VENUE SEARCH · ${query}`, '🏟️', [top])
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: err('VENUE SEARCH', '🏟️', e.message) }, { quoted: msg });
        }
    }
};

// ── Event Search / H2H (TheSportsDB — free) ───────────────────────────────────
const gameEventsCmd = {
    name: 'h2h',
    aliases: ['gameevents', 'matchhistory', 'headtohead', 'versus'],
    description: 'Head-to-head / event search — .h2h <Team A> vs <Team B>',
    category: 'sports',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const query  = args.join(' ').trim();
        if (!query) return sock.sendMessage(chatId, {
            text: err('H2H SEARCH', '⚔️', `Usage: ${prefix}h2h <Team A> vs <Team B>`)
        }, { quoted: msg });

        try {
            await sock.sendMessage(chatId, { react: { text: '⚔️', key: msg.key } });
            const search = query.replace(/\s+vs\s+/i, ' ');
            const data   = await sdbFetch(`/searchevents.php?e=${encodeURIComponent(search)}`);
            const events = data.event || [];
            if (!events.length) throw new Error('No match history found');

            const sorted = events.slice(0, 8);
            const list = sorted.map((m, i) => [
                `║ ▸ [${i + 1}] *${m.strEvent}*`,
                `║      📅 ${m.dateEvent || 'N/A'} | Status: ${m.strStatus || 'N/A'}`,
                `║      🏟️ ${m.strVenue || 'N/A'}`,
                m.strLeague ? `║      🏆 ${m.strLeague} — Season ${m.strSeason || 'N/A'}` : null,
                (m.intHomeScore != null && m.intAwayScore != null)
                    ? `║      📊 Score: ${m.intHomeScore} — ${m.intAwayScore}` : null,
            ].filter(Boolean).join('\n')).join('\n║\n');

            await sock.sendMessage(chatId, {
                text: box(`H2H · ${query}`, '⚔️', [
                    `║ 📊 *${events.length} events found* (showing ${sorted.length})`,
                    '║',
                    list,
                ])
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: err('H2H SEARCH', '⚔️', e.message) }, { quoted: msg });
        }
    }
};

module.exports = [playerSearchCmd, teamSearchCmd, venueSearchCmd, gameEventsCmd];
