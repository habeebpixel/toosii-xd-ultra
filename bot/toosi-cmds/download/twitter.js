const { casperGet, keithGet, extractUrl, dlBuffer } = require('../../lib/keithapi');
const { getBotName } = require('../../lib/botname');

module.exports = {
    name: 'twitter',
    aliases: ['x', 'xdl', 'xdown'],
    description: 'Download Twitter/X video',
    category: 'download',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const url    = args[0];

        if (!url) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  TWITTER / X 〕\n║\n║ ▸ *Usage* : ${prefix}twitter <url>\n║\n╚═╝`
            }, { quoted: msg });
        }

        try {
            let dlUrl, qual;

            try {
                const data  = await casperGet('/api/downloader/x', { url });
                if (!data.success) throw new Error(data.error || 'Casper: no result');
                const media = data.media || [];
                const clean = media.find(m => m.downloadUrl && !m.downloadUrl.endsWith("')"));
                const best  = clean || media[0];
                if (!best?.downloadUrl) throw new Error('Casper: no video URL');
                dlUrl = best.downloadUrl.replace(/'\)$/, '');
                qual  = best.quality || 'HD';
            } catch {
                const data2 = await keithGet('/download/twitter', { url });
                if (!data2.status) throw new Error(data2.error || 'fallback failed');
                dlUrl = extractUrl(data2.result);
                qual  = 'HD';
                if (!dlUrl || dlUrl.includes('undefined')) throw new Error('No download URL found');
            }

            const buf    = await dlBuffer(dlUrl);
            const banner = `╔═|〔  TWITTER / X 〕\n║\n║ ▸ *Quality*: ${qual}\n║ ▸ *Size*   : ${(buf.length/1024/1024).toFixed(2)} MB\n║\n╚═╝`;
            await sock.sendMessage(chatId, { video: buf, caption: banner }, { quoted: msg });

        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  TWITTER / X 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═╝`
            }, { quoted: msg });
        }
    }
};
