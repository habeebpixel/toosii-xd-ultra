'use strict';

const { get, set } = require('../../lib/autoconfig');
const { getBotName } = require('../../lib/botname');

// ── Default emoji burst ───────────────────────────────────────────────────────
const DEFAULT_EMOJIS = ['🔥', '❤️', '😍', '👏', '💯', '🎉', '🌟', '🤩'];

// ── Config helpers ────────────────────────────────────────────────────────────
function getCfg() {
    const c = get('channelreact');
    return {
        enabled   : c?.enabled    ?? true,
        emojis    : Array.isArray(c?.emojis) && c.emojis.length ? c.emojis : [...DEFAULT_EMOJIS],
        extraJids : Array.isArray(c?.extraJids) ? c.extraJids : [],
    };
}
function saveCfg(patch) {
    set('channelreact', Object.assign(getCfg(), patch));
}

// ── Runtime registry (populated at connect from AUTO_CHANNELS) ────────────────
const _registeredJids = new Set();

const channelReactManager = {
    isEnabled            : ()    => getCfg().enabled,
    registerNewsletter   : (jid) => { if (jid) _registeredJids.add(jid); },
    unregisterNewsletter : (jid) => { _registeredJids.delete(jid); },
    list                 : ()    => [..._registeredJids],
};

// ── Dedupe guard (avoid double-reacting to the same message ID) ───────────────
const _reacted = new Set();
function _markReacted(id) {
    _reacted.add(id);
    // Keep set bounded
    if (_reacted.size > 500) {
        const it = _reacted.values(); it.next(); _reacted.delete(it.next().value);
    }
}

// ── Core handler (called by index.js on every @newsletter message) ────────────
async function handleChannelReact(sock, msg) {
    try {
        const cfg = getCfg();
        if (!cfg.enabled) return;

        const remoteJid = msg.key?.remoteJid;
        if (!remoteJid?.endsWith('@newsletter')) return;

        // Build watched set: AUTO_CHANNELS + extra JIDs + owner's own channel
        const ownerJid = process.env.NEWSLETTER_JID;
        const watched  = new Set([
            ..._registeredJids,
            ...cfg.extraJids,
            ...(ownerJid ? [ownerJid] : []),
        ]);
        if (!watched.has(remoteJid)) return;

        // Dedupe
        const msgId = msg.key?.id;
        if (!msgId || _reacted.has(msgId)) return;
        _markReacted(msgId);

        // Emoji burst — each emoji replaces the previous reaction on the post.
        // The last emoji is what remains as the final visible reaction.
        const emojis = cfg.emojis;
        for (let i = 0; i < emojis.length; i++) {
            await new Promise(r => setTimeout(r, i === 0 ? 600 : 350));
            await sock.sendMessage(remoteJid, {
                react: { text: emojis[i], key: msg.key }
            });
        }
    } catch {}
}

// ── Placeholder (not actively used) ──────────────────────────────────────────
async function discoverNewsletters(sock) {}

// ── Command ───────────────────────────────────────────────────────────────────
module.exports = {
    handleChannelReact,
    discoverNewsletters,
    channelReactManager,

    name       : 'channelreact',
    aliases    : ['cr', 'chanreact', 'chreact'],
    description: 'Auto-react with a burst of emojis on every channel post',
    category   : 'automation',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();

        if (!ctx?.isOwnerUser && !ctx?.isSudoUser) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  CHANNEL REACT 〕\n║\n║ ▸ *Status* : ❌ Owner only\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        const sub = args[0]?.toLowerCase();
        const cfg = getCfg();

        // ── status / no args ──────────────────────────────────────────────────
        if (!sub || sub === 'status') {
            const ownerJid = process.env.NEWSLETTER_JID || '(not resolved yet)';
            const watched  = [...new Set([
                ..._registeredJids,
                ...cfg.extraJids,
                ...(process.env.NEWSLETTER_JID ? [process.env.NEWSLETTER_JID] : []),
            ])];
            return sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  CHANNEL AUTO-REACT 〕`,
                    `║`,
                    `║ ▸ *State*    : ${cfg.enabled ? '✅ ON' : '❌ OFF'}`,
                    `║ ▸ *Emojis*   : ${cfg.emojis.join(' ')}`,
                    `║ ▸ *Channels* : ${watched.length} watched`,
                    `║ ▸ *Owner ch* : ...${ownerJid.slice(-20)}`,
                    `║`,
                    `║ ▸ *Commands* :`,
                    `║   ${prefix}cr on / off`,
                    `║   ${prefix}cr emojis 🔥 ❤️ 👏 💯`,
                    `║   ${prefix}cr reset`,
                    `║   ${prefix}cr add <newsletter-jid>`,
                    `║   ${prefix}cr remove <newsletter-jid>`,
                    `║`,
                    `╚═|〔 ${name} 〕`,
                ].join('\n')
            }, { quoted: msg });
        }

        // ── on / off ──────────────────────────────────────────────────────────
        if (sub === 'on' || sub === 'off') {
            saveCfg({ enabled: sub === 'on' });
            return sock.sendMessage(chatId, {
                text: `╔═|〔  CHANNEL AUTO-REACT 〕\n║\n║ ▸ *State* : ${sub === 'on' ? '✅ Enabled' : '❌ Disabled'}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        // ── emojis 🔥 ❤️ 👏 ──────────────────────────────────────────────────
        if (sub === 'emojis' || sub === 'emoji') {
            const list = args.slice(1).filter(Boolean);
            if (!list.length) {
                return sock.sendMessage(chatId, {
                    text: `╔═|〔  CHANNEL AUTO-REACT 〕\n║\n║ ▸ *Usage* : ${prefix}cr emojis 🔥 ❤️ 😍 👏\n║\n╚═|〔 ${name} 〕`
                }, { quoted: msg });
            }
            saveCfg({ emojis: list });
            return sock.sendMessage(chatId, {
                text: `╔═|〔  CHANNEL AUTO-REACT 〕\n║\n║ ▸ *Emojis set* : ${list.join(' ')}\n║ ▸ All of these burst on each post\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        // ── reset ─────────────────────────────────────────────────────────────
        if (sub === 'reset') {
            saveCfg({ emojis: [...DEFAULT_EMOJIS], enabled: true, extraJids: [] });
            return sock.sendMessage(chatId, {
                text: `╔═|〔  CHANNEL AUTO-REACT 〕\n║\n║ ▸ *Reset*  : ✅ Defaults restored\n║ ▸ *Emojis* : ${DEFAULT_EMOJIS.join(' ')}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        // ── add <jid> ─────────────────────────────────────────────────────────
        if (sub === 'add') {
            const jid = args[1]?.trim();
            if (!jid?.endsWith('@newsletter')) {
                return sock.sendMessage(chatId, {
                    text: `╔═|〔  CHANNEL AUTO-REACT 〕\n║\n║ ▸ *Error* : JID must end with @newsletter\n║ ▸ *Usage* : ${prefix}cr add 12345@newsletter\n║\n╚═|〔 ${name} 〕`
                }, { quoted: msg });
            }
            saveCfg({ extraJids: [...new Set([...cfg.extraJids, jid])] });
            channelReactManager.registerNewsletter(jid);
            return sock.sendMessage(chatId, {
                text: `╔═|〔  CHANNEL AUTO-REACT 〕\n║\n║ ▸ *Added channel* : ${jid}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        // ── remove <jid> ──────────────────────────────────────────────────────
        if (sub === 'remove' || sub === 'rm') {
            const jid = args[1]?.trim();
            saveCfg({ extraJids: cfg.extraJids.filter(j => j !== jid) });
            channelReactManager.unregisterNewsletter(jid);
            return sock.sendMessage(chatId, {
                text: `╔═|〔  CHANNEL AUTO-REACT 〕\n║\n║ ▸ *Removed* : ${jid || '(none)'}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};
