'use strict';

const { getBotName } = require('../../lib/botname');

module.exports = {
    name: 'broadcast',
    aliases: ['bc', 'bcast'],
    description: 'Broadcast a message to all groups (owner only)',
    category: 'owner',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();

        if (!ctx.isOwner()) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  BROADCAST 〕\n║\n║ ▸ *Status* : ❌ Owner only\n║\n╚═╝`
            }, { quoted: msg });
        }

        const text = args.join(' ').trim();
        if (!text) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  BROADCAST 〕\n║\n║ ▸ *Usage* : ${prefix}broadcast <message>\n║\n╚═╝`
            }, { quoted: msg });
        }

        try { await sock.sendMessage(chatId, { react: { text: '📢', key: msg.key } }); } catch {}

        // Get all group chats
        const allChats = await sock.groupFetchAllParticipating();
        const groupIds = Object.keys(allChats);

        if (groupIds.length === 0) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  BROADCAST 〕\n║\n║ ▸ *Status* : ❌ Bot is in no groups\n║\n╚═╝`
            }, { quoted: msg });
        }

        const broadcastMsg = `📢 *BROADCAST*\n\n${text}\n\n_— ${name}_`;

        let sent = 0, failed = 0;
        for (const gid of groupIds) {
            try {
                await sock.sendMessage(gid, { text: broadcastMsg });
                sent++;
                await new Promise(r => setTimeout(r, 800)); // rate-limit delay
            } catch {
                failed++;
            }
        }

        await sock.sendMessage(chatId, {
            text: `╔═|〔  BROADCAST 〕\n║\n║ ▸ *Sent*   : ✅ ${sent} groups\n║ ▸ *Failed* : ❌ ${failed} groups\n║\n╚═╝`
        }, { quoted: msg });
    }
};
