'use strict';

const { getBotName }                    = require('../../lib/botname');
const { getTarget, resolveDisplay }     = require('../../lib/groupUtils');
const { dlBuffer }                      = require('../../lib/keithapi');

module.exports = {
    name: 'pp',
    aliases: ['pfp', 'profilepic', 'avatar', 'dp'],
    description: "Get someone's profile picture",
    category: 'utility',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();

        try { await sock.sendMessage(chatId, { react: { text: '📸', key: msg.key } }); } catch {}

        // Target: quoted, mention, arg number, or self
        let targetJid = getTarget(msg, args);
        if (!targetJid) targetJid = msg.key.participant || msg.key.remoteJid;

        // Normalise bare numbers
        if (!targetJid.includes('@')) targetJid = targetJid.replace(/[^0-9]/g, '') + '@s.whatsapp.net';

        // Resolve a human-readable display (handles LID → real phone lookup)
        const display = await resolveDisplay(sock, chatId, targetJid).catch(() => null);
        const label   = display || targetJid.split('@')[0].split(':')[0];

        try {
            const ppUrl = await sock.profilePictureUrl(targetJid, 'image');
            const buf   = await dlBuffer(ppUrl);

            await sock.sendMessage(chatId, {
                image: buf,
                caption: `╔═|〔  PROFILE PIC 〕\n║\n║ ▸ *User* : ${label.startsWith('+') ? label : '+' + label}\n║\n╚═╝`
            }, { quoted: msg });
        } catch {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  PROFILE PIC 〕\n║\n║ ▸ *User*   : ${label.startsWith('+') ? label : '+' + label}\n║ ▸ *Status* : ❌ No profile picture\n║            (hidden or not set)\n║\n╚═╝`
            }, { quoted: msg });
        }
    }
};
