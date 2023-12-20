const Discord = require ('discord.js');
const { Client, Intents, MessageButton, MessageActionRow, MessageEmbed, MessageSelectMenu, Modal, TextInputComponent, Permissions} = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders')
const { REST } = require('@discordjs/rest'); 
const { Routes } = require('discord-api-types/v9');
const fs = require('fs')
//
const Database = require("./mongoDB/connect.js")
const configureDB = require("./mongoDB/configure.js")
const DBclass = new Database(); 
DBclass.connect();
//
global.bot = new Client({intents: [3276799], ws: { properties: { $browser: "Discord iOS" } }});
global.MessageButton = MessageButton
global.Modal = Modal
global.TextInputComponent = TextInputComponent
global.MessageSelectMenu = MessageSelectMenu
global.MessageActionRow = MessageActionRow
global.MessageEmbed = MessageEmbed
global.Permissions = Permissions
//
const footballChannel = {
  "1137750139944050749" : "1137750408132055101"
}
var channelsID = Object.values(footballChannel)
const commands = JSON.parse(fs.readFileSync(`commands.json`, 'utf-8'))
const webhookList = {}
const cooldowns = {};
const dataCache = {
  players: null,
  tactics: null,
  clubs: null
};
var allClubs = []

require('dotenv').config()

// run files
bot.on('ready', async () => {
  dataCache.players = await configureDB.getPlayers();
  dataCache.tactics = await configureDB.getTactics();
  dataCache.clubs = await configureDB.getClubs();
  allClubs = dataCache.clubs.map(e=>e.name).filter(e=>e != "Free Agent")
  allClubs.reverse();
  require("./adminjunk/updateDatabase.js")
  

  console.log('We Gucci');
});

// command interaction
bot.on('interactionCreate', async (interaction) => {
  if (!channelsID.includes(interaction.channel.id)) return;
  if (!interaction.isCommand() && interaction.customId != "second_match") return;
  const userId = interaction.user.id;
  const now = Date.now();
  const cooldownDuration = 5000;
  if (cooldowns[userId] && now - cooldowns[userId] < cooldownDuration) {
    return await interaction.reply({content: "⚠️ You are on a cooldown, wait a few seconds before trying again", ephemeral: true}).catch(e=>console.error("Cooldown message can't be sent"));
  }
  cooldowns[userId] = now;
  require("./ballIQ/script.js").handleInteraction(interaction);
  require("./draft/script.js").handleInteraction(interaction);
  require("./penalty/script.js").handleInteraction(interaction);
  require("./guesswho/script.js").handleInteraction(interaction);
  require("./simulation/script.js").handleInteraction(interaction);
});

// button interaction
bot.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;
  require("./ballIQ/script.js").buttonInteraction(interaction);
  require("./draft/script.js").buttonInteraction(interaction);
  require("./guesswho/script.js").buttonInteraction(interaction);
  require("./simulation/script.js").buttonInteraction(interaction);
});

// select interaction
bot.on('interactionCreate', async (interaction) => {
  if (!interaction.isSelectMenu()) return;
  require("./draft/script.js").menuInteraction(interaction);
});
// auto complete
bot.on('interactionCreate', async interaction => {
	if (interaction.isAutocomplete()) {
		const focusedValue = interaction.options.getFocused();
		const filtered = allClubs.filter(choice => choice.toLowerCase().includes(focusedValue.toLowerCase())).slice(0, 10);
		await interaction.respond(
			filtered.map(choice => ({ name: choice, value: choice })),
		);
	}
});

// update commands
bot.once('ready', async () => {
  for (id in footballChannel){
    try {
      const rest = new REST({ version: '9' }).setToken(process.env.bot);
      await rest.put(Routes.applicationGuildCommands(bot.user.id, id), {
        body: commands,
      });
      const channel = await bot.channels.fetch(footballChannel[id]);
      const arr = await fillWebhooks(bot, channel)
      webhookList[id] = {list: arr, randomHook}
      const threads = await channel.threads.cache//.fetchActive();
      const guessWhoThreads = threads.filter(thread => ['guess-who', 'ball-iq', 'penalties', 'thread-tournament'].includes(thread.name));

      guessWhoThreads.forEach(async (thread) => {
          if (thread.id != footballChannel[id]) await thread.delete().catch(e=>console.error("Thread could not be deleted"));
      });

    } catch (error) {
      console.error('Error registering application commands:', error);
    }
  }
});

// create webhooks
async function fillWebhooks(bot, channel){
  var list = await channel.fetchWebhooks().catch((error) => { console.error("cant fetch webhook")}) || []
  var hooks = Array.from(list, ([key, value]) => value).filter(o=>o.owner.id == bot.user.id).slice(0,15)
  if (hooks.length == 15) return hooks

  var i = hooks.length
  var profiles = [
    {name: "Sae Chabashira", avatar: "https://i.imgur.com/7b7bkcI.jpg"},
    {name: "Chie Hoshinomiya", avatar: "https://i.imgur.com/IbvC6yI.jpg"},
    {name: "Tomonari Mashima", avatar: "https://i.imgur.com/Zdi8XyJ.png"}
  ] 
  while (i < 15){
    var profile = profiles[Math.floor(Math.random()*profiles.length)]
    await channel.createWebhook(profile.name, { avatar: profile.avatar}).catch((error) => { console.error("cant create webhook")})
    i++
  }
  var list = await channel.fetchWebhooks().catch((error) => { console.error("cant fetch webhook")}) || []
  var hooks = Array.from(list, ([key, value]) => value).filter(o=>o.owner.id == bot.user.id).slice(0,15)
  return hooks
}

// get random Webhook
function randomHook(){
  var list = this.list
  var possible = list.filter(e=>!e.active)
  if (possible.length == 0) {
    list.forEach(e=>e.active = false)
    possible = list
  }
  var chosen = possible[Math.floor(Math.random()*possible.length)]
  chosen.active = true
  console.log(possible.length)
  return chosen
}

// error handling
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

// export data
module.exports = { dataCache, webhookList };

// log in
bot.login(process.env.bot);