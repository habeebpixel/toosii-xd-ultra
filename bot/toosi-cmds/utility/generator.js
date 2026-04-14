'use strict';

const { getBotName } = require('../../lib/botname');

// ── Password Generator ────────────────────────────────────────────────────────
const CHARS = {
    lower:  'abcdefghijklmnopqrstuvwxyz',
    upper:  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    digits: '0123456789',
    symbol: '!@#$%^&*()-_=+[]{}|;:,.<>?',
};

function genPassword(len = 16, opts = {}) {
    const pool = [
        opts.lower  !== false ? CHARS.lower  : '',
        opts.upper  !== false ? CHARS.upper  : '',
        opts.digits !== false ? CHARS.digits : '',
        opts.symbol ? CHARS.symbol : '',
    ].join('');
    if (!pool) throw new Error('No character set selected');
    let pwd = '';
    for (let i = 0; i < len; i++) {
        pwd += pool[Math.floor(Math.random() * pool.length)];
    }
    return pwd;
}

// ── Age Calculator ────────────────────────────────────────────────────────────
function parseDate(str) {
    // Accept: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
    const parts = str.split(/[-/]/);
    if (parts.length !== 3) return null;
    let d, m, y;
    if (parts[0].length === 4) {
        [y, m, d] = parts.map(Number);
    } else {
        [d, m, y] = parts.map(Number);
    }
    const date = new Date(y, m - 1, d);
    if (isNaN(date.getTime())) return null;
    return date;
}

function calcAge(birth) {
    const now  = new Date();
    let years  = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    let days   = now.getDate() - birth.getDate();
    if (days < 0) { months--; days += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
    if (months < 0) { years--; months += 12; }
    const totalDays = Math.floor((now - birth) / 86400000);
    const next = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
    if (next < now) next.setFullYear(now.getFullYear() + 1);
    const daysToNext = Math.floor((next - now) / 86400000);
    return { years, months, days, totalDays, daysToNext };
}

// ── Countdown Calculator ──────────────────────────────────────────────────────
function calcCountdown(target) {
    const now  = new Date();
    const diff = target - now;
    if (diff < 0) return null;
    const totalDays  = Math.floor(diff / 86400000);
    const hours      = Math.floor((diff % 86400000) / 3600000);
    const minutes    = Math.floor((diff % 3600000) / 60000);
    const weeks      = Math.floor(totalDays / 7);
    const months     = Math.floor(totalDays / 30.44);
    return { totalDays, weeks, months, hours, minutes };
}

module.exports = [
    {
        name: 'password',
        aliases: ['genpass', 'generatepassword', 'passgen', 'makepassword', 'strongpass'],
        description: 'Generate a strong random password — .password [length] [+sym]',
        category: 'utility',

        async execute(sock, msg, args, prefix) {
            const chatId = msg.key.remoteJid;
            const name   = getBotName();
            try { await sock.sendMessage(chatId, { react: { text: '🔑', key: msg.key } }); } catch {}

            let len = parseInt(args[0]) || 16;
            if (len < 4)   len = 4;
            if (len > 128) len = 128;

            const withSym = args.join(' ').includes('+sym') || args.includes('sym') || args.includes('symbols');

            try {
                const pwd  = genPassword(len, { symbol: withSym });
                const pwd2 = genPassword(len, { symbol: withSym });
                const pwd3 = genPassword(len, { symbol: withSym });

                const strength = len >= 20 && withSym ? '🔒 Very Strong' :
                                 len >= 16             ? '💪 Strong'      :
                                 len >= 12             ? '👍 Good'        : '⚠️ Weak';

                await sock.sendMessage(chatId, {
                    text: [
                        `╔═|〔  PASSWORD GENERATOR 🔑 〕`,
                        `║`,
                        `║ ▸ *Length*   : ${len} characters`,
                        `║ ▸ *Symbols*  : ${withSym ? '✅ Yes' : '❌ No (add +sym to include)'}`,
                        `║ ▸ *Strength* : ${strength}`,
                        `║`,
                        `║ 🔑 Option 1:`,
                        `║ \`${pwd}\``,
                        `║`,
                        `║ 🔑 Option 2:`,
                        `║ \`${pwd2}\``,
                        `║`,
                        `║ 🔑 Option 3:`,
                        `║ \`${pwd3}\``,
                        `║`,
                        `║ 💡 ${prefix}password 24 +sym — 24 chars with symbols`,
                        `║`,
                        `╚═╝`,
                    ].join('\n')
                }, { quoted: msg });

            } catch (e) {
                await sock.sendMessage(chatId, {
                    text: `╔═|〔  PASSWORD GEN 〕\n║\n║ ▸ *Status* : ❌ ${e.message}\n║\n╚═╝`
                }, { quoted: msg });
            }
        }
    },

    {
        name: 'coinflip',
        aliases: ['flipcoin', 'flip', 'headsortails', 'toss'],
        description: 'Flip a coin — .coinflip',
        category: 'utility',

        async execute(sock, msg, args, prefix) {
            const chatId  = msg.key.remoteJid;
            const name    = getBotName();
            const sender  = (msg.key.participant || msg.key.remoteJid).split('@')[0].split(':')[0];
            const result  = Math.random() < 0.5 ? '🪙 HEADS' : '🪙 TAILS';
            const streak  = Math.random() < 0.1 ? '\n║ ▸ 🎯 *Lucky flip!*' : '';

            await sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  COIN FLIP 🪙 〕`,
                    `║`,
                    `║ ▸ *Flipped by* : @${sender}`,
                    `║`,
                    `║ ▸ *Result*     : *${result}*${streak}`,
                    `║`,
                    `╚═╝`,
                ].join('\n'),
                mentions: [`${sender}@s.whatsapp.net`],
            }, { quoted: msg });
        }
    },

    {
        name: 'age',
        aliases: ['howold', 'birthday', 'calcage', 'myage', 'agecheck'],
        description: 'Calculate age from a birthdate — .age DD/MM/YYYY',
        category: 'utility',

        async execute(sock, msg, args, prefix) {
            const chatId = msg.key.remoteJid;
            const name   = getBotName();
            const input  = args[0]?.trim();

            if (!input) {
                return sock.sendMessage(chatId, {
                    text: [
                        `╔═|〔  AGE CALCULATOR 🎂 〕`,
                        `║`,
                        `║ ▸ *Usage*   : ${prefix}age DD/MM/YYYY`,
                        `║ ▸ *Example* : ${prefix}age 15/08/2000`,
                        `║ ▸ *Example* : ${prefix}age 1990-06-01`,
                        `║`,
                        `╚═╝`,
                    ].join('\n')
                }, { quoted: msg });
            }

            const birth = parseDate(input);
            if (!birth || birth > new Date()) {
                return sock.sendMessage(chatId, {
                    text: `╔═|〔  AGE CALCULATOR 〕\n║\n║ ▸ *Status* : ❌ Invalid date\n║ ▸ *Format* : DD/MM/YYYY or YYYY-MM-DD\n║\n╚═╝`
                }, { quoted: msg });
            }

            const { years, months, days, totalDays, daysToNext } = calcAge(birth);
            const zodiac = getZodiac(birth);

            await sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  AGE CALCULATOR 🎂 〕`,
                    `║`,
                    `║ ▸ *Birthdate* : ${birth.toDateString()}`,
                    `║`,
                    `║ ▸ *Age*       : ${years} years, ${months} months, ${days} days`,
                    `║ ▸ *In days*   : ${totalDays.toLocaleString()} days lived`,
                    `║ ▸ *Zodiac*    : ${zodiac}`,
                    `║`,
                    `║ ▸ *Next Bday* : in ${daysToNext} day${daysToNext !== 1 ? 's' : ''}${daysToNext === 0 ? ' 🎉 TODAY!' : ''}`,
                    `║`,
                    `╚═╝`,
                ].join('\n')
            }, { quoted: msg });
        }
    },

    {
        name: 'countdown',
        aliases: ['daysleft', 'daysuntil', 'countdownto', 'timer', 'dayscount'],
        description: 'Count days until a future date — .countdown DD/MM/YYYY',
        category: 'utility',

        async execute(sock, msg, args, prefix) {
            const chatId = msg.key.remoteJid;
            const name   = getBotName();
            const input  = args[0]?.trim();

            if (!input) {
                return sock.sendMessage(chatId, {
                    text: [
                        `╔═|〔  COUNTDOWN ⏳ 〕`,
                        `║`,
                        `║ ▸ *Usage*   : ${prefix}countdown DD/MM/YYYY`,
                        `║ ▸ *Example* : ${prefix}countdown 25/12/2026`,
                        `║ ▸ *Example* : ${prefix}countdown 2026-01-01`,
                        `║`,
                        `╚═╝`,
                    ].join('\n')
                }, { quoted: msg });
            }

            const target = parseDate(input);
            if (!target) {
                return sock.sendMessage(chatId, {
                    text: `╔═|〔  COUNTDOWN 〕\n║\n║ ▸ *Status* : ❌ Invalid date\n║ ▸ *Format* : DD/MM/YYYY or YYYY-MM-DD\n║\n╚═╝`
                }, { quoted: msg });
            }

            const cd = calcCountdown(target);
            if (!cd) {
                return sock.sendMessage(chatId, {
                    text: `╔═|〔  COUNTDOWN 〕\n║\n║ ▸ *Status* : ❌ That date has already passed!\n║\n╚═╝`
                }, { quoted: msg });
            }

            await sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  COUNTDOWN ⏳ 〕`,
                    `║`,
                    `║ ▸ *Target Date* : ${target.toDateString()}`,
                    `║`,
                    `║ ▸ *Days left*   : ${cd.totalDays.toLocaleString()} days`,
                    `║ ▸ *Weeks*       : ~${cd.weeks} weeks`,
                    `║ ▸ *Months*      : ~${cd.months} months`,
                    `║ ▸ *Hours*       : +${cd.hours}h ${cd.minutes}m today`,
                    `║`,
                    cd.totalDays === 0 ? `║ 🎉 *TODAY IS THE DAY!*` : null,
                    cd.totalDays <= 7  ? `║ 🔥 Less than a week away!` : null,
                    `║`,
                    `╚═╝`,
                ].filter(Boolean).join('\n')
            }, { quoted: msg });
        }
    }
];

function getZodiac(date) {
    const m = date.getMonth() + 1;
    const d = date.getDate();
    if ((m === 3 && d >= 21) || (m === 4 && d <= 19)) return '♈ Aries';
    if ((m === 4 && d >= 20) || (m === 5 && d <= 20)) return '♉ Taurus';
    if ((m === 5 && d >= 21) || (m === 6 && d <= 20)) return '♊ Gemini';
    if ((m === 6 && d >= 21) || (m === 7 && d <= 22)) return '♋ Cancer';
    if ((m === 7 && d >= 23) || (m === 8 && d <= 22)) return '♌ Leo';
    if ((m === 8 && d >= 23) || (m === 9 && d <= 22)) return '♍ Virgo';
    if ((m === 9 && d >= 23) || (m === 10 && d <= 22)) return '♎ Libra';
    if ((m === 10 && d >= 23) || (m === 11 && d <= 21)) return '♏ Scorpio';
    if ((m === 11 && d >= 22) || (m === 12 && d <= 21)) return '♐ Sagittarius';
    if ((m === 12 && d >= 22) || (m === 1 && d <= 19)) return '♑ Capricorn';
    if ((m === 1 && d >= 20) || (m === 2 && d <= 18)) return '♒ Aquarius';
    return '♓ Pisces';
}
