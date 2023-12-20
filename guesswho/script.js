const { webhookList } = require('../server.js');
const gameJS = require("./game.js")
const playersList = require("../data/options.json")
const topLeagues = ['English', 'Spanish', 'Italian', 'German', 'French'];
const flagEmojis = ['🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🇪🇸', '🇮🇹', '🇩🇪', '🇫🇷'];
const color = "#179878"
const line = "https://i.imgur.com/TX1ctG7.png"
var GWStorage = {};
var GWPlayers = {}

//message
module.exports = {
    handleInteraction: async (interaction) => {
        const { commandName, options, user } = interaction;

        if (commandName == "guesswho"){
            const userId = user.id
            GWStorage[userId] ??= {};
            GWStorage[userId].leagues ??= []
            var selected = GWStorage[userId].leagues
            var actionRow = getButtons(selected);
            var embed = new MessageEmbed().setImage("https://i.imgur.com/tfOPqoU.png").setColor(color).setAuthor({name: 'Guess Who', iconURL: `https://i.imgur.com/thhcjpK.png`}).setDescription(`Pick which leagues the player should be pulled from`)
            await interaction.reply({ 
                content: `<@${user.id}>`,
                embeds: [embed],
                components: actionRow,
                ephemeral: true
            }).catch(e=>console.error("1. Guess who message can't be sent"))
        }
    },
    buttonInteraction: async (interaction) => {
        const { customId, user } = interaction;

        if (topLeagues.includes(customId)){
            const userId = user.id
            GWStorage[userId] ??= {};
            GWStorage[userId].leagues ??= []
            var selected = GWStorage[userId].leagues
            var index = selected.indexOf(customId)
            if (index >= 0) selected.splice(index, 1)
            else selected.push(customId)
            var actionRow = getButtons(selected);
            interaction.update({
                components: actionRow
            })
        }
        if (customId == "start_guesswho"){
            const userId = user.id
            if (GWStorage[userId]?.player) return interaction.deferUpdate();
            var msgID = interaction.message.id
            GWStorage[userId] ??= {};
            GWStorage[userId].leagues ??= []

            var selected = GWStorage[userId].leagues
            if (selected.length == 0) return interaction.deferUpdate()
            var allChoices = playersList.filter(e=>selected.map(l=>`${l} League`).includes(e.league))
            var randomPlayer = allChoices[Math.floor(Math.random()*allChoices.length)]
            GWStorage[userId].player = randomPlayer

            await interaction.update({components: []}).catch(e=>console.error("11. Can't edit guess who message"))
            var time = ((new Date().getTime() + 31000)/1000).toFixed(0)
            var confirmation = new MessageEmbed().setColor(color).setImage(line).setAuthor({name: 'Guess Who', iconURL: `https://i.imgur.com/thhcjpK.png`}).setThumbnail(user.displayAvatarURL({ format: 'png', dynamic: true, size: 128 })).setTitle(`**${user.username}** has started a game of Guess Who`).setDescription(`The game commences <t:${time}:R>`).addFields({name: "Players", value: "\u200B"}).setFooter({text: `Leagues: ${selected.map((e, n) => flagEmojis[topLeagues.indexOf(e)]).join(" ")}`})
            var buttons = new MessageButton().setStyle('SUCCESS').setLabel('ㅤㅤㅤㅤㅤJoinㅤㅤㅤㅤㅤ').setCustomId('join_guesswho');
            var actionRow = new MessageActionRow().addComponents(buttons);
            var msg = await interaction.followUp({
                embeds: [confirmation],
                components: [actionRow]
            }).catch(e=>console.error("5. Guess who follow-up message can't be sent"));
            GWPlayers[msg.id] ??= []
            var playerList = GWPlayers[msg.id]
            playerList.push(user)

            setTimeout(async() => {
                //playerList = ["871680245508501544", "871680017598402571"]
                if (playerList.length < 2) {
                    delete GWStorage[userId]?.player
                    delete GWPlayers[msg.id]
                    await msg.edit({content: "⚠️ Not enough players have joined", embeds: [], components: []}).catch(e=>console.error("8. Guess who message can't be edited"));
                }
                else  {
                    var messageEmbed = msg.embeds[0]
                    var channel = await createThread(msg).catch(e=>console.error("22. can't create thread"))
                    if (!channel) return;
                    var webhook = webhookList[interaction.guildId].randomHook();
                    await webhook.send({threadId: channel.id, content: "# Players List:\n" + playerList.map(u=>`- <@${u.id}>`).join("\n") + "\n``` ```"}).catch(e=>console.error("19. Guess who message can't be sent"));
                    var embed = new MessageEmbed().setThumbnail(`https://img.fminside.net/facesfm23/${randomPlayer.id}.png`).setColor(color).setAuthor({name: 'Guess Who', iconURL: `https://i.imgur.com/thhcjpK.png`}).setTitle(`Your player is __**${randomPlayer.name}**__`).setDescription(`All questions will be asked on the <#${channel.id}> channel and you'll only be allowed to answer with yes or no`)
                    messageEmbed.description = `Game started on <#${channel.id}>`
                    messageEmbed.fields[0].value = playerList.map(u=>`- ${u}`).join("\n")
                    msg.edit({embeds: [messageEmbed], components: []}).catch(e=>console.error("9. Guess who message can't be edited"));
                    await interaction.followUp({embeds: [embed], ephemeral: true}).catch(e=>console.error("10. Guess who follow-up message can't be be sent"));
                    var host = playerList.shift()
                    delete GWStorage[userId]?.player
                    delete GWPlayers[msg.id]
                    gameJS.startGuessWho(channel, playerList, randomPlayer.name, color, host.id, `https://img.fminside.net/facesfm23/${randomPlayer.id}.png`, 0, playerList[0], webhook);
                }
                
            }, 30000);
        }
        if (customId == "join_guesswho"){
            var msgID = interaction.message.id
            var playerList = GWPlayers[msgID] 
            if (!playerList) return interaction.deferUpdate();
            if (Object.values(GWStorage).filter(e=>e.player).length == 0) return interaction.deferUpdate();
            if (playerList.map(e=>e.id).includes(user.id)) return await interaction.reply({ content: "⚠️ You've already joined the game", ephemeral: true}).catch(e=>console.error("7. can't send error message for guess who"));
            var messageEmbed = interaction.message.embeds[0]
            playerList.push(user)
            messageEmbed.fields[0].value = playerList.map(u=>`- ${u}`).join("\n")
            await interaction.update({
                content: null, 
                embeds: [messageEmbed]
            }).catch(e=>console.error("6. Guess who message can't be edited"));
        }
    }
}

//create thread
async function createThread(message){
    const thread = await message.startThread({
        name: 'guess-who',
        autoArchiveDuration: 60,
    }).catch(e=>console.error("17. Cannot create thread"))
    await thread.setRateLimitPerUser(6 * 60 * 60).catch(e=>console.error("18. Cannot edit thread"));
    return thread
}

//updated buttons
function getButtons(selected){
    var buttons = topLeagues.map((league, n) => new MessageButton().setStyle('SECONDARY').setStyle(selected.includes(league) ? 'DANGER' : 'SECONDARY').setLabel(league).setEmoji(`${flagEmojis[n]}`).setCustomId(league));
    var startButton = new MessageButton().setStyle('SUCCESS').setLabel('ㅤㅤㅤㅤㅤStartㅤㅤㅤㅤㅤ').setCustomId('start_guesswho');
    var actionRow = new MessageActionRow().addComponents(buttons);
    var startRow = new MessageActionRow().addComponents(startButton);
    return [actionRow, startRow]
}