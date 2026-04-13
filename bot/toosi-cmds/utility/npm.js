const { casperGet } = require('../../lib/keithapi');
const { getBotName } = require('../../lib/botname');

module.exports = {
    name: 'npm',
    aliases: ['npminfo', 'npmsearch', 'package'],
    description: 'Search and get info about any NPM package',
    category: 'utility',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const query  = args.join(' ').trim();

        if (!query) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  NPM SEARCH 〕\n║\n║ ▸ *Usage* : ${prefix}npm <package-name>\n║ ▸ *Example* : ${prefix}npm express\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        try {
            await sock.sendMessage(chatId, { react: { text: '🔍', key: msg.key } });

            const data = await casperGet('/api/downloader/npm', { query });
            if (!data.success || !data.package) throw new Error(data.error || 'Package not found');

            const pkg = data.download;
            const latestVer = pkg.latestVersion || 'unknown';
            const desc = pkg.description || 'No description';
            const latest = pkg.versions?.[0];
            const tarball = latest?.tarball || '';
            const publishDate = latest?.publishDate ? new Date(latest.publishDate).toDateString() : 'N/A';
            const totalVersions = pkg.versions?.length || 0;

            const banner =
                `╔═|〔  📦 NPM PACKAGE 〕\n║\n` +
                `║ ▸ *Name*        : ${pkg.name || query}\n` +
                `║ ▸ *Description* : ${desc}\n` +
                `║ ▸ *Latest Ver*  : v${latestVer}\n` +
                `║ ▸ *Published*   : ${publishDate}\n` +
                `║ ▸ *Versions*    : ${totalVersions} available\n` +
                (tarball ? `║ ▸ *Tarball*     : ${tarball}\n` : '') +
                `║\n╚═|〔 ${name} 〕`;

            await sock.sendMessage(chatId, { text: banner }, { quoted: msg });

        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  NPM SEARCH 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};
