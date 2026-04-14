const { keithGet, dlBuffer, convertTo128kbps } = require('../../lib/keithapi');
const { getBotName } = require('../../lib/botname');

module.exports = {
    name: 'sc',
    aliases: ['soundcloud', 'scloud'],
    description: 'Download SoundCloud audio',
    category: 'download',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const url    = args[0];

        if (!url) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  SOUNDCLOUD 〕\n║\n║ ▸ *Usage* : ${prefix}sc <soundcloud_url>\n║\n╚═╝`
            }, { quoted: msg });
        }

        try {
            // Keith response: { creator, success, data: { url, title, thumbnail, duration, medias: [{url}] } }
            const data = await keithGet('/download/soundcloud', { url });
            if (!data.success) throw new Error(data.error || 'API failed');

            const track  = data.data || {};
            const medias = track.medias || [];
            const dlUrl  = medias[0]?.url || track.download || null;
            if (!dlUrl) throw new Error('No download URL returned');

            const title    = track.title || 'track';
            const duration = track.duration || '';

            let buf = await dlBuffer(dlUrl);
            buf     = await convertTo128kbps(buf);

            const banner = [
                `╔═|〔  SOUNDCLOUD 〕`,
                `║`,
                `║ ▸ *Track*   : ${title}`,
                duration ? `║ ▸ *Length*  : ${duration}` : null,
                `║ ▸ *Quality* : 128kbps`,
                `║ ▸ *Size*    : ${(buf.length / 1024 / 1024).toFixed(2)} MB`,
                `║`,
                `╚═╝`,
            ].filter(Boolean).join('\n');

            await sock.sendMessage(chatId, {
                document: buf,
                mimetype: 'audio/mpeg',
                fileName: `${title.replace(/[^\w\s-]/g, '').trim() || 'track'}.mp3`,
                caption: banner,
            }, { quoted: msg });

        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  SOUNDCLOUD 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═╝`
            }, { quoted: msg });
        }
    }
};
