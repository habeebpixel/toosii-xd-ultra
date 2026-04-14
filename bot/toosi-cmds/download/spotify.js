const { casperGet, keithGet, dlBuffer, convertTo128kbps } = require('../../lib/keithapi');
const { getBotName } = require('../../lib/botname');

module.exports = {
    name: 'spotify',
    aliases: ['sp', 'spotifydl'],
    description: 'Download Spotify track as MP3',
    category: 'download',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const url    = args[0];

        if (!url) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  SPOTIFY 〕\n║\n║ ▸ *Usage* : ${prefix}spotify <track_url>\n║\n╚═╝`
            }, { quoted: msg });
        }

        try {
            let buf, title, quality;

            // Try all active Casper Spotify endpoints in order
            const SPOTIFY_PATHS = [
                '/api/downloader/spotify',
                '/api/downloader/spotify2',
                '/api/downloader/spotify3',
            ];
            let casperOk = false;
            for (const path of SPOTIFY_PATHS) {
                try {
                    const data = await casperGet(path, { url });
                    if (!data.success) continue;
                    const dlUrl = data.download?.url;
                    if (!dlUrl) continue;
                    title   = `${data.track?.title || 'track'} - ${data.track?.artist || ''}`.trim().replace(/\s*-\s*$/, '');
                    quality = data.download?.quality || data.download?.format || 'HQ';
                    buf     = await dlBuffer(dlUrl);
                    casperOk = true;
                    break;
                } catch {}
            }

            // Try sportify / sportify2 (different response shape)
            if (!casperOk) {
                for (const path of ['/api/downloader/sportify', '/api/downloader/sportify2']) {
                    try {
                        const data = await casperGet(path, { url });
                        if (!data.success) continue;
                        const dlUrl = data.track?.download_url || data.track?.url || data.track?.mp3_url;
                        if (!dlUrl) continue;
                        title   = `${data.track?.title || 'track'} - ${data.track?.artist || ''}`.trim().replace(/\s*-\s*$/, '');
                        quality = data.track?.quality || '128kbps';
                        buf     = await dlBuffer(dlUrl);
                        casperOk = true;
                        break;
                    } catch {}
                }
            }

            if (!casperOk) {
                const data2 = await keithGet('/download/spotify', { url });
                if (!data2.status) throw new Error(data2.error || 'fallback failed');
                const dlUrl2 = data2.result?.url || data2.result;
                if (!dlUrl2) throw new Error('No fallback URL');
                buf     = await dlBuffer(dlUrl2);
                buf     = await convertTo128kbps(buf);
                title   = 'track';
                quality = '128kbps';
            }

            const banner = `╔═|〔  SPOTIFY 〕\n║\n║ ▸ *Track*   : ${title}\n║ ▸ *Quality* : ${quality}\n║ ▸ *Size*    : ${(buf.length/1024/1024).toFixed(2)} MB\n║\n╚═╝`;
            await sock.sendMessage(chatId, { document: buf, mimetype: 'audio/mpeg', fileName: `${title}.mp3`, caption: banner }, { quoted: msg });

        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  SPOTIFY 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═╝`
            }, { quoted: msg });
        }
    }
};
