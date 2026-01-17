// Minecraft server commands with their descriptions and argument hints
export interface MinecraftCommand {
  name: string;
  description: string;
  args?: string;
  requiresPlayer?: boolean; // Commands that typically take a player name as first argument
}

export const MINECRAFT_COMMANDS: MinecraftCommand[] = [
  // Player management
  { name: "list", description: "Liste les joueurs connectés" },
  { name: "kick", description: "Expulse un joueur", args: "<joueur> [raison]", requiresPlayer: true },
  { name: "ban", description: "Bannit un joueur", args: "<joueur> [raison]", requiresPlayer: true },
  { name: "ban-ip", description: "Bannit une IP", args: "<ip|joueur> [raison]" },
  { name: "pardon", description: "Débannit un joueur", args: "<joueur>", requiresPlayer: true },
  { name: "pardon-ip", description: "Débannit une IP", args: "<ip>" },
  { name: "banlist", description: "Affiche la liste des bans", args: "[ips|players]" },
  { name: "op", description: "Donne les droits opérateur", args: "<joueur>", requiresPlayer: true },
  { name: "deop", description: "Retire les droits opérateur", args: "<joueur>", requiresPlayer: true },

  // Whitelist
  { name: "whitelist", description: "Gère la whitelist", args: "add|remove|list|on|off|reload" },

  // Communication
  { name: "say", description: "Envoie un message à tous", args: "<message>" },
  { name: "tell", description: "Envoie un message privé", args: "<joueur> <message>", requiresPlayer: true },
  { name: "msg", description: "Envoie un message privé", args: "<joueur> <message>", requiresPlayer: true },
  { name: "w", description: "Envoie un message privé", args: "<joueur> <message>", requiresPlayer: true },
  { name: "me", description: "Affiche une action", args: "<action>" },
  { name: "teammsg", description: "Message à l'équipe", args: "<message>" },

  // Teleportation
  { name: "tp", description: "Téléporte un joueur", args: "<joueur> <destination>", requiresPlayer: true },
  { name: "teleport", description: "Téléporte un joueur", args: "<joueur> <destination>", requiresPlayer: true },
  { name: "spreadplayers", description: "Disperse les joueurs", args: "<x> <z> <distance> <range> <joueurs>" },
  { name: "spawnpoint", description: "Définit le point de spawn", args: "[joueur] [pos]" },
  { name: "setworldspawn", description: "Définit le spawn du monde", args: "[pos]" },

  // Gameplay
  { name: "gamemode", description: "Change le mode de jeu", args: "<mode> [joueur]" },
  { name: "defaultgamemode", description: "Mode de jeu par défaut", args: "<mode>" },
  { name: "difficulty", description: "Change la difficulté", args: "<difficulté>" },
  { name: "give", description: "Donne un objet", args: "<joueur> <item> [quantité]", requiresPlayer: true },
  { name: "clear", description: "Vide l'inventaire", args: "[joueur] [item] [quantité]" },
  { name: "effect", description: "Applique un effet", args: "give|clear <joueur> [effet]", requiresPlayer: true },
  { name: "enchant", description: "Enchante un objet", args: "<joueur> <enchantement> [niveau]", requiresPlayer: true },
  { name: "kill", description: "Tue des entités", args: "[cibles]" },
  { name: "xp", description: "Gère l'expérience", args: "add|set|query <joueur> <montant>", requiresPlayer: true },
  { name: "experience", description: "Gère l'expérience", args: "add|set|query <joueur> <montant>", requiresPlayer: true },
  { name: "attribute", description: "Modifie les attributs", args: "<joueur> <attribut> get|base|modifier" },

  // World
  { name: "time", description: "Gère le temps", args: "set|add|query <valeur>" },
  { name: "weather", description: "Change la météo", args: "clear|rain|thunder [durée]" },
  { name: "gamerule", description: "Modifie une règle", args: "<règle> [valeur]" },
  { name: "worldborder", description: "Gère la bordure", args: "add|center|damage|get|set|warning" },
  { name: "seed", description: "Affiche la seed" },
  { name: "locate", description: "Localise une structure", args: "structure|biome|poi <type>" },

  // Blocks & Entities
  { name: "setblock", description: "Place un bloc", args: "<pos> <bloc>" },
  { name: "fill", description: "Remplit une zone", args: "<de> <à> <bloc> [mode]" },
  { name: "clone", description: "Clone une zone", args: "<de> <à> <destination>" },
  { name: "summon", description: "Invoque une entité", args: "<entité> [pos] [nbt]" },
  { name: "data", description: "Gère les NBT", args: "get|merge|modify|remove <cible>" },
  { name: "item", description: "Modifie les items", args: "modify|replace <cible> <slot>" },

  // Server management
  { name: "stop", description: "Arrête le serveur" },
  { name: "save-all", description: "Sauvegarde le monde", args: "[flush]" },
  { name: "save-on", description: "Active les sauvegardes auto" },
  { name: "save-off", description: "Désactive les sauvegardes auto" },
  { name: "reload", description: "Recharge les datapacks" },
  { name: "debug", description: "Lance le debug", args: "start|stop|function" },
  { name: "perf", description: "Analyse les performances", args: "start|stop" },

  // Advanced
  { name: "execute", description: "Exécute des commandes", args: "as|at|if|unless|run ..." },
  { name: "function", description: "Exécute une fonction", args: "<namespace:function>" },
  { name: "schedule", description: "Planifie une fonction", args: "function|clear <fonction> <temps>" },
  { name: "scoreboard", description: "Gère les scoreboards", args: "objectives|players ..." },
  { name: "team", description: "Gère les équipes", args: "add|empty|join|leave|list|modify|remove" },
  { name: "tag", description: "Gère les tags", args: "<cibles> add|list|remove <tag>" },
  { name: "trigger", description: "Modifie un trigger", args: "<objectif> [add|set <valeur>]" },
  { name: "bossbar", description: "Gère les bossbars", args: "add|get|list|remove|set" },
  { name: "title", description: "Affiche un titre", args: "<joueur> clear|reset|title|subtitle|actionbar|times" },
  { name: "tellraw", description: "Envoie du JSON", args: "<joueurs> <json>" },

  // Misc
  { name: "help", description: "Affiche l'aide", args: "[commande]" },
  { name: "?", description: "Affiche l'aide", args: "[commande]" },
  { name: "playsound", description: "Joue un son", args: "<son> <source> <joueur>" },
  { name: "stopsound", description: "Arrête un son", args: "<joueur> [source] [son]" },
  { name: "particle", description: "Crée des particules", args: "<particule> [pos] [delta] [vitesse] [count]" },
  { name: "loot", description: "Génère du loot", args: "give|insert|replace|spawn <source>" },
  { name: "recipe", description: "Gère les recettes", args: "give|take <joueur> <recette>" },
  { name: "advancement", description: "Gère les succès", args: "grant|revoke <joueur> ..." },
  { name: "forceload", description: "Force le chargement", args: "add|remove|query <chunk>" },
  { name: "spectate", description: "Spectate une entité", args: "[cible] [joueur]" },
  { name: "jfr", description: "Java Flight Recorder", args: "start|stop" },
];

// Commands that take a player name as first argument
export const PLAYER_COMMANDS = MINECRAFT_COMMANDS
  .filter(cmd => cmd.requiresPlayer)
  .map(cmd => cmd.name);

// Get commands that match a prefix
export function getMatchingCommands(prefix: string): MinecraftCommand[] {
  const search = prefix.toLowerCase().replace(/^\//, "");
  if (!search) return MINECRAFT_COMMANDS.slice(0, 10);

  return MINECRAFT_COMMANDS.filter(cmd =>
    cmd.name.toLowerCase().startsWith(search)
  ).slice(0, 8);
}

// Check if the current input needs player suggestions
export function needsPlayerSuggestion(input: string): boolean {
  const parts = input.trim().split(/\s+/);
  if (parts.length !== 2) return false;

  const command = parts[0].replace(/^\//, "").toLowerCase();
  return PLAYER_COMMANDS.includes(command) && parts[1] !== "";
}
