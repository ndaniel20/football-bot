const { webhookList } = require('../server.js');
const gameJS = require("./game.js")
const formations = require("../data/formations.json")
const database = require("../data/teamInfo.json")
const {flag} = require('country-emoji');
const completeList = database.map(e=>e.team.concat(e.bench)).flat(1).filter(e=>e.rating >= 70)
const draftStorage = {}
const color = "#93c47d"
const customFlags = {'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿','Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿','England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿','Ivory Coast': '🇨🇮'}
const allFormations = Object.keys(formations)
function wait(ms) {return new Promise(resolve => setTimeout(resolve, ms));}

module.exports = {
    handleInteraction: async function(interaction){
        const { commandName, options, user } = interaction;

        if (commandName == "draft"){
            var button1 = new MessageButton().setStyle('SUCCESS').setLabel("Start").setCustomId(`start_draft`).setDisabled(true)
            var button2 = new MessageButton().setStyle('SUCCESS').setLabel("Join").setCustomId(`join_draft`)
            var buttonRow = new MessageActionRow().addComponents(button1, button2);
            var embed = new MessageEmbed().setColor(color).setAuthor({name: 'Drafts', iconURL: `https://i.imgur.com/DOo1xqu.png`}).setTitle(`${user.username} has started a Draft`).setDescription(`Click "Join" if you wish to participate. The player slots are available for **2, 4, 8, or 16** participants. In case the number of players falls short, participants who haven't filled the slots will be removed`).addFields({name: "Players List (0)", value: "\u200B"})
            await interaction.reply({ 
                embeds: [embed],
                components: [buttonRow],
            }).catch(e=>console.error("1. Draft message can't be sent"))
            
            var msg = await interaction.fetchReply().catch(e=>console.error("2. Can't fetch reply from draft"))
            if (!msg) return;
            var msgID = msg.id
            draftStorage[msgID] = {message: msg, list: [], interactions: [], hostID: user.id, playerList: {}}
        }
    },
    buttonInteraction: async function(interaction) {
        const { customId, user } = interaction;

        if (customId.startsWith("join_draft")){
            var obj = draftStorage[interaction.message.id]
            interaction.deferUpdate();
            if (!obj) return;
            var list = obj.list
            var msg = obj.message
            var embed = msg.embeds[0]
            if (list.includes(user.id)) return;
            list.push(user.id)
            obj.interactions.push(interaction)
            var max = list.length == 16 ? 16 : list.length >= 8 ? 8 : list.length >= 4 ? 4 : list.length >= 2 ? 2 : 0
            if (max >= 2 && msg.components[0].components[0].disabled) msg.components[0].components[0].disabled = false
            embed.fields[0] = {name: `Players List (${list.length})`, value: list.map((e, n)=>`- <@${e}> ${max > n ? "✔" : ""}`).join("\n")}
            await msg.edit({
                embeds: [embed],
                components: msg.components
            }).catch(e=>console.error("4. can't edit Draft message"))
        }

        if (customId.startsWith("start_draft")){
            var obj = draftStorage[interaction.message.id]
            if (!obj) return;
            if (user.id != obj.hostID) return;
            var embed = interaction.message.embeds[0]
            obj.hostID = null
            obj.list = ["871680017598402571", "871680017598402571", "871680245508501544", "871680245508501544","871680017598402571", "871680017598402571", "871680245508501544", "871680245508501544", "871680017598402571", "871680245508501544"]
            var list = obj.list
            var max = list.length == 16 ? 16 : list.length >= 8 ? 8 : list.length >= 4 ? 4 : list.length >= 2 ? 2 : 0
            obj.list = obj.list.slice(0, max)
            obj.interactions = obj.interactions.slice(0, max)

            list = obj.list
            var interactions = obj.interactions
            var time = ((new Date().getTime() + 91000)/1000).toFixed(0)
            embed.fields[0].value = embed.fields[0].value.split("\n").slice(0, max).join("\n")
            embed.description = `You must now select a formation and 11 players for your drafted team.\nTime expires <t:${time}:R>`
            await interaction.update({
                embeds: [embed],
                components:[]
            }).catch("4. Can't update draft message")

            for (var i = 0; i < interactions.length; i++){
                var emp = interactions[i]
                obj.playerList[emp.user.id] = {players: [], formation: ""}
                const selectMenu = this.createOptionFormation(allFormations)
                const embed = new MessageEmbed().setColor(color).setDescription("```ml\nFormation:\nAvg Rating:\nChemistry:\n```").setAuthor({name: 'Drafts', iconURL: `https://i.imgur.com/DOo1xqu.png`}).addFields({name: "Your players", value: '\u200B'})
                const row = new MessageActionRow().addComponents(selectMenu);
                emp.followUp({embeds: [embed], components: [row], ephemeral: true})
            }

            const runCommand = async () => {
                list.forEach((e, n) => {
                    var players = obj.playerList[e]?.players;
                    var formation = obj.playerList[e]?.formation;
                    if (players.length == 0) {
                        formation = "433"
                        players = this.distributePlayers(formation)
                        obj.playerList[e].formation = formation
                        obj.playerList[e].players = players
                    }
                    players.forEach((player, index) => {
                        if (Array.isArray(player)) {
                            obj.playerList[e].players[index] = player[0];
                        }
                    });
                });
                var clone = deepClone(obj)
                delete draftStorage[interaction.message.id]
                var channel = await createThread(interaction.channel).catch(e=>console.error("8. can't create draft thread"))
                var webhook = webhookList[interaction.guildId].randomHook();
                embed.description = `Tournament now started on <#${channel.id}>`
                await interaction.message.edit({
                    embeds: [embed],
                }).catch("5. Can't edit draft message")

                gameJS.startTournament(channel, clone, webhook);
            };
            
            // Start the countdown
            const countdownPromise = Promise.race([
            wait(90000),
            new Promise(resolve => {
                const interval = setInterval(() => {
                    var pList = list.map(e=>obj.playerList[e]?.players.filter(x=>!Array.isArray(x)).length)
                    if (pList.filter(e=>e == 11).length == list.length) {
                        clearInterval(interval);
                        resolve();
                    }
                }, 1000);
            })
            ]);
            
            await countdownPromise;
            await runCommand();
        }
    },
    menuInteraction: async function(interaction) {
        const { customId, user } = interaction;

        if (customId.startsWith("formation_select")){
            var msgID = interaction?.message?.reference?.messageId
            var obj = draftStorage[msgID]
            if (!obj) return interaction.deferUpdate();
            var list = obj.playerList[user.id]
            if (!list) return interaction.deferUpdate();
            var value = interaction.values[0]
            var embeds = interaction.message.embeds[0]
            var options = this.distributePlayers(value)
            list.formation = value
            list.players = options
            var players = list.players
            var formation = list.formation
            var index = players.findIndex(element => Array.isArray(element));
            var embed = this.createEmbed(players.filter(element => !Array.isArray(element)), formation, embeds)
            interaction.message.components[0].components[0] = this.createOptionMenu(players[index], formation, index)
            
            interaction.update({
                embeds: [embed],
                components: interaction.message.components
            })
        }

        if (customId.startsWith("player_select")){
            var msgID = interaction?.message?.reference?.messageId
            var obj = draftStorage[msgID]
            if (!obj) return interaction.deferUpdate();
            var list = obj.playerList[user.id]
            if (!list) return interaction.deferUpdate();
            var players = list.players
            var formation = list.formation
            var value = interaction.values[0]
            var embeds = interaction.message.embeds[0]
            var index = players.findIndex(element => Array.isArray(element));
            if (!players[index]) return interaction.deferUpdate();
            players[index] = players[index].filter(e=>e.id == value)[0]
            var embed = this.createEmbed(players.filter(element => !Array.isArray(element)), formation, embeds)

            if (!players[index + 1]) interaction.message.components = []
            else interaction.message.components[0].components[0] = this.createOptionMenu(players[index + 1], formation, index + 1)
            
            interaction.update({
                embeds: [embed],
                components: interaction.message.components
            })
        }
    },
    distributePlayers: function(formation){
        var positions = this.getFormation(formation)
        var playerChoices = []
        var IDStore = []
        for (let i = 0; i < positions.length; i++){
            var arr2 = []
            var position = positions[i]
            var options = completeList.filter(e=>!IDStore.includes(e.id) && (e.primaryPositions.concat(e.secondaryPositions)).includes(position))
            for (let y = 0; y < 3; y++){
                var filtered = options.filter(e=>!IDStore.includes(e.id))
                var randomPlayer = filtered[Math.floor(Math.random()*filtered.length)]
                arr2.push(randomPlayer)
                IDStore.push(randomPlayer.id)
            }
            playerChoices.push(arr2)
        }
        return playerChoices
    },
    createOptionFormation: function(list){
        var options = list.map(l=>({label: l, id: l}))
        const selectMenu = new MessageSelectMenu()
        .setCustomId('formation_select')
        .setPlaceholder(`Select a formation`)
        .addOptions(
          options.map((option) => ({
            label: option.label,
            value: option.id,//.toLowerCase().replace(/ /g, ''),
          }))
        );
        return selectMenu
    },
    createOptionMenu: function(list, formation, i){
        var position = this.getFormation(formation)[i]
        var options = list.map(l=>({emoji: (this.getFlag(l.nation) || "🏳"), label: `(${l.rating}) ${l.name} - ${l.club}`, id: l.id}))
        const selectMenu = new MessageSelectMenu()
        .setCustomId('player_select')
        .setPlaceholder(`Select a ${position}`)
        .addOptions(
          options.map((option) => ({
            label: option.label,
            value: option.id,//.toLowerCase().replace(/ /g, ''),
            emoji: option.emoji,
          }))
        );
        return selectMenu
    },
    createEmbed: function(list, formation, embed){
        var positions = this.getFormation(formation)
        var avgRating = list.length > 0 ? (list.map(e=>parseInt(e.rating)).reduce((a, b) => a + b)/11).toFixed(0) : "0"
        var chemistry = this.calculateChemistry(list)
        embed.description = `\`\`\`ml\nFormation: ${formation}\nAvg Rating: ${avgRating}\nChemistry: ${chemistry}\n\`\`\``
        if (list.length > 0) embed.fields[0].value = list.map((p, n)=>`\`${positions[n]}\` ${p.name}`).join("\n")
        return embed
    },
    calculateChemistry: function(players){
        var leagues = []
        var nations = []
        var clubs = []
        for (var i = 0; i < players.length; i++){
            var player = players[i]
            leagues.push(player.league)
            nations.push(player.nation)
            clubs.push(player.club)
        }
        var m1 = this.countDuplicates(leagues) * 2.5
        var m2 = this.countDuplicates(nations) * 5
        var m3 = this.countDuplicates(clubs) * 5
        return (Math.min(m1 + m2 + m3, 100)).toFixed(0)
    },
    countDuplicates: function(arr) {
        const count = {};
        let totalDuplicates = 0;
      
        for (const item of arr) {
          count[item] = (count[item] || 0) + 1;
      
          if (count[item] === 2) {
            totalDuplicates += 2;
          } else if (count[item] > 2) {
            totalDuplicates++;
          }
        }
      
        return totalDuplicates;
    },
    getFlag: function(nation){
        const customFlag = customFlags[nation];
        if (customFlag) return customFlag;
        return flag(nation);
    },
    getFormation: function(formation){
        return formations[formation].map(e=>e[2]).reverse()
    }
}


async function createThread(channel){
    const thread = await channel.threads.create({
        name: "thread-tournament",
        autoArchiveDuration: 60,
        rateLimitPerUser: 6 * 60 * 60,
    }).catch(e=>console.error("8. Cannot create penalties thread"))
    return thread
}

function deepClone(obj, clones = new WeakMap()) {
    if (clones.has(obj)) {
      return clones.get(obj);
    }
  
    if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        const newArr = [];
        clones.set(obj, newArr);
        for (const item of obj) {
          newArr.push(deepClone(item, clones));
        }
        return newArr;
      } else {
        const newObj = {};
        clones.set(obj, newObj);
        for (const key in obj) {
          newObj[key] = deepClone(obj[key], clones);
        }
        return newObj;
      }
    }
  
    return obj;
  }