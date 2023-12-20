const { webhookList } = require('../server.js');
const configure = require("../mongoDB/configure.js")
const gameJS = require("./game.js")
const color = "#45818e"
const line = "https://i.imgur.com/TX1ctG7.png"
const actives = []


module.exports = {
handleInteraction: async (interaction) => {
    const { commandName, options, user } = interaction;

    if (commandName == "penalty"){
        const opponent = options._hoistedOptions[0].user 
        if (actives.includes(user.id)) return await interaction.reply({ content: "⚠️ You have a request active already, wait for it to expire before making a new one", ephemeral: true}).catch(e=>console.error("0. can't send error message for penalty"));
        if (opponent.id == user.id) return await interaction.reply({ content: "⚠️ You can't play against yourself", ephemeral: true}).catch(e=>console.error("1. can't send error message for penalty"));
        actives.push(user.id)
        var button1 = new MessageButton().setStyle('SUCCESS').setLabel("Accept").setCustomId(`accept_penalty`)
        var button2 = new MessageButton().setStyle('DANGER').setLabel("Reject").setCustomId(`reject_penalty`)
        var buttonRow = new MessageActionRow().addComponents(button1, button2);
        var embed = new MessageEmbed().setColor(color).setAuthor({name: 'Penalty', iconURL: `https://i.imgur.com/RvGrh8L.png`}).setTitle(`${user.username} sent you a request`).setDescription(`<@${user.id}> is challenging you to a penalty shootout, do you accept?`).setTimestamp().setImage(line)
        await interaction.reply({ 
            content: `<@${opponent.id}>`,
            embeds: [embed],
            components: [buttonRow],
        }).catch(e=>console.error("2. Penalty message can't be sent"))
        var msg = await interaction.fetchReply().catch(e=>console.error("4. Can't fetch reply from penalty"))
        if (!msg) return;

        const filter = (i) => i.user.id == opponent.id;
        try {
            if (opponent.id == bot.user.id) var buttonInteraction = {customId: "accept_penalty"}
            else var buttonInteraction = await msg.awaitMessageComponent({ filter: filter, componentType: 'BUTTON', time: 30000 });
            if (buttonInteraction.customId == "accept_penalty"){
                if (buttonInteraction.deferUpdate) buttonInteraction.deferUpdate()
                actives.splice(actives.indexOf(user.id), 1)
                var channel = await createThread(msg).catch(e=>console.error("10. can't create thread"))
                var webhook = webhookList[interaction.guildId].randomHook();
                var mainMSG = await webhook.send({content: `<@${user.id}> <@${opponent.id}>`, threadId: channel.id}).catch(e=>console.error("16. can't send penalty message"))
                if (!channel) return;
                if (!mainMSG) return;
                var msgContent = `# \`Penalty Shootout\`\n<@${user.id}> vs <@${opponent.id}>\n\n`
                var scores = {[user.id]: [], [opponent.id]: []}
                await gameJS.updateScoreline(msg, scores, msgContent)
                var gameData = {[user.id]: {left: 0, center: 0, right: 0, saved: 0, failed: 0, win: 0, loss: 0, scored: 0, missed: 0, game: 1}, [opponent.id]: {left: 0, center: 0, right: 0, saved: 0, failed: 0, win: 0, loss: 0, scored: 0, missed: 0, game: 1}}
                gameJS.startPenalties(channel, [user,opponent], color, 0, scores, msg, mainMSG, msgContent, webhook, gameData)
            }
            if (buttonInteraction.customId == "reject_penalty"){
                if (buttonInteraction.deferUpdate) buttonInteraction.deferUpdate()
                actives.splice(actives.indexOf(user.id), 1)
                await msg.delete().catch(e=>console.error("3. Penalty message can't be deleted"));
            }
        } 
        catch(e) {
            actives.splice(actives.indexOf(user.id), 1)
            await msg.delete().catch(e=>console.error("6. Penalty message can't be deleted"));
        }

    }
    if (commandName == "penstats"){
        var member = options._hoistedOptions[0]?.user || user
        var stats = await configure.getPen(member.id)
        if (!stats) stats = {left: 0, center: 0, right: 0, saved: 0, failed: 0, win: 0, loss: 0, scored: 0, missed: 0, game: 0}
        var total = stats.left + stats.center + stats.right
        var embed = new MessageEmbed()
        .setColor(color)
        .setThumbnail(`https://cdn.discordapp.com/avatars/${member.id}/${member.avatar}.png`)
        .setDescription('\u200B')
        .setTitle("📊 Penalty Stats")
        .addFields(
            {name: "Goal Rate", value: `${Math.round((stats.scored/(stats.scored + stats.missed))*100)}%`, inline: true},
            {name: "Save Rate", value: `${Math.round((stats.saved/(stats.saved + stats.failed))*100)}%`, inline: true},
            {name: "Win Rate", value: `${Math.round((stats.win/(stats.win + stats.loss))*100)}%`, inline: true},
            {name: "Left", value: `${Math.round((stats.left/total)*100)}%`, inline: true},
            {name: "Center", value: `${Math.round((stats.center/total)*100)}%`, inline: true},
            {name: "Right", value: `${Math.round((stats.right/total)*100)}%`, inline: true}
        )
        .setFooter({text: `Games Played: ${stats.game}`})
        .setImage("https://i.imgur.com/LKWXzPo.png")

        await interaction.reply({ 
            embeds: [embed],
        }).catch(e=>console.error("2. Penalty message can't be sent"))
    }

}}


async function createThread(message){
    const thread = await message.startThread({
        name: 'penalties',
        autoArchiveDuration: 60,
    }).catch(e=>console.error("8. Cannot create penalties thread"))
    await thread.setRateLimitPerUser(6 * 60 * 60).catch(e=>console.error("9. Cannot edit penalties thread"));
    return thread
}
