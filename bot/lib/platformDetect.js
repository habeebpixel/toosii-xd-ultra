'use strict';

  function detectPlatform() {
      // Allow manual override via env var
      if (process.env.PLATFORM) return process.env.PLATFORM;

      // Pterodactyl (bot-hosting.net) sets P_SERVER_UUID in every container
      if (process.env.P_SERVER_UUID || process.env.STARTUP) return '🦅 Pterodactyl';

      // Other known platforms
      if (process.env.DYNO)                  return '☁️ Heroku';
      if (process.env.RAILWAY_ENVIRONMENT)   return '🚂 Railway';
      if (process.env.KOYEB_SERVICE_NAME)    return '🌊 Koyeb';
      if (process.env.RENDER)                return '🎨 Render';
      if (process.env.REPL_ID || process.env.REPLIT_DEPLOYMENT) return '☁️ Replit';

      return '🖥️ VPS/Self-Hosted';
  }

  module.exports = { detectPlatform };
  