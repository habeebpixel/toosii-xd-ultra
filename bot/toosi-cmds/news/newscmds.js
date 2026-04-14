'use strict';

const { getBotName } = require('../../lib/botname');

function trunc(s, n = 80) {
    return !s ? '' : String(s).length > n ? String(s).substring(0, n) + '…' : String(s);
}

function parseRssItems(xml, limit = 6) {
    const items = [];
    const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
    for (const b of blocks.slice(0, limit)) {
        const title = (b.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i) ||
                       b.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '';
        const link  = (b.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || [])[1] ||
                      (b.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i) || [])[1] || '';
        const desc  = (b.match(/<description[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i) ||
                       b.match(/<description[^>]*>([\s\S]*?)<\/description>/i) || [])[1] || '';
        const cleanDesc = desc.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/gi, ' ').trim();
        if (title) items.push({ title: title.trim(), link: link.trim(), desc: cleanDesc });
    }
    return items;
}

async function fetchRss(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'ToosiiBot/1.0', Accept: 'application/rss+xml, application/xml, text/xml' }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
    } finally { clearTimeout(timer); }
}

// ── 1. BBC World News (BBC RSS — free) ───────────────────────────────────────
const bbcCmd = {
    name: 'news',
    aliases: ['bbcnews', 'bbc', 'bbcnew', 'worldnews', 'headlines', 'breakingnews', 'latestnews', 'topnews'],
    description: 'Latest BBC news headlines — .news [topic] (world|tech|sport|health|science|business|africa)',
    category: 'news',
    async execute(sock, msg, args) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const section = (args[0] || '').toLowerCase();

        const ALIAS = { football: 'sport', soccer: 'sport', sports: 'sport', technology: 'tech', it: 'tech', international: 'world', global: 'world', economy: 'business', finance: 'business', biz: 'business', environment: 'science', kenya: 'africa' };
        const key    = ALIAS[section] || section;

        const RSS_URLS = {
            sport:         'https://feeds.bbci.co.uk/sport/rss.xml',
            tech:          'https://feeds.bbci.co.uk/news/technology/rss.xml',
            world:         'https://feeds.bbci.co.uk/news/world/rss.xml',
            health:        'https://feeds.bbci.co.uk/news/health/rss.xml',
            science:       'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
            business:      'https://feeds.bbci.co.uk/news/business/rss.xml',
            africa:        'https://feeds.bbci.co.uk/news/world/africa/rss.xml',
            entertainment: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml',
        };
        const rssUrl = RSS_URLS[key] || 'https://feeds.bbci.co.uk/news/rss.xml';
        const label  = key ? key.toUpperCase() : 'TOP STORIES';
        const sections = Object.keys(RSS_URLS).join(' | ');

        try {
            await sock.sendMessage(chatId, { react: { text: '🌍', key: msg.key } });
            const xml   = await fetchRss(rssUrl);
            const items = parseRssItems(xml, 7);
            if (!items.length) throw new Error('No news items');

            const list = items.map((item, i) =>
                `║ ▸ [${i + 1}] *${trunc(item.title, 70)}*\n${item.desc ? `║      ${trunc(item.desc, 70)}\n` : ''}║      🔗 ${item.link}`
            ).join('\n║\n');

            await sock.sendMessage(chatId, {
                text: `╔═|〔  🌍 BBC NEWS — ${label} 〕\n║\n${list}\n║\n║ 💡 Topics: ${sections}\n║\n╚═╝`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🌍 BBC NEWS 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═╝`
            }, { quoted: msg });
        }
    }
};

// ── 2. Tech News (HackerNews API — free, no key) ─────────────────────────────
const techCmd = {
    name: 'technews',
    aliases: ['tech', 'technew', 'hackernews', 'hn'],
    description: 'Latest top tech stories from Hacker News',
    category: 'news',
    async execute(sock, msg) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try {
            await sock.sendMessage(chatId, { react: { text: '💻', key: msg.key } });
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 15000);

            const idsRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json', { signal: controller.signal });
            clearTimeout(timer);
            const ids = (await idsRes.json()).slice(0, 8);

            const stories = await Promise.all(ids.map(async id => {
                try {
                    const r = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
                    return r.json();
                } catch { return null; }
            }));

            const valid = stories.filter(s => s?.title && s?.url).slice(0, 7);
            if (!valid.length) throw new Error('No stories available');

            const list = valid.map((s, i) =>
                `║ ▸ [${i + 1}] *${trunc(s.title, 70)}*\n║      ⬆️ ${s.score || 0} pts | 💬 ${s.descendants || 0}\n║      🔗 ${s.url}`
            ).join('\n║\n');

            await sock.sendMessage(chatId, {
                text: `╔═|〔  💻 TECH NEWS (Hacker News) 〕\n║\n${list}\n║\n╚═╝`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  💻 TECH NEWS 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═╝`
            }, { quoted: msg });
        }
    }
};

// ── 3. Football News (BBC Sport RSS — free) ───────────────────────────────────
const footballNewsCmd = {
    name: 'footballnews',
    aliases: ['fnews', 'soccernews', 'sportnews', 'footynews'],
    description: 'Latest football/soccer news from BBC Sport',
    category: 'news',
    async execute(sock, msg) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try {
            await sock.sendMessage(chatId, { react: { text: '⚽', key: msg.key } });
            const xml   = await fetchRss('https://feeds.bbci.co.uk/sport/football/rss.xml');
            const items = parseRssItems(xml, 7);
            if (!items.length) throw new Error('No football news');

            const list = items.map((item, i) =>
                `║ ▸ [${i + 1}] *${trunc(item.title, 65)}*\n${item.desc ? `║      ${trunc(item.desc, 70)}\n` : ''}║      🔗 ${item.link}`
            ).join('\n║\n');

            await sock.sendMessage(chatId, {
                text: `╔═|〔  ⚽ FOOTBALL NEWS 〕\n║\n${list}\n║\n╚═╝`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  ⚽ FOOTBALL NEWS 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═╝`
            }, { quoted: msg });
        }
    }
};

module.exports = [bbcCmd, techCmd, footballNewsCmd];
