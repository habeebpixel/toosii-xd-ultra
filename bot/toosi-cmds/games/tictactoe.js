'use strict';
// ─────────────────────────────────────────────────────────────
//  TicTacToe — in-memory game engine with Minimax AI
// ─────────────────────────────────────────────────────────────

const games = new Map(); // chatId → gameState

// ── Board helpers ─────────────────────────────────────────────
function emptyBoard() { return Array(9).fill(null); }

function renderBoard(b) {
    const s = v => v === 'X' ? '❌' : v === 'O' ? '⭕' : '⬜';
    return [
        `${s(b[0])} ${s(b[1])} ${s(b[2])}`,
        `${s(b[3])} ${s(b[4])} ${s(b[5])}`,
        `${s(b[6])} ${s(b[7])} ${s(b[8])}`,
    ].join('\n');
}

function renderNumbered() {
    return '1️⃣ 2️⃣ 3️⃣\n4️⃣ 5️⃣ 6️⃣\n7️⃣ 8️⃣ 9️⃣';
}

const WINS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function checkWinner(b) {
    for (const [a,c,d] of WINS) {
        if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
    }
    return b.every(Boolean) ? 'draw' : null;
}

// ── Minimax AI ────────────────────────────────────────────────
function minimax(b, isMax, alpha = -Infinity, beta = Infinity) {
    const w = checkWinner(b);
    if (w === 'O') return 10;
    if (w === 'X') return -10;
    if (w === 'draw') return 0;
    let best = isMax ? -Infinity : Infinity;
    for (let i = 0; i < 9; i++) {
        if (b[i]) continue;
        b[i] = isMax ? 'O' : 'X';
        const score = minimax(b, !isMax, alpha, beta);
        b[i] = null;
        if (isMax) { best = Math.max(best, score); alpha = Math.max(alpha, best); }
        else        { best = Math.min(best, score); beta  = Math.min(beta, best); }
        if (beta <= alpha) break;
    }
    return best;
}

function getBestMove(b) {
    let best = -Infinity, move = -1;
    for (let i = 0; i < 9; i++) {
        if (b[i]) continue;
        b[i] = 'O';
        const score = minimax(b, false);
        b[i] = null;
        if (score > best) { best = score; move = i; }
    }
    return move;
}

// ── Sender helper ─────────────────────────────────────────────
function getSender(msg) {
    return msg.key.participant || msg.key.remoteJid;
}

function shortNum(jid) {
    return jid.replace(/[^0-9]/g, '').slice(-6);
}

const AI_JID = 'AI@s.whatsapp.net';

// ── Commands ──────────────────────────────────────────────────
module.exports = [
    {
        name: 'tictactoe',
        aliases: ['ttt', 'xo'],
        description: 'Start a TicTacToe game. Mention a player or use "ai"',
        category: 'games',
        async execute(sock, msg, args, prefix, ctx) {
            const chatId = msg.key.remoteJid;
            if (!chatId.endsWith('@g.us'))
                return sock.sendMessage(chatId, { text: `╔═|〔  TICTACTOE 〕\n║\n║ ▸ Group only command\n║\n╚═╝` }, { quoted: msg });

            try { await sock.sendMessage(chatId, { react: { text: '🎮', key: msg.key } }); } catch {}

            if (games.has(chatId))
                return sock.sendMessage(chatId, { text: `╔═|〔  TICTACTOE 〕\n║\n║ ▸ A game is already running\n║ ▸ Use *${prefix}tttend* to end it\n║\n╚═╝` }, { quoted: msg });

            const sender = getSender(msg);
            const vsAI   = args.join(' ').toLowerCase().includes('ai');

            const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const opponent  = vsAI ? AI_JID : (mentioned[0] || null);

            if (!vsAI && !opponent)
                return sock.sendMessage(chatId, { text: `╔═|〔  TICTACTOE 〕\n║\n║ ▸ *Usage* : ${prefix}tictactoe @player\n║           ${prefix}tictactoe ai\n║\n╚═╝` }, { quoted: msg });

            if (!vsAI && opponent === sender)
                return sock.sendMessage(chatId, { text: `╔═|〔  TICTACTOE 〕\n║\n║ ▸ You can't play against yourself!\n║\n╚═╝` }, { quoted: msg });

            const board   = emptyBoard();
            const players = [sender, opponent]; // X, O

            games.set(chatId, {
                board, players, currentTurn: 0, vsAI,
                waiting: !vsAI,
                timeout: setTimeout(() => {
                    games.delete(chatId);
                    sock.sendMessage(chatId, { text: `╔═|〔  TICTACTOE 〕\n║\n║ ▸ Game expired (10 min idle)\n║\n╚═╝` }).catch(() => {});
                }, 10 * 60 * 1000),
            });

            const mentions = vsAI ? [sender] : [sender, opponent];
            const oppLabel = vsAI ? '🤖 AI' : `@${shortNum(opponent)}`;

            const text = vsAI
                ? `╔═|〔  TICTACTOE 〕\n║\n║ ❌ *You* (@${shortNum(sender)}) vs ⭕ *AI* 🤖\n║\n║ ${renderBoard(board).split('\n').join('\n║ ')}\n║\n║ ▸ Numbers guide:\n║ ${renderNumbered().split('\n').join('\n║ ')}\n║\n║ ▸ Your turn! Reply with 1–9\n║\n╚═╝`
                : `╔═|〔  TICTACTOE 〕\n║\n║ ❌ @${shortNum(sender)} vs ⭕ ${oppLabel}\n║\n║ ${renderBoard(board).split('\n').join('\n║ ')}\n║\n║ ▸ Numbers guide:\n║ ${renderNumbered().split('\n').join('\n║ ')}\n║\n║ ▸ @${shortNum(opponent)}, type *${prefix}tttjoin* to accept!\n║\n╚═╝`;

            await sock.sendMessage(chatId, { text, mentions }, { quoted: msg });

            if (vsAI) {
                const g = games.get(chatId);
                g.waiting = false;
            }
        }
    },

    {
        name: 'tttjoin',
        aliases: ['jointt', 'jointtt'],
        description: 'Join a waiting TicTacToe game',
        category: 'games',
        async execute(sock, msg, args, prefix, ctx) {
            const chatId = msg.key.remoteJid;
            const sender = getSender(msg);
            const g = games.get(chatId);

            if (!g) return sock.sendMessage(chatId, { text: `╔═|〔  TICTACTOE 〕\n║\n║ ▸ No game waiting. Use *${prefix}tictactoe @player*\n║\n╚═╝` }, { quoted: msg });
            if (!g.waiting) return sock.sendMessage(chatId, { text: `╔═|〔  TICTACTOE 〕\n║\n║ ▸ Game already started!\n║\n╚═╝` }, { quoted: msg });
            if (sender !== g.players[1]) return sock.sendMessage(chatId, { text: `╔═|〔  TICTACTOE 〕\n║\n║ ▸ You weren't invited to this game\n║\n╚═╝` }, { quoted: msg });

            g.waiting = false;

            const text = `╔═|〔  TICTACTOE 〕\n║\n║ ❌ @${shortNum(g.players[0])} vs ⭕ @${shortNum(g.players[1])}\n║\n║ ${renderBoard(g.board).split('\n').join('\n║ ')}\n║\n║ ▸ Numbers guide:\n║ ${renderNumbered().split('\n').join('\n║ ')}\n║\n║ ▸ @${shortNum(g.players[0])}'s turn! Reply with 1–9\n║\n╚═╝`;
            await sock.sendMessage(chatId, { text, mentions: g.players }, { quoted: msg });
        }
    },

    {
        name: 'tttboard',
        aliases: ['tttshow', 'showboard'],
        description: 'Show the current TicTacToe board',
        category: 'games',
        async execute(sock, msg, args, prefix, ctx) {
            const chatId = msg.key.remoteJid;
            const g = games.get(chatId);
            if (!g) return sock.sendMessage(chatId, { text: `╔═|〔  TICTACTOE 〕\n║\n║ ▸ No active game\n║\n╚═╝` }, { quoted: msg });
            const cur = g.players[g.currentTurn];
            const sym = g.currentTurn === 0 ? '❌' : '⭕';
            const text = `╔═|〔  TICTACTOE 〕\n║\n║ ${renderBoard(g.board).split('\n').join('\n║ ')}\n║\n║ ▸ ${sym} ${cur === AI_JID ? 'AI' : `@${shortNum(cur)}`}'s turn\n║\n╚═╝`;
            await sock.sendMessage(chatId, { text, mentions: g.players.filter(p => p !== AI_JID) }, { quoted: msg });
        }
    },

    {
        name: 'tttend',
        aliases: ['endttt', 'endgame'],
        description: 'End the current TicTacToe game',
        category: 'games',
        async execute(sock, msg, args, prefix, ctx) {
            const chatId = msg.key.remoteJid;
            const sender = getSender(msg);
            const g = games.get(chatId);
            if (!g) return sock.sendMessage(chatId, { text: `╔═|〔  TICTACTOE 〕\n║\n║ ▸ No active game\n║\n╚═╝` }, { quoted: msg });
            if (!g.players.includes(sender) && !ctx?.isOwner?.()) return sock.sendMessage(chatId, { text: `╔═|〔  TICTACTOE 〕\n║\n║ ▸ Only a player or owner can end the game\n║\n╚═╝` }, { quoted: msg });
            clearTimeout(g.timeout);
            games.delete(chatId);
            await sock.sendMessage(chatId, { text: `╔═|〔  TICTACTOE 〕\n║\n║ ▸ Game ended by @${shortNum(sender)}\n║\n╚═╝`, mentions: [sender] }, { quoted: msg });
        }
    },

    // ── Move handler — called from index.js on any numeric group message ──
    {
        name: '_tttmove',
        hidden: true,
        category: 'games',
        async handleMove(sock, msg) {
            const chatId = msg.key.remoteJid;
            if (!chatId.endsWith('@g.us')) return false;
            const g = games.get(chatId);
            if (!g || g.waiting) return false;

            const text = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim();
            const num  = parseInt(text);
            if (isNaN(num) || num < 1 || num > 9) return false;

            const sender = getSender(msg);
            if (sender !== g.players[g.currentTurn]) return false;

            const idx = num - 1;
            if (g.board[idx]) {
                await sock.sendMessage(chatId, { text: `╔═|〔  TICTACTOE 〕\n║\n║ ▸ Cell ${num} is already taken! Pick another.\n║\n╚═╝` }, { quoted: msg });
                return true;
            }

            g.board[idx] = g.currentTurn === 0 ? 'X' : 'O';

            const result = checkWinner(g.board);
            if (result) {
                clearTimeout(g.timeout);
                games.delete(chatId);
                const winnerJid = result === 'draw' ? null : g.players[result === 'X' ? 0 : 1];
                const boardStr  = `║ ${renderBoard(g.board).split('\n').join('\n║ ')}`;
                const ending    = result === 'draw'
                    ? `║ ▸ 🤝 It's a *DRAW*!`
                    : winnerJid === AI_JID ? `║ ▸ 🤖 *AI WINS!* Better luck next time.`
                    : `║ ▸ 🏆 @${shortNum(winnerJid)} *WINS!*`;
                await sock.sendMessage(chatId, {
                    text: `╔═|〔  TICTACTOE 〕\n║\n${boardStr}\n║\n${ending}\n║\n╚═╝`,
                    mentions: g.players.filter(p => p !== AI_JID),
                }, { quoted: msg });
                return true;
            }

            g.currentTurn = 1 - g.currentTurn;

            if (g.vsAI && g.currentTurn === 1) {
                const aiMove = getBestMove(g.board);
                g.board[aiMove] = 'O';
                const aiResult = checkWinner(g.board);
                if (aiResult) {
                    clearTimeout(g.timeout);
                    games.delete(chatId);
                    const boardStr = `║ ${renderBoard(g.board).split('\n').join('\n║ ')}`;
                    const ending   = aiResult === 'draw' ? `║ ▸ 🤝 It's a *DRAW*!` : `║ ▸ 🤖 *AI WINS!* Better luck next time.`;
                    await sock.sendMessage(chatId, {
                        text: `╔═|〔  TICTACTOE 〕\n║\n${boardStr}\n║\n${ending}\n║\n╚═╝`,
                        mentions: [g.players[0]],
                    });
                    return true;
                }
                g.currentTurn = 0;
                const boardStr = `║ ${renderBoard(g.board).split('\n').join('\n║ ')}`;
                await sock.sendMessage(chatId, {
                    text: `╔═|〔  TICTACTOE 〕\n║\n${boardStr}\n║\n║ ▸ 🤖 AI played. Your turn! (1–9)\n║\n╚═╝`,
                    mentions: [g.players[0]],
                });
                return true;
            }

            const cur      = g.players[g.currentTurn];
            const sym      = g.currentTurn === 0 ? '❌' : '⭕';
            const boardStr = `║ ${renderBoard(g.board).split('\n').join('\n║ ')}`;
            await sock.sendMessage(chatId, {
                text: `╔═|〔  TICTACTOE 〕\n║\n${boardStr}\n║\n║ ▸ ${sym} @${shortNum(cur)}'s turn (1–9)\n║\n╚═╝`,
                mentions: [cur],
            });
            return true;
        }
    },
];

// Standalone .move command for tictactoe moves
module.exports.push({
    name: 'move',
    aliases: ['tttmove', 'mv'],
    description: 'Make a move in TicTacToe (1-9)',
    category: 'games',
    async execute(sock, msg, args, prefix, ctx) {
        // Re-use the move handler
        const handler = module.exports.find(c => c.name === '_tttmove');
        if (handler) {
            // Inject the number into the message text
            const num = args[0];
            if (!num) return sock.sendMessage(msg.key.remoteJid, { text: `╔═|〔  TICTACTOE 〕\n║\n║ ▸ *Usage* : ${prefix}move <1-9>\n║\n╚═╝` }, { quoted: msg });
            const fakemsg = Object.assign({}, msg, { message: { conversation: num } });
            await handler.handleMove(sock, fakemsg);
        }
    }
});
