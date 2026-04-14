'use strict';

const { getBotName } = require('../../lib/botname');

const VOICES = {
    brian:    'Brian',    amy:    'Amy',    emma:    'Emma',    geraint: 'Geraint',
    russell:  'Russell',  nicole: 'Nicole', justin:  'Justin',  joey:    'Joey',
    joanna:   'Joanna',   kendra: 'Kendra', kimberly:'Kimberly',salli:   'Salli',
    ivy:      'Ivy',      matthew:'Matthew',
};

const VOICE_LIST = Object.keys(VOICES).join(', ');

async function getTTS(text, voice = 'Brian') {
    const url = `https://api.streamelements.com/kappa/v2/speech?voice=${encodeURIComponent(voice)}&text=${encodeURIComponent(text)}`;
    const res = await fetch(url, {
        signal: AbortSignal.timeout(20000),
        headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120' }
    });
    if (!res.ok) throw new Error(`TTS API HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length) throw new Error('Empty audio returned');
    return buf;
}

module.exports = {
    name: 'tts',
    aliases: ['texttospeech', 'speak', 'voice', 'say', 'voicenote'],
    description: 'Convert text to a voice note — .tts <text> [voice]',
    category: 'utility',

    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try { await sock.sendMessage(chatId, { react: { text: '🎙️', key: msg.key } }); } catch {}

        const ctxQuoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedText = ctxQuoted?.conversation || ctxQuoted?.extendedTextMessage?.text;

        const USAGE = [
            `╔═|〔  TTS 🎙️ 〕`,
            `║`,
            `║ ▸ *Usage*   : ${prefix}tts <text>`,
            `║ ▸ *Voice*   : ${prefix}tts <text> --voice <name>`,
            `║ ▸ *Example* : ${prefix}tts Hello everyone!`,
            `║ ▸ *Example* : ${prefix}tts Good morning --voice Amy`,
            `║ ▸ *Reply*   : Reply a message with ${prefix}tts`,
            `║`,
            `║ ▸ *Voices* : ${VOICE_LIST}`,
            `║`,
            `╚═|〔 ${name} 〕`,
        ].join('\n');

        let rawText = args.join(' ').trim() || quotedText?.trim();
        if (!rawText) return sock.sendMessage(chatId, { text: USAGE }, { quoted: msg });

        // parse --voice <name>
        let voiceKey = 'brian';
        const vMatch = rawText.match(/--voice\s+(\w+)/i);
        if (vMatch) {
            voiceKey = vMatch[1].toLowerCase();
            rawText  = rawText.replace(vMatch[0], '').trim();
        }

        const voiceName = VOICES[voiceKey];
        if (!voiceName) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  TTS 〕\n║\n║ ▸ *Unknown voice* : ${voiceKey}\n║ ▸ *Voices*       : ${VOICE_LIST}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        if (rawText.length > 500) rawText = rawText.slice(0, 500);

        try {
            const audioBuf = await getTTS(rawText, voiceName);

            await sock.sendMessage(chatId, {
                audio:    audioBuf,
                mimetype: 'audio/mpeg',
                ptt:      true,
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  TTS 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};
