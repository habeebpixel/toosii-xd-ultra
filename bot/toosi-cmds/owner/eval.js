'use strict';

const { getBotName } = require('../../lib/botname');
const util = require('util');

module.exports = {
    name: 'eval',
    aliases: ['ev', '>'],
    description: 'Evaluate JavaScript code (owner only)',
    category: 'owner',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();

        if (!ctx.isOwner()) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  EVAL 〕\n║\n║ ▸ *Status* : ❌ Owner only\n║\n╚═╝`
            }, { quoted: msg });
        }

        const code = args.join(' ').trim();
        if (!code) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  EVAL 〕\n║\n║ ▸ *Usage* : ${prefix}eval <js code>\n║\n╚═╝`
            }, { quoted: msg });
        }

        try {
            // eslint-disable-next-line no-eval
            let result = eval(code);
            if (result instanceof Promise) result = await result;
            const output = util.inspect(result, { depth: 3, compact: true }).slice(0, 2000);

            await sock.sendMessage(chatId, {
                text: `╔═|〔  EVAL 〕\n║\n║ ▸ *Input*\n║ ${code.slice(0, 200)}\n║\n║ ▸ *Output*\n║ ${output}\n║\n╚═╝`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  EVAL 〕\n║\n║ ▸ *Error*\n║ ${e.message}\n║\n╚═╝`
            }, { quoted: msg });
        }
    }
};
