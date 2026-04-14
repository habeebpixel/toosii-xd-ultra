'use strict';
  const fs   = require('fs');
  const path = require('path');
  const { registerBotDelete } = require('../../lib/bot-delete-guard');

  const CFG_FILE = path.join(__dirname, '../../data/wordfilter.json');
  function loadCfg()  { try { return JSON.parse(fs.readFileSync(CFG_FILE, 'utf8')); } catch { return {}; } }
  function saveCfg(d) { try { fs.mkdirSync(path.dirname(CFG_FILE), { recursive: true }); fs.writeFileSync(CFG_FILE, JSON.stringify(d, null, 2)); } catch {} }
  function defaultG() { return { enabled: false, words: [] }; }

  // Reset all groups to OFF on every bot startup
  try {
      const _b = loadCfg(); let _c = false;
      for (const id of Object.keys(_b)) { if (_b[id]?.enabled) { _b[id].enabled = false; _c = true; } }
      if (_c) saveCfg(_b);
  } catch {}

  const _wfReg = new WeakSet();
  function setupWordFilterListener(sock) {
      if (_wfReg.has(sock)) return;
      _wfReg.add(sock);
      const startedAt = Math.floor(Date.now() / 1000);
      sock.ev.on('messages.upsert', async ({ messages }) => {
          for (const msg of messages) {
              if (!msg.message || msg.key.fromMe) continue;
              const ts = Number(msg.messageTimestamp || 0);
              if (ts && ts < startedAt - 5) continue;
              const chatId = msg.key.remoteJid;
              if (!chatId?.endsWith('@g.us')) continue;
              const gcfg = loadCfg()[chatId];
              if (!gcfg?.enabled || !gcfg.words?.length) continue;
              const text = (msg.message?.conversation ||
                            msg.message?.extendedTextMessage?.text ||
                            msg.message?.imageMessage?.caption ||
                            msg.message?.videoMessage?.caption || '').toLowerCase();
              if (!text) continue;
              const hit = gcfg.words.find(w => text.includes(w.toLowerCase()));
              if (!hit) continue;
              registerBotDelete(msg.key.id);
              try { await sock.sendMessage(chatId, { delete: msg.key }); } catch {}
              await sock.sendMessage(chatId, { text: `╔═|〔  WORD FILTER 〕\n║\n║ ▸ *Action* : 🗑️ Message deleted\n║ ▸ *Reason* : Banned word detected\n║\n╚═╝` });
          }
      });
  }

  module.exports = {
      setupWordFilterListener,
      name: 'wordfilter', aliases: ['wfilter','badword','antiword'],
      description: 'Auto-delete messages containing banned words (per group)',
      category: 'group',
      async execute(sock, msg, args, prefix, ctx) {
          const chatId = msg.key.remoteJid;
          if (!chatId?.endsWith('@g.us')) return sock.sendMessage(chatId, { text: `╔═|〔  WORD FILTER 〕\n║\n║ ▸ Groups only\n║\n╚═╝` }, { quoted: msg });
          if (!ctx?.isOwnerUser && !ctx?.isSudoUser && !ctx?.isGroupAdmin)
              return sock.sendMessage(chatId, { text: `╔═|〔  WORD FILTER 〕\n║\n║ ▸ Admins/Owner only\n║\n╚═╝` }, { quoted: msg });
          const cfg  = loadCfg();
          const gcfg = Object.assign(defaultG(), cfg[chatId] || {});
          const save = () => { cfg[chatId] = gcfg; saveCfg(cfg); };
          const sub  = args[0]?.toLowerCase();
          if (!sub || sub === 'status') {
              return sock.sendMessage(chatId, { text: [`╔═|〔  WORD FILTER 〕`,`║`,`║ ▸ *State* : ${gcfg.enabled ? '✅ ON' : '❌ OFF'}`,`║ ▸ *Words* : ${gcfg.words.length ? gcfg.words.join(', ') : 'none'}`,`║`,`║ ▸ *Usage*:`,`║   ${prefix}wordfilter on/off`,`║   ${prefix}wordfilter add <word>`,`║   ${prefix}wordfilter remove <word>`,`║   ${prefix}wordfilter list`,`║   ${prefix}wordfilter clear`,`║`,`╚═╝`].join('\n') }, { quoted: msg });
          }
          if (sub === 'on' ) { gcfg.enabled = true;  save(); return sock.sendMessage(chatId, { text: `╔═|〔  WORD FILTER 〕\n║\n║ ▸ *State* : ✅ Enabled\n║\n╚═╝` }, { quoted: msg }); }
          if (sub === 'off') { gcfg.enabled = false; save(); return sock.sendMessage(chatId, { text: `╔═|〔  WORD FILTER 〕\n║\n║ ▸ *State* : ❌ Disabled\n║\n╚═╝` }, { quoted: msg }); }
          if (sub === 'list') { return sock.sendMessage(chatId, { text: `╔═|〔  WORD FILTER 〕\n║\n║ ▸ *Banned words* (${gcfg.words.length}):\n${gcfg.words.map(w=>`║   • ${w}`).join('\n') || '║   none'}\n║\n╚═╝` }, { quoted: msg }); }
          if (sub === 'clear') { gcfg.words = []; save(); return sock.sendMessage(chatId, { text: `╔═|〔  WORD FILTER 〕\n║\n║ ▸ ✅ All words cleared\n║\n╚═╝` }, { quoted: msg }); }
          if (sub === 'add') {
              const word = args.slice(1).join(' ').toLowerCase().trim();
              if (!word) return sock.sendMessage(chatId, { text: `╔═|〔  WORD FILTER 〕\n║\n║ ▸ Usage: ${prefix}wordfilter add <word>\n║\n╚═╝` }, { quoted: msg });
              if (gcfg.words.includes(word)) return sock.sendMessage(chatId, { text: `╔═|〔  WORD FILTER 〕\n║\n║ ▸ ⚠️ Already in list\n║\n╚═╝` }, { quoted: msg });
              gcfg.words.push(word); save();
              return sock.sendMessage(chatId, { text: `╔═|〔  WORD FILTER 〕\n║\n║ ▸ ✅ Added: "${word}"\n║ ▸ *Total* : ${gcfg.words.length}\n║\n╚═╝` }, { quoted: msg });
          }
          if (sub === 'remove' || sub === 'del') {
              const word = args.slice(1).join(' ').toLowerCase().trim();
              const i = gcfg.words.indexOf(word);
              if (i === -1) return sock.sendMessage(chatId, { text: `╔═|〔  WORD FILTER 〕\n║\n║ ▸ ⚠️ Not in list\n║\n╚═╝` }, { quoted: msg });
              gcfg.words.splice(i, 1); save();
              return sock.sendMessage(chatId, { text: `╔═|〔  WORD FILTER 〕\n║\n║ ▸ ✅ Removed: "${word}"\n║\n╚═╝` }, { quoted: msg });
          }
      }
  };