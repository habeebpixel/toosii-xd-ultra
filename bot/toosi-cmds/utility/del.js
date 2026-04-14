'use strict';

const { getBotName } = require('../../lib/botname');

module.exports = {
    name: 'del',
    aliases: ['delete', 'unsend', 'rm'],
    description: 'Delete a quoted message',
    category: 'utility',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId  = msg.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');
        const name    = getBotName();

        const isOwner = ctx.isOwner();
        const isSudo  = ctx.isSudo();

        // ── Check if there is a quoted message ────────────────────────────
        const ctxInfo = msg.message?.extendedTextMessage?.contextInfo
                     || msg.message?.imageMessage?.contextInfo
                     || msg.message?.videoMessage?.contextInfo
                     || msg.message?.audioMessage?.contextInfo
                     || msg.message?.documentMessage?.contextInfo
                     || msg.message?.stickerMessage?.contextInfo;

        if (!ctxInfo?.stanzaId) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  DEL 〕\n║\n║ ▸ *Usage*  : Reply to a message\n║             with *${prefix}del*\n║ ▸ *Access* : Owner · Sudo · Admins\n║\n╚═╝`
            }, { quoted: msg });
        }

        // ── Permission check ──────────────────────────────────────────────
        let canDelete = isOwner || isSudo;

        if (!canDelete && isGroup) {
            try {
                const meta   = await sock.groupMetadata(chatId);
                const sender = msg.key.participant || msg.key.remoteJid;
                const me     = sock.user?.id?.replace(/:\d+/, '') + '@s.whatsapp.net';
                const botPart = meta.participants.find(p => p.id === me || p.id?.split(':')[0] + '@s.whatsapp.net' === me);
                const botIsAdmin = botPart?.admin === 'admin' || botPart?.admin === 'superadmin';
                const senderPart = meta.participants.find(p => p.id === sender);
                const senderIsAdmin = senderPart?.admin === 'admin' || senderPart?.admin === 'superadmin';

                if (senderIsAdmin && botIsAdmin) canDelete = true;
            } catch {}
        }

        if (!canDelete) {
            try { await sock.sendMessage(chatId, { react: { text: '🚫', key: msg.key } }); } catch {}
            return sock.sendMessage(chatId, {
                text: `╔═|〔  DEL 〕\n║\n║ ▸ *Status* : ❌ Permission denied\n║ ▸ *Access* : Owner · Sudo · Admins\n║\n╚═╝`
            }, { quoted: msg });
        }

        // ── Build the key of the message to delete ────────────────────────
        const quotedParticipant = ctxInfo.participant || ctxInfo.remoteJid || chatId;
        const me = (sock.user?.id?.replace(/:\d+/, '') || '') + '@s.whatsapp.net';
        const isFromBot = quotedParticipant === me || ctxInfo.participant === sock.user?.id;

        const quotedKey = {
            remoteJid:   chatId,
            id:          ctxInfo.stanzaId,
            participant: isGroup ? quotedParticipant : undefined,
            fromMe:      isFromBot,
        };

        // ── Delete the quoted message then the command itself ─────────────
        try {
            await sock.sendMessage(chatId, { delete: quotedKey });
        } catch (e) {
            try { await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } }); } catch {}
            return sock.sendMessage(chatId, {
                text: `╔═|〔  DEL 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═╝`
            }, { quoted: msg });
        }

        // Silently delete the .del command message too
        try { await sock.sendMessage(chatId, { delete: msg.key }); } catch {}
    }
};
