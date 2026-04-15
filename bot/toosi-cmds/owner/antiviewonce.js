'use strict';

  const fs   = require('fs');
  const path = require('path');
  const db   = require('../../lib/database');

  const CONFIG_DIR  = path.join(__dirname, '../../data/antiviewonce');
  const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

  function loadCfg() {
      try {
          if (fs.existsSync(CONFIG_FILE))
              return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      } catch {}
      return { mode: 'private', enabled: false, autoSave: true, ownerJid: '', maxHistory: 500 };
  }

  function saveCfg(cfg) {
      try {
          if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
          fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
      } catch {}
      db.setConfig('antiviewonce_config', cfg).catch(() => {});
      // Update index.js live cache if exposed
      if (typeof globalThis._saveAntiViewOnceConfig === 'function')
          globalThis._saveAntiViewOnceConfig(cfg);
  }

  module.exports = {
      name:        'antiviewonce',
      aliases:     ['avoc', 'antiviewonce', 'antivo'],
      description: 'Control auto-capture of view-once messages',
      category:    'owner',
      ownerOnly:   true,
      sudoAllowed: true,

      async execute(sock, msg, args, prefix, ctx) {
          const chatId = msg.key.remoteJid;

          if (!ctx?.isOwnerUser && !ctx?.isSudoUser)
              return sock.sendMessage(chatId, {
                  text: `╔═|〔  ANTI VIEW ONCE 〕\n║\n║ ▸ ❌ Owner/sudo only\n║\n╚═╝`
              }, { quoted: msg });

          const sub  = (args[0] || '').toLowerCase().trim();
          const sub2 = (args[1] || '').toLowerCase().trim();
          const cfg  = loadCfg();

          const icon = v => v ? '✅ ON' : '❌ OFF';
          const H = '╔═|〔  ANTI VIEW ONCE 〕';
          const F = '╚═╝';

          // ── status (no args) ──────────────────────────────────────────────
          if (!sub || sub === 'status') {
              const isEnabled = cfg.gc ? (cfg.gc?.enabled || cfg.pm?.enabled) : !!cfg.enabled;
              const mode      = cfg.gc ? `Group:${cfg.gc?.mode||'private'} / DM:${cfg.pm?.mode||'private'}` : (cfg.mode || 'private');
              return sock.sendMessage(chatId, {
                  text: [
                      H, `║`,
                      `║ ▸ *Auto-Capture* : ${icon(isEnabled)}`,
                      `║ ▸ *Delivery Mode*: ${mode}`,
                      `║`,
                      `║ ▸ *Usage*:`,
                      `║   ${prefix}antiviewonce on       → auto-capture ON`,
                      `║   ${prefix}antiviewonce off      → auto-capture OFF`,
                      `║   ${prefix}antiviewonce mode private  → send to your DM only`,
                      `║   ${prefix}antiviewonce mode chat     → post back in group`,
                      `║   ${prefix}antiviewonce mode both     → DM + group`,
                      `║`,
                      `║ ▸ *Tip* : Use ${prefix}vv to manually reveal`,
                      `║           any view-once by replying to it`,
                      `║`, F
                  ].join('\n')
              }, { quoted: msg });
          }

          // ── on / off ──────────────────────────────────────────────────────
          if (sub === 'on' || sub === 'off') {
              const enabled = sub === 'on';
              // Flatten back to legacy format (always works with loadAntiViewOnceConfig)
              const newCfg = {
                  mode:       enabled ? (cfg.mode === 'off' ? 'private' : (cfg.mode || 'private')) : 'off',
                  enabled,
                  autoSave:   cfg.autoSave !== false,
                  ownerJid:   cfg.ownerJid || '',
                  maxHistory: cfg.maxHistory || 500,
              };
              saveCfg(newCfg);
              return sock.sendMessage(chatId, {
                  text: [
                      H, `║`,
                      `║ ▸ *Auto-Capture* : ${icon(enabled)}`,
                      enabled
                          ? `║ ▸ *Mode* : ${newCfg.mode} — view-once sent to your DM`
                          : `║ ▸ *Effect* : Bot will no longer auto-capture`,
                      `║ ▸ *Manual* : ${prefix}vv still works when you reply`,
                      `║`, F
                  ].join('\n')
              }, { quoted: msg });
          }

          // ── mode <private|chat|both> ───────────────────────────────────────
          if (sub === 'mode') {
              const allowed = ['private', 'chat', 'both'];
              if (!allowed.includes(sub2))
                  return sock.sendMessage(chatId, {
                      text: `${H}\n║\n║ ▸ *Modes*: private │ chat │ both\n║   private = sends only to your DM\n║   chat    = posts back in group (⚠️ public)\n║   both    = DM + group\n║\n${F}`
                  }, { quoted: msg });

              const newCfg = { ...cfg, mode: sub2, enabled: cfg.enabled !== false };
              saveCfg(newCfg);
              const warn = sub2 === 'chat' || sub2 === 'both' ? '\n║ ▸ ⚠️ All group members will see captured media' : '';
              return sock.sendMessage(chatId, {
                  text: `${H}\n║\n║ ▸ *Mode* : ${sub2}${warn}\n║\n${F}`
              }, { quoted: msg });
          }

          // ── unknown ───────────────────────────────────────────────────────
          return sock.sendMessage(chatId, {
              text: `${H}\n║\n║ ▸ *Usage*: ${prefix}antiviewonce on/off/status/mode\n║\n${F}`
          }, { quoted: msg });
      }
  };