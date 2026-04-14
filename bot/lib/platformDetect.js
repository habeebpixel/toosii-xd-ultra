'use strict';

  function detectPlatform() {
      // Allow manual override via env var
      if (process.env.PLATFORM) return process.env.PLATFORM;

      // Pterodactyl — any of these are set inside every Pterodactyl container
      // (P_SERVER_UUID, P_SERVER_LOCATION, P_MEMORY_MAX, P_STARTUP are all standard)
      if (
          process.env.P_SERVER_UUID     ||
          process.env.P_SERVER_LOCATION ||
          process.env.P_MEMORY_MAX      ||
          process.env.P_STARTUP         ||
          process.env.STARTUP
      ) return '🦅 Pterodactyl';

      // Other known platforms
      if (process.env.DYNO)                  return '☁️ Heroku';
      if (process.env.RAILWAY_ENVIRONMENT)   return '🚂 Railway';
      if (process.env.KOYEB_SERVICE_NAME)    return '🌊 Koyeb';
      if (process.env.RENDER)                return '🎨 Render';

      // Replit — requires BOTH REPL_ID and REPL_SLUG (Replit always injects both;
      // a stale REPL_ID in a .env file won't match this)
      if (
          (process.env.REPL_ID && process.env.REPL_SLUG) ||
          process.env.REPLIT_DEPLOYMENT
      ) return '☁️ Replit';

      return '🖥️ VPS/Self-Hosted';
  }

  module.exports = { detectPlatform };
  