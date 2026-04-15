'use strict';

  const { getConfig, setConfig } = require('../../lib/database');
  const { getBotName } = require('../../lib/botname');

  function val(key) { return (process.env[key] || 'off').toLowerCase(); }
  function icon(v)  { return v === 'on' ? '✅ On' : '❌ Off'; }

  async function setEnvDb(key, v) {
      process.env[key] = v;
      await setConfig(key, v);
  }

  module.exports = {
      name:        'presence',
      aliases:     ['indicator', 'botpresence', 'presenceindicator'],
      description: 'Control both typing and recording indicators together',
      category:    'automation',
      ownerOnly:   true,
      sudoAllowed: true,

      async execute(sock, msg, args, prefix, ctx) {
          const chatId = msg.key.remoteJid;

          if (!ctx?.isOwnerUser && !ctx?.isSudoUser) {
              return sock.sendMessage(chatId, {
                  text: `╔═|〔  PRESENCE INDICATOR 〕\n║\n║ ▸ ❌ Owner/sudo only\n║\n╚═╝`
              }, { quoted: msg });
          }

          const sub   = (args[0] || '').toLowerCase().trim();  // typing | recording | off | status
          const scope = (args[1] || 'all').toLowerCase().trim(); // all | group | dm

          // ── no args → show full status ─────────────────────────────────────
          if (!sub || sub === 'status') {
              const typGlob  = val('AUTO_TYPING');
              const typGrp   = val('AUTO_TYPING_GROUP');
              const typDm    = val('AUTO_TYPING_DM');
              const recGlob  = val('AUTO_RECORDING');
              const recGrp   = val('AUTO_RECORDING_GROUP');
              const recDm    = val('AUTO_RECORDING_DM');

              const anyTyping   = typGlob === 'on' || typGrp === 'on' || typDm === 'on';
              const anyRecord   = recGlob === 'on' || recGrp === 'on' || recDm === 'on';
              const activeMode  = anyTyping ? '⌨️ Typing' : anyRecord ? '🎙️ Recording' : '❌ None';

              return sock.sendMessage(chatId, {
                  text: [
                      `╔═|〔  PRESENCE INDICATOR 〕`, `║`,
                      `║ ▸ *Active Mode* : ${activeMode}`,
                      `║`,
                      `║  ⌨️  TYPING`,
                      `║   ▸ Global : ${icon(typGlob)}  │  Group : ${icon(typGrp)}  │  DM : ${icon(typDm)}`,
                      `║`,
                      `║  🎙️  RECORDING`,
                      `║   ▸ Global : ${icon(recGlob)}  │  Group : ${icon(recGrp)}  │  DM : ${icon(recDm)}`,
                      `║`,
                      `║ ▸ *Usage*:`,
                      `║   ${prefix}presence typing [all|group|dm]`,
                      `║   ${prefix}presence recording [all|group|dm]`,
                      `║   ${prefix}presence off`,
                      `║`, `╚═╝`
                  ].join('\n')
              }, { quoted: msg });
          }

          // ── off → disable everything ───────────────────────────────────────
          if (sub === 'off') {
              for (const k of [
                  'AUTO_TYPING','AUTO_TYPING_DM','AUTO_TYPING_GROUP',
                  'AUTO_RECORDING','AUTO_RECORDING_DM','AUTO_RECORDING_GROUP'
              ]) await setEnvDb(k, 'off');

              return sock.sendMessage(chatId, {
                  text: `╔═|〔  PRESENCE INDICATOR 〕\n║\n║ ▸ ❌ All indicators OFF\n║\n╚═╝`
              }, { quoted: msg });
          }

          // ── typing <scope> ─────────────────────────────────────────────────
          if (sub === 'typing') {
              // First clear all recording (mutually exclusive)
              for (const k of ['AUTO_RECORDING','AUTO_RECORDING_DM','AUTO_RECORDING_GROUP'])
                  await setEnvDb(k, 'off');
              // Clear all typing first, then enable the requested scope
              for (const k of ['AUTO_TYPING','AUTO_TYPING_DM','AUTO_TYPING_GROUP'])
                  await setEnvDb(k, 'off');

              let scopeLabel = 'all chats';
              if (scope === 'group') { await setEnvDb('AUTO_TYPING_GROUP', 'on'); scopeLabel = 'groups only'; }
              else if (scope === 'dm') { await setEnvDb('AUTO_TYPING_DM', 'on'); scopeLabel = 'DMs only'; }
              else { await setEnvDb('AUTO_TYPING', 'on'); }

              return sock.sendMessage(chatId, {
                  text: `╔═|〔  PRESENCE INDICATOR 〕\n║\n║ ▸ ⌨️ Typing ON (${scopeLabel})\n║ ▸ 🎙️ Recording OFF\n║\n╚═╝`
              }, { quoted: msg });
          }

          // ── recording <scope> ──────────────────────────────────────────────
          if (sub === 'recording') {
              // First clear all typing (mutually exclusive)
              for (const k of ['AUTO_TYPING','AUTO_TYPING_DM','AUTO_TYPING_GROUP'])
                  await setEnvDb(k, 'off');
              // Clear all recording first, then enable the requested scope
              for (const k of ['AUTO_RECORDING','AUTO_RECORDING_DM','AUTO_RECORDING_GROUP'])
                  await setEnvDb(k, 'off');

              let scopeLabel = 'all chats';
              if (scope === 'group') { await setEnvDb('AUTO_RECORDING_GROUP', 'on'); scopeLabel = 'groups only'; }
              else if (scope === 'dm') { await setEnvDb('AUTO_RECORDING_DM', 'on'); scopeLabel = 'DMs only'; }
              else { await setEnvDb('AUTO_RECORDING', 'on'); }

              return sock.sendMessage(chatId, {
                  text: `╔═|〔  PRESENCE INDICATOR 〕\n║\n║ ▸ 🎙️ Recording ON (${scopeLabel})\n║ ▸ ⌨️ Typing OFF\n║\n╚═╝`
              }, { quoted: msg });
          }

          // ── unknown ────────────────────────────────────────────────────────
          return sock.sendMessage(chatId, {
              text: [
                  `╔═|〔  PRESENCE INDICATOR 〕`, `║`,
                  `║ ▸ *Usage*:`,
                  `║   ${prefix}presence              → show status`,
                  `║   ${prefix}presence typing        → typing, all chats`,
                  `║   ${prefix}presence typing group  → typing, groups only`,
                  `║   ${prefix}presence typing dm     → typing, DMs only`,
                  `║   ${prefix}presence recording     → recording, all chats`,
                  `║   ${prefix}presence off           → disable all`,
                  `║`, `╚═╝`
              ].join('\n')
          }, { quoted: msg });
      }
  };