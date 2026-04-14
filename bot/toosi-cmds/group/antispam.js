const fs   = require('fs');
const path = require('path');
const { getBotName } = require('../../lib/botname');

const CFG_FILE = path.join(__dirname, '../../data/antispam.json');

function loadCfg() {
    try { return JSON.parse(fs.readFileSync(CFG_FILE, 'utf8')); } catch { return {}; }
}
function saveCfg(d) {
    try { fs.writeFileSync(CFG_FILE, JSON.stringify(d, null, 2)); } catch {}
}


// Reset all groups to OFF on every bot startup
try {
    const _boot = loadCfg(); let _dirty = false;
    for (const id of Object.keys(_boot)) { if (_boot[id]?.enabled) { _boot[id].enabled = false; _dirty = true; } }
    if (_dirty) saveCfg(_boot);
} catch {}
const _tracker = new Map();

function isEnabled(gid) {
    return !!(loadCfg()[gid]?.enabled);
}

function getAction(gid) {
    return loadCfg()[gid]?.action || 'warn';
}

function checkSpam(senderJid, gid) {
    const cfg    = loadCfg();
    const gcfg   = cfg[gid];
    if (!gcfg?.enabled) return false;

    const limit  = gcfg.limit  || 5;
    const window = gcfg.window || 5000;
    const key    = `${gid}::${senderJid}`;
    const now    = Date.now();
    const t      = _tracker.get(key) || { count: 0, start: now };

    if (now - t.start > window) { t.count = 1; t.start = now; }
    else                         { t.count++; }
    _tracker.set(key, t);

    return t.count >= limit;
}

module.exports = {
    isEnabled,
    getAction,
    checkSpam,

    name:        'antispam',
    aliases:     ['aspam', 'spamprotect'],
    description: 'Spam protection — warn/kick spammers in groups',
    category:    'group',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();

        if (!ctx?.isOwnerUser && !ctx?.isSudoUser) {
            return sock.sendMessage(chatId, { text: `╔═|〔  ANTI SPAM 〕\n║\n║ ▸ *Status* : ❌ Owner only\n║\n╚═╝` }, { quoted: msg });
        }
        if (!chatId.endsWith('@g.us')) {
            return sock.sendMessage(chatId, { text: `╔═|〔  ANTI SPAM 〕\n║\n║ ▸ *Status* : ❌ Groups only\n║\n╚═╝` }, { quoted: msg });
        }

        const action = args[0]?.toLowerCase();
        const cfg    = loadCfg();
        const gcfg   = cfg[chatId] || { enabled: false, action: 'warn', limit: 5, window: 5000 };

        if (!action || action === 'status') {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  ANTI SPAM 〕\n║\n║ ▸ *State*  : ${gcfg.enabled ? '✅ ON' : '❌ OFF'}\n║ ▸ *Action* : ${gcfg.action}\n║ ▸ *Limit*  : ${gcfg.limit} msgs / ${gcfg.window/1000}s\n║ ▸ *Usage*  : ${prefix}antispam on/off/action/limit\n║\n╚═╝`
            }, { quoted: msg });
        }

        if (action === 'on')  { gcfg.enabled = true;  cfg[chatId] = gcfg; saveCfg(cfg); return sock.sendMessage(chatId, { text: `╔═|〔  ANTI SPAM 〕\n║\n║ ▸ *State* : ✅ Enabled\n║\n╚═╝` }, { quoted: msg }); }
        if (action === 'off') { gcfg.enabled = false; cfg[chatId] = gcfg; saveCfg(cfg); return sock.sendMessage(chatId, { text: `╔═|〔  ANTI SPAM 〕\n║\n║ ▸ *State* : ❌ Disabled\n║\n╚═╝` }, { quoted: msg }); }

        if (action === 'action' && args[1]) {
            const valid = ['warn', 'kick', 'delete'];
            if (!valid.includes(args[1])) return sock.sendMessage(chatId, { text: `╔═|〔  ANTI SPAM 〕\n║\n║ ▸ *Error* : Use warn / kick / delete\n║\n╚═╝` }, { quoted: msg });
            gcfg.action = args[1]; cfg[chatId] = gcfg; saveCfg(cfg);
            return sock.sendMessage(chatId, { text: `╔═|〔  ANTI SPAM 〕\n║\n║ ▸ *Action* : ${args[1]} saved\n║\n╚═╝` }, { quoted: msg });
        }

        if (action === 'limit' && args[1]) {
            const n = parseInt(args[1]);
            if (!n || n < 2) return sock.sendMessage(chatId, { text: `╔═|〔  ANTI SPAM 〕\n║\n║ ▸ *Error* : Minimum is 2\n║\n╚═╝` }, { quoted: msg });
            gcfg.limit = n; cfg[chatId] = gcfg; saveCfg(cfg);
            return sock.sendMessage(chatId, { text: `╔═|〔  ANTI SPAM 〕\n║\n║ ▸ *Limit* : ${n} msgs saved\n║\n╚═╝` }, { quoted: msg });
        }

        // unknown arg — ignore silently; only toggle when no arg given
        if (action) return;
        const now = !gcfg.enabled;
        gcfg.enabled = now; cfg[chatId] = gcfg; saveCfg(cfg);
        return sock.sendMessage(chatId, { text: `╔═|〔  ANTI SPAM 〕\n║\n║ ▸ *State* : ${now ? '✅ Enabled' : '❌ Disabled'}\n║\n╚═╝` }, { quoted: msg });
    }
};
