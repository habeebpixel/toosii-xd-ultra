const { keithGet, extractUrl, dlBuffer } = require('../../lib/keithapi');
const { getBotName } = require('../../lib/botname');

module.exports = {
    name: 'tg',
    aliases: ['telegram', 'tgdl'],
    description: 'Download Telegram channel/group media',
    category: 'download',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const url    = args[0];

        if (!url) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  TELEGRAM 〕\n║\n║ ▸ *Usage* : ${prefix}tg <t.me/channel/post>\n║\n╚═╝`
            }, { quoted: msg });
        }

        try {
            const data  = await keithGet('/download/telegram', { url });
            if (!data.status) throw new Error(data.error || 'API failed');
            const dlUrl = extractUrl(data.result);
            if (!dlUrl) throw new Error('No download URL returned');

            const buf     = await dlBuffer(dlUrl);
            const isVideo = dlUrl.includes('.mp4') || dlUrl.includes('video');
            const banner  = `╔═|〔  TELEGRAM 〕\n║\n║ ▸ *Size* : ${(buf.length/1024/1024).toFixed(2)} MB\n║\n╚═╝`;

            if (isVideo) await sock.sendMessage(chatId, { video: buf, caption: banner }, { quoted: msg });
            else          await sock.sendMessage(chatId, { document: buf, mimetype: 'application/octet-stream', fileName: 'telegram_media', caption: banner }, { quoted: msg });

        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  TELEGRAM 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═╝`
            }, { quoted: msg });
        }
    }
};
