const { webhookList } = require('../server.js');
const gameJS = require("./game.js")
const allModes = ['Wiki', 'Who Is', 'Clubs'/*, "POV"*/];
const modeEmojis = ['🌐', '🖼️', '🛡️'/*, '🔎'*/];
const color = "#933ae7"
const line = "https://i.imgur.com/TX1ctG7.png"
var BQStorage = {};
var BQPlayers = {}

//message
module.exports = {
    handleInteraction: async (interaction) => {
    const { commandName, options, user } = interaction;

    if (commandName == "balliq"){
        const userId = user.id
        BQStorage[userId] ??= {};
        BQStorage[userId].modes ??= []
        var selected = BQStorage[userId].modes
        var actionRow = getButtons(selected);
        var embed = new MessageEmbed().setImage("https://i.imgur.com/GfHOlE5.png").setColor(color).setAuthor({name: 'Ball IQ', iconURL: `https://i.imgur.com/UlcGnSx.png`}).setDescription(`Pick the modes the game should consist of`)
        await interaction.reply({ 
            content: `<@${user.id}>`,
            embeds: [embed],
            components: actionRow,
            ephemeral: true
        }).catch(e=>console.error("1. Ball IQ message can't be sent"))
    }
    },
    buttonInteraction: async (interaction) => {
        const { customId, user } = interaction;

        if (allModes.includes(customId)){
            const userId = user.id
            BQStorage[userId] ??= {};
            BQStorage[userId].modes ??= []
            var selected = BQStorage[userId].modes
            var index = selected.indexOf(customId)
            if (index >= 0) selected.splice(index, 1)
            else selected.push(customId)
            var actionRow = getButtons(selected);
            interaction.update({
                components: actionRow
            })
        }
        if (customId == "start_balliq"){
            const userId = user.id
            var msgID = interaction.message.id
            BQStorage[userId] ??= {};
            BQStorage[userId].modes ??= []

            var selected = BQStorage[userId].modes
            if (selected.length == 0) return interaction.deferUpdate()
            await interaction.update({components: []}).catch(e=>console.error("11. Can't edit ball iq message"))
            var time = ((new Date().getTime() + 31000)/1000).toFixed(0)
            var confirmation = new MessageEmbed().setColor(color).setImage(line).setAuthor({name: 'Ball IQ', iconURL: `https://i.imgur.com/UlcGnSx.png`}).setThumbnail(user.displayAvatarURL({ format: 'png', dynamic: true, size: 128 })).setTitle(`**${user.username}** has started a game of Ball IQ`).setDescription(`The game commences <t:${time}:R>`).addFields({name: "Players", value: "\u200B"}).setFooter({text: `Modes: ${selected.map(e =>e ).join(", ")}`})
            var buttons = new MessageButton().setStyle('SUCCESS').setLabel('ㅤㅤㅤㅤㅤJoinㅤㅤㅤㅤㅤ').setCustomId('join_balliq');
            var actionRow = new MessageActionRow().addComponents(buttons);
            var msg = await interaction.followUp({
                embeds: [confirmation],
                components: [actionRow]
            }).catch(e=>console.error("5. Ball IQ follow-up message can't be sent"));
            BQPlayers[msg.id] ??= []
            var playerList = BQPlayers[msg.id]
            playerList.push(user)

            setTimeout(async() => {
                if (playerList.length < 2) {
                    delete BQPlayers[msg.id]
                    await msg.edit({content: "⚠️ Not enough players have joined", embeds: [], components: []}).catch(e=>console.error("8. Ball IQ message can't be edited"));
                }
                else  {
                    var messageEmbed = msg.embeds[0]
                    var channel = await createThread(msg).catch(e=>console.error("25. can't create thread"))
                    var webhook = webhookList[interaction.guildId].randomHook();
                    if (!channel) return;
                    await webhook.send({threadId: channel.id, content: "# Players List:\n" + playerList.map(u=>`- <@${u.id}>`).join("\n") + "\n``` ```"}).catch(e=>console.error("19. Ball IQ message can't be sent"));
                    messageEmbed.description = `Game started on <#${channel.id}>`
                    messageEmbed.fields[0].value = playerList.map(u=>`- ${u}`).join("\n")
                    msg.edit({embeds: [messageEmbed], components: []}).catch(e=>console.error("9. Ball IQ message can't be edited"));
                    delete BQPlayers[msg.id]
                    var storeSelected = [...selected]
                    gameJS.startBallIQ(channel, playerList, storeSelected, color, 0, {}, webhook)
                }
                
            }, 30000);
        }
        if (customId == "join_balliq"){
            var msgID = interaction.message.id
            var playerList = BQPlayers[msgID] 
            if (!playerList) return interaction.deferUpdate();
            if (playerList.map(e=>e.id).includes(user.id)) return await interaction.reply({ content: "⚠️ You've already joined the game", ephemeral: true}).catch(e=>console.error("7. can't send error message for Ball IQ"));
            var messageEmbed = interaction.message.embeds[0]
            playerList.push(user)
            messageEmbed.fields[0].value = playerList.map(u=>`- ${u}`).join("\n")
            await interaction.update({
                content: null, 
                embeds: [messageEmbed]
            }).catch(e=>console.error("6. Ball IQ message can't be edited"));
        }
    }
}

//create thread
async function createThread(message){
    const thread = await message.startThread({
        name: 'ball-iq',
        autoArchiveDuration: 60,
    }).catch(e=>console.error("17. Cannot create thread"))
    return thread
}

//updated buttons
function getButtons(selected){
    var buttons = allModes.map((mode, n) => new MessageButton().setStyle('SECONDARY').setStyle(selected.includes(mode) ? 'DANGER' : 'SECONDARY').setLabel(mode).setEmoji(`${modeEmojis[n]}`).setCustomId(mode));
    var startButton = new MessageButton().setStyle('SUCCESS').setLabel('ㅤㅤㅤㅤㅤStartㅤㅤㅤㅤㅤ').setCustomId('start_balliq');
    var actionRow = new MessageActionRow().addComponents(buttons);
    var startRow = new MessageActionRow().addComponents(startButton);
    return [actionRow, startRow]
}

//timer for the ball iq game
function setTimer(userId){
    console.log("times up")
    delete BQStorage[userId]
}