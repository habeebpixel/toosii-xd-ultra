const fs   = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '../../.env');

module.exports = {
    name:        'setnewsletter',
    aliases:     ['setnews', 'newsid'],
    description: 'Resolve a WhatsApp Channel JID from its invite code and save it. Usage: .setnewsletter <invite_code>',
    category:    'owner',
    ownerOnly:   true,

    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;

        const inviteCode = args[0] || process.env.NEWSLETTER_INVITE_CODE || '';
        if (!inviteCode) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  SET NEWSLETTER 〕\n║\n║ ▸ *Usage*  : ${prefix}setnewsletter <invite_code>\n║ ▸ *How*    : Copy the invite code from your\n║             WhatsApp Channel share link\n║             e.g. wa.me/channel/XXXXXX\n║\n╚═╝`
            }, { quoted: msg });
        }

        try {
            await sock.sendMessage(chatId, { react: { text: '🔍', key: msg.key } });
            await sock.sendMessage(chatId, { text: '🔎 Resolving channel JID from invite link...' }, { quoted: msg });

            const info = await sock.newsletterMetadata('invite', inviteCode);

            if (!info || !info.id) {
                return sock.sendMessage(chatId, {
                    text: '❌ Could not resolve channel JID. Make sure the bot account follows the channel first.',
                }, { quoted: msg });
            }

            const newsletterJid = info.id;

            // ── Write to .env ─────────────────────────────────────────────────
            let envText = '';
            if (fs.existsSync(ENV_PATH)) {
                envText = fs.readFileSync(ENV_PATH, 'utf-8');
            }

            if (/^NEWSLETTER_JID=/m.test(envText)) {
                envText = envText.replace(/^NEWSLETTER_JID=.*/m, `NEWSLETTER_JID=${newsletterJid}`);
            } else {
                envText += `\nNEWSLETTER_JID=${newsletterJid}\n`;
            }

            fs.writeFileSync(ENV_PATH, envText, 'utf-8');

            // ── Also set in process.env so it takes effect immediately ────────
            process.env.NEWSLETTER_JID = newsletterJid;

            await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });
            await sock.sendMessage(chatId, {
                text: `✅ *Channel JID resolved and saved!*\n\n` +
                      `📢 *Name:* ${info.name || 'Unknown'}\n` +
                      `🆔 *JID:* \`${newsletterJid}\`\n\n` +
                      `The menu command will now show the "Forwarded from ${info.name || 'TOOSII-XD ULTRA'}" header.\n` +
                      `No restart needed — active immediately.`,
            }, { quoted: msg });

        } catch (err) {
            console.error('[setnewsletter]', err);
            await sock.sendMessage(chatId, {
                text: `❌ Error: ${err.message || err}\n\nMake sure the bot follows the channel first.`,
            }, { quoted: msg });
        }
    },
};
