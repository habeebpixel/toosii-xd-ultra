'use strict';
const path = require('path');
const fs   = require('fs');
const { getBotName } = require('../../lib/botname');
const cfg  = require('../../config');

const CMDS_DIR = path.join(__dirname, '..');

const CATEGORY_LABELS = {
    ai:          '🤖 AI',
    adult:       '🔞 ADULT',
    automation:  '⚙️ AUTOMATION',
    channel:     '📢 CHANNEL',
    download:    '📥 DOWNLOAD',
    education:   '📚 EDUCATION',
    fun:         '😂 FUN',
    games:       '🎮 GAMES',
    group:       '👥 GROUP',
    image:       '🖼️ IMAGE',
    movie:       '🎬 MOVIE',
    news:        '📰 NEWS',
    owner:       '👑 OWNER',
    search:      '🔎 SEARCH',
    spiritual:   '🕊️ SPIRITUAL',
    sports:      '⚽ SPORTS',
    stalker:     '🔍 STALKER',
    utility:     '🔧 UTILITY',
};

// Category order to match alive output
const CATEGORY_ORDER = [
    'utility','owner','ai','group','automation','channel',
    'download','education','spiritual','fun','sports',
    'news','stalker','image','movie','search','adult','games'
];

function getCommandsForCategory(categoryPath) {
    const names = [];
    try {
        const files = fs.readdirSync(categoryPath)
            .filter(f => f.endsWith('.js') && !f.includes('.test.') && !f.includes('.disabled.'))
            .sort();
        for (const file of files) {
            try {
                const mod = require(path.join(categoryPath, file));
                const raw = mod.default || mod;
                const list = Array.isArray(raw) ? raw : (raw && raw.name ? [raw] : []);
                for (const cmd of list) {
                    if (cmd && cmd.name) names.push(cmd.name);
                }
            } catch {}
        }
    } catch {}
    return names;
}

module.exports = {
    name:        'menu',
    aliases:     ['help', 'cmds', 'commands', 'list'],
    description: 'Show all available bot commands',
    category:    'utility',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId  = msg.key.remoteJid;
        const botName = getBotName();
        const p       = prefix || cfg.PREFIX || '.';

        // Collect all categories
        const allCats = fs.readdirSync(CMDS_DIR).filter(item =>
            fs.statSync(path.join(CMDS_DIR, item)).isDirectory()
        );

        // Sort: known order first, then any extras alphabetically
        const ordered = [
            ...CATEGORY_ORDER.filter(c => allCats.includes(c)),
            ...allCats.filter(c => !CATEGORY_ORDER.includes(c)).sort()
        ];

        const lines = [
            `╔═| ●-¤○《  MENU  》○¤-●`,
            `║`,
            `║  ▸ ■  *Prefix*  :  ${p}`,
            `║  ▸ ■  *Bot*     :  ${botName}`,
            `║`,
        ];

        let totalCmds = 0;

        for (const cat of ordered) {
            const catPath = path.join(CMDS_DIR, cat);
            const cmdNames = getCommandsForCategory(catPath);
            if (cmdNames.length === 0) continue;

            const label = CATEGORY_LABELS[cat] || `📁 ${cat.toUpperCase()}`;
            lines.push(`╠═| ■-${label} -■`);
            for (const name of cmdNames) {
                lines.push(`║  ◇ ${p}${name}`);
            }
            totalCmds += cmdNames.length;
        }

        lines.push(`║`);
        lines.push(`║  ▸ *Total* : ${totalCmds} commands`);
        lines.push(`║`);
        lines.push(`╚═╝`);

        await sock.sendMessage(chatId, { text: lines.join('\n') }, { quoted: msg });
    },
};
