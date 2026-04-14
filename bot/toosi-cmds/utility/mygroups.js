const { getBotName } = require('../../lib/botname');

// Global cache so index.js number-reply routing can resolve groups
globalThis.groupListCache  = globalThis.groupListCache  || [];
// Set of sent mygroups message IDs — index.js checks this to route number replies
globalThis.groupListMsgIds = globalThis.groupListMsgIds || new Set();

module.exports = {
    name:        'mygroups',
    aliases:     ['groups', 'listgroups', 'grouplist'],
    description: 'List all groups the bot is currently in',
    category:    'utility',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        try { await sock.sendMessage(chatId, { react: { text: '👥', key: msg.key } }); } catch {}
        const name   = getBotName();

        if (!ctx?.isOwnerUser && !ctx?.isSudoUser) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  MY GROUPS 〕\n║\n║ ▸ *Status* : ❌ Owner only\n║\n╚═╝`
            }, { quoted: msg });
        }

        try {
            await sock.sendMessage(chatId, { react: { text: '⏳', key: msg.key } });

            const allGroups = await sock.groupFetchAllParticipating();
            const groups    = Object.values(allGroups || {});

            if (!groups.length) {
                return sock.sendMessage(chatId, {
                    text: `╔═|〔  MY GROUPS 〕\n║\n║ ▸ Bot is not in any groups\n║\n╚═╝`
                }, { quoted: msg });
            }

            // Populate global cache for number-reply routing
            globalThis.groupListCache = groups.map((g, i) => ({
                index: i + 1,
                id:    g.id,
                name:  g.subject || 'Unknown',
                size:  (g.participants || []).length,
            }));

            const perPage = 20;
            const page    = Math.max(0, parseInt(args[0]) - 1 || 0);
            const slice   = globalThis.groupListCache.slice(page * perPage, (page + 1) * perPage);
            const total   = globalThis.groupListCache.length;
            const pages   = Math.ceil(total / perPage);

            const rows = slice.map(g => `║ ▸ *${g.index}.* ${g.name} (${g.size} members)`).join('\n');
            const footer = pages > 1
                ? `║\n║ ▸ Page ${page + 1}/${pages} — use *${prefix}mygroups <page>*`
                : '';

            const sent = await sock.sendMessage(chatId, {
                text: `╔═|〔  MY GROUPS 〕\n║\n║ ▸ *Total* : ${total} groups\n║\n${rows}\n${footer}\n║\n╚═╝`
            }, { quoted: msg });
            // Track this message's ID so index.js can route number replies to mygroups
            if (sent?.key?.id) globalThis.groupListMsgIds.add(sent.key.id);

            await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });
        } catch (err) {
            await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
            await sock.sendMessage(chatId, {
                text: `╔═|〔  MY GROUPS 〕\n║\n║ ▸ *Error* : ${err.message}\n║\n╚═╝`
            }, { quoted: msg });
        }
    }
};
