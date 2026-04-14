'use strict';

const { getBotName }            = require('../../lib/botname');
const { isEnabled, setEnabled, listEnabled } = require('../../lib/chatbot-store');

// ── Pollinations AI ──────────────────────────────────────────────────────────
const BOT_PERSONA = `You are Toosii AI — a smart, friendly WhatsApp assistant created by TOOSII-XD. 
Keep replies concise and conversational (1-4 sentences max unless the user clearly wants detail).
Never reveal you are powered by an external AI. You are simply Toosii AI.`;

async function pollinationsReply(userText, timeoutMs = 25000) {
    const prompt = encodeURIComponent(`${BOT_PERSONA}\n\nUser: ${userText}\nToosii AI:`);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(`https://text.pollinations.ai/${prompt}?model=openai`, {
            signal: controller.signal,
            headers: { 'User-Agent': 'ToosiiBot/1.0', Accept: 'text/plain,*/*' }
        });
        if (!res.ok) throw new Error(`AI HTTP ${res.status}`);
        const text = (await res.text()).trim();
        if (!text) throw new Error('Empty AI response');
        return text;
    } finally { clearTimeout(timer); }
}

// ── Rate limiter — 1 AI reply per chat per 5s ─────────────────────────────────
const _lastReply = new Map(); // chatId → timestamp
function isRateLimited(chatId) {
    const last = _lastReply.get(chatId) || 0;
    if (Date.now() - last < 5000) return true;
    _lastReply.set(chatId, Date.now());
    return false;
}

// ── Exported for index.js hook ───────────────────────────────────────────────
function isChatbotActiveForChat(chatId) {
    return isEnabled(chatId);
}

async function handleChatbotMessage(sock, msg) {
    const chatId = msg.key.remoteJid;
    if (!isEnabled(chatId)) return;
    if (isRateLimited(chatId)) return;

    const m = msg.message;
    if (!m) return;
    const text = (
        m.conversation ||
        m.extendedTextMessage?.text ||
        m.imageMessage?.caption ||
        m.videoMessage?.caption ||
        ''
    ).trim();
    if (!text) return;

    try {
        await sock.sendMessage(chatId, { react: { text: '🤖', key: msg.key } });
        const reply = await pollinationsReply(text);
        const name = getBotName();
        await sock.sendMessage(chatId, {
            text: `╔═|〔  🤖 TOOSII AI 〕\n║\n║ ${reply}\n║\n╚═|〔 ${name} 〕`
        }, { quoted: msg });
    } catch {
        // silent — chatbot failure should not spam the chat
    }
}

// ── .chatbot command ─────────────────────────────────────────────────────────
function isAdmin(sock, msg, chatId) {
    // In DMs anyone can toggle their own chat
    if (!chatId.endsWith('@g.us')) return true;
    // In groups: only group admins or owner
    const senderJid = msg.key.participant || msg.key.remoteJid;
    const participants = sock._lastGroupMetadata?.[chatId]?.participants || [];
    return participants.some(p =>
        (p.id === senderJid || p.id?.split(':')[0] + '@s.whatsapp.net' === senderJid) &&
        (p.admin === 'admin' || p.admin === 'superadmin')
    );
}

module.exports = [
    // ── Main chatbot command ──────────────────────────────────────────────────
    {
        name: 'chatbot',
        aliases: ['cb', 'autoai', 'autoreply'],
        description: 'Toggle Toosii AI auto-reply for this chat — .chatbot on|off|status',
        category: 'ai',

        async execute(sock, msg, args, prefix) {
            const chatId  = msg.key.remoteJid;
            const isGroup = chatId.endsWith('@g.us');
            const name    = getBotName();
            const sub     = (args[0] || '').toLowerCase();

            const H = `╔═|〔  🤖 CHATBOT 〕`;
            const F = `╚═|〔 ${name} 〕`;
            const SEP = '║';

            // status / no args
            if (!sub || sub === 'status') {
                const state = isEnabled(chatId) ? '✅ *ON*' : '❌ *OFF*';
                const scope = isGroup ? 'this group' : 'this DM';
                return sock.sendMessage(chatId, {
                    text: `${H}\n${SEP}\n${SEP} ▸ *Chat*   : ${scope}\n${SEP} ▸ *Status* : ${state}\n${SEP}\n${SEP} ▸ _Use_ \`${prefix}chatbot on\` _or_ \`${prefix}chatbot off\`\n${SEP}\n${F}`
                }, { quoted: msg });
            }

            if (sub === 'on') {
                setEnabled(chatId, true);
                const scope = isGroup ? 'This group' : 'This DM';
                return sock.sendMessage(chatId, {
                    text: `${H}\n${SEP}\n${SEP} ▸ *Status*  : ✅ Enabled\n${SEP} ▸ *Scope*   : ${scope}\n${SEP} ▸ *Mode*    : Toosii AI replies to every message\n${SEP} ▸ _Type_ \`${prefix}chatbot off\` _to disable_\n${SEP}\n${F}`
                }, { quoted: msg });
            }

            if (sub === 'off') {
                setEnabled(chatId, false);
                const scope = isGroup ? 'This group' : 'This DM';
                return sock.sendMessage(chatId, {
                    text: `${H}\n${SEP}\n${SEP} ▸ *Status* : ❌ Disabled\n${SEP} ▸ *Scope*  : ${scope}\n${SEP}\n${F}`
                }, { quoted: msg });
            }

            // unknown subcommand
            return sock.sendMessage(chatId, {
                text: `${H}\n${SEP}\n${SEP} ▸ *Usage*  : ${prefix}chatbot on|off|status\n${SEP} ▸ Works in DMs and groups independently\n${SEP}\n${F}`
            }, { quoted: msg });
        }
    }
];

module.exports.isChatbotActiveForChat = isChatbotActiveForChat;
module.exports.handleChatbotMessage   = handleChatbotMessage;
