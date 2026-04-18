'use strict';
const path = require('path');
const fs   = require('fs');
const { getBotName } = require('../../lib/botname');
const cfg  = require('../../config');

const CMDS_DIR = path.join(__dirname, '..');

const CATEGORY_LABELS = {
    ai:          '🤖 AI',
    adult:       '🔞 Adult',
    automation:  '⚙️ Automation',
    channel:     '📢 Channel',
    download:    '📥 Download',
    education:   '📚 Education',
    fun:         '🎉 Fun',
    games:       '🎮 Games',
    group:       '👥 Group',
    image:       '🖼️ Image',
    movie:       '🎬 Movie',
    news:        '📰 News',
    owner:       '👑 Owner',
    search:      '🔍 Search',
    spiritual:   '🕌 Spiritual',
    sports:      '⚽ Sports',
    stalker:     '🕵️ Stalker',
    utility:     '🔧 Utility',
};

function getCommandsForCategory(categoryPath) {
    const names = [];
    try {
        const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js') && !f.includes('.test.') && !f.includes('.disabled.'));
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
        const foot    = `╚═|〔 ${botName} 〕`;
        const p       = prefix || cfg.PREFIX || '.';

        const categories = fs.readdirSync(CMDS_DIR).filter(item => {
            return fs.statSync(path.join(CMDS_DIR, item)).isDirectory();
        }).sort();

        const lines = [
            `╔═|〔  MENU 〕`,
            `║`,
            `║  Prefix: *${p}*  |  Bot: *${botName}*`,
            `║`,
        ];

        let totalCmds = 0;

        for (const cat of categories) {
            const catPath = path.join(CMDS_DIR, cat);
            const cmdNames = getCommandsForCategory(catPath);
            if (cmdNames.length === 0) continue;

            const label = CATEGORY_LABELS[cat] || `📁 ${cat.charAt(0).toUpperCase() + cat.slice(1)}`;
            lines.push(`║  *${label}*`);
            lines.push(`║  ${cmdNames.map(n => `${p}${n}`).join('  ')}`);
            lines.push(`║`);
            totalCmds += cmdNames.length;
        }

        lines.push(`║ ▸ *Total* : ${totalCmds} commands`);
        lines.push(`║`);
        lines.push(foot);

        await sock.sendMessage(chatId, { text: lines.join('\n') }, { quoted: msg });
    },
};
