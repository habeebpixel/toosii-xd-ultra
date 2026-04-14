'use strict';

const { getBotName } = require('../../lib/botname');

const CHOICES  = ['rock', 'paper', 'scissors'];
const EMOJI    = { rock: '🪨', paper: '📄', scissors: '✂️' };
const BEATS    = { rock: 'scissors', paper: 'rock', scissors: 'paper' };

const TAUNTS_WIN  = ['🎉 You crushed me!', '😤 Well played!', '👏 You got lucky!', '🏆 Impressive!'];
const TAUNTS_LOSE = ['😈 Too easy!', '🤖 Bots never lose!', '💀 Get rekted!', '😂 Try again!'];
const TAUNTS_DRAW = ['🤝 Great minds think alike!', '😅 We\'re evenly matched!', '🔁 Spooky!'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

module.exports = {
    name: 'rps',
    aliases: ['rockpaperscissors', 'roshambo', 'janken', 'rpsls'],
    description: 'Play rock, paper, scissors vs the bot — .rps <rock/paper/scissors>',
    category: 'games',

    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const sender = (msg.key.participant || msg.key.remoteJid).split('@')[0].split(':')[0];

        const playerRaw = (args[0] || '').toLowerCase().trim();
        const player    = CHOICES.find(c => c.startsWith(playerRaw));

        if (!player) {
            return sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  ROCK PAPER SCISSORS ✂️ 〕`,
                    `║`,
                    `║ ▸ *Usage* : ${prefix}rps <choice>`,
                    `║ ▸ 🪨 ${prefix}rps rock`,
                    `║ ▸ 📄 ${prefix}rps paper`,
                    `║ ▸ ✂️ ${prefix}rps scissors`,
                    `║`,
                    `╚═╝`,
                ].join('\n')
            }, { quoted: msg });
        }

        const bot    = pick(CHOICES);
        const pEmoji = EMOJI[player];
        const bEmoji = EMOJI[bot];

        let result, taunt;
        if (player === bot) {
            result = '🤝 *DRAW!*';
            taunt  = pick(TAUNTS_DRAW);
        } else if (BEATS[player] === bot) {
            result = '🏆 *YOU WIN!*';
            taunt  = pick(TAUNTS_WIN);
        } else {
            result = '💀 *YOU LOSE!*';
            taunt  = pick(TAUNTS_LOSE);
        }

        await sock.sendMessage(chatId, {
            text: [
                `╔═|〔  ROCK PAPER SCISSORS ✂️ 〕`,
                `║`,
                `║ ▸ @${sender}  : ${pEmoji} *${player.toUpperCase()}*`,
                `║ ▸ ${name}  : ${bEmoji} *${bot.toUpperCase()}*`,
                `║`,
                `║ ▸ ${result}`,
                `║ ▸ ${taunt}`,
                `║`,
                `╚═╝`,
            ].join('\n'),
            mentions: [`${sender}@s.whatsapp.net`],
        }, { quoted: msg });
    }
};
