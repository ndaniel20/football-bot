const configure = require("../mongoDB/configure.js")
const delay = ms => new Promise(res => setTimeout(res, ms));
const line = "https://i.imgur.com/TX1ctG7.png"
const empty = "<:bl:746897514795499550>"
const goal = "<:pe:746901324167250010>"
const miss = "<:no:657315517991747584>"
const death = "<:pe:746879313609097216>"

module.exports = {
    startPenalties: async function(channel, players, color, round, scores, scoreLine, msg, msgContent, webhook, gameData){
        var taker = players[0]
        var keeper = players[1]
        
        var button1 = new MessageButton().setStyle('PRIMARY').setEmoji(`⚽`).setLabel("Left").setCustomId(`left`)
        var button2 = new MessageButton().setStyle('PRIMARY').setEmoji(`⚽`).setLabel("Center").setCustomId(`center`)
        var button3 = new MessageButton().setStyle('PRIMARY').setEmoji(`⚽`).setLabel("Right").setCustomId(`right`)
        var buttonRow = new MessageActionRow().addComponents(button1, button2, button3);

        var shootAim = ""
        var time = ((new Date().getTime() + 31000)/1000).toFixed(0)
        var embed = new MessageEmbed().setColor(color).setAuthor({name: taker.username, iconURL: `https://cdn.discordapp.com/avatars/${taker.id}/${taker.avatar}.png`}).setTitle("Choose your target for the shot").setDescription(`Time expires: <t:${time}:R>`).setImage(line)
        if (taker.id != bot.user.id) await webhook.editMessage(msg.id, {content: `<@${taker.id}>`,embeds: [embed],components: [buttonRow], threadId: channel.id}).catch(e=>console.error("14. Penalty message can't be edited", e))
        const filter1 = (i) => i.user.id == taker.id;
        if (taker.id == bot.user.id) var interaction1 = {customId: ["left", "center", "right"][Math.floor(Math.random()*3)]}
        else var interaction1 = await msg.awaitMessageComponent({ filter: filter1, componentType: 'BUTTON', time: 30000 }).catch(e=>e);
        if (interaction1 && interaction1.deferUpdate) {
            interaction1.deferUpdate();
        }
        shootAim = interaction1?.customId
        
        buttonRow.components.forEach(b=>{b.style = "DANGER";b.emoji.name = "🧤"})
        var diveAim = ""
        var time = ((new Date().getTime() + 31000)/1000).toFixed(0)
        var embed = new MessageEmbed().setColor(color).setAuthor({name: keeper.username, iconURL: `https://cdn.discordapp.com/avatars/${keeper.id}/${keeper.avatar}.png`}).setTitle("Pick a direction to defend the goal").setDescription(`Time expires: <t:${time}:R>`).setImage(line)
        if (keeper.id != bot.user.id) await webhook.editMessage(msg.id, {content: `<@${keeper.id}>`,embeds: [embed],components: [buttonRow], threadId: channel.id}).catch(e=>console.error("15. Penalty message can't be edited"))
        const filter2 = (i) => i.user.id == keeper.id;
        if (keeper.id == bot.user.id) var interaction2 = {customId: ["left", "center", "right"][Math.floor(Math.random()*3)]}
        else var interaction2 = await msg.awaitMessageComponent({ filter: filter2, componentType: 'BUTTON', time: 30000 }).catch(e=>e);
        if (interaction2 && interaction2.deferUpdate) {
            interaction2.deferUpdate();
        }
        diveAim = interaction2?.customId

        if (shootAim) gameData[taker.id][shootAim] += 1
        if (!shootAim){
            var title = "MISSED!"
            var str = `❌ ${taker.username} flops his penalty completly as it's hit off target`
            gameData[taker.id].missed += 1
            scores[taker.id].push(0)
            var url = "https://cdn.discordapp.com/attachments/1063411790303744050/1138818835194052668/saka.gif"
        }
        else if (shootAim == diveAim){
            var title = "SAVED!"
            var str = `✋ ${keeper.username} goes **${diveAim}** and prevents the ball from going in`
            gameData[taker.id].missed += 1
            gameData[keeper.id].saved += 1
            scores[taker.id].push(0)
            var url = "https://cdn.discordapp.com/attachments/1063411790303744050/1138818835194052668/saka.gif"
        } 
        else{
            var title = "GOAL!"
            var str = `⚽ \`${taker.username}\` shoots and slots his penalty to the **${shootAim}**`
            gameData[taker.id].scored += 1
            gameData[keeper.id].failed += 1
            scores[taker.id].push(1)
            var url = "https://cdn.discordapp.com/attachments/1063411790303744050/1138819756070281257/felix.gif"
        }
        embed.author = null
        embed.title = title
        embed.description = str
        embed.setImage(url)
        await webhook.editMessage(msg.id, {content: null,embeds: [embed],components: [], threadId: channel.id}).catch(e=>console.error("17. Penalty message can't be edited"))

        var allUsers = Object.keys(scores)
        var allValues = Object.values(scores)
        var score1 = allValues[0].filter(e=>e == 1).length
        var score2 = allValues[1].filter(e=>e == 1).length
        var boolean = this.verifyPenaties([score1, score2], round, round >= 5 ? Math.floor(round+1) : 5)
        if (boolean){
            if (score1 > score2) {
                gameData[allUsers[0]].win += 1
                gameData[allUsers[1]].loss += 1
                msgContent = `# \`Penalty Shootout\`\n<@${allUsers[0]}> has won against <@${allUsers[1]}> (${score1}-${score2})\n\n`
            }
            if (score1 < score2) {
                gameData[allUsers[1]].win += 1
                gameData[allUsers[0]].loss += 1
                msgContent = `# \`Penalty Shootout\`\n<@${allUsers[1]}> has won against <@${allUsers[0]}> (${score2}-${score1})\n\n`
            }
            webhook.active = false
            await this.updateScoreline(scoreLine, scores, msgContent)
            await channel.setLocked(true).catch(e=>console.error("21. can't lock thread"))
            await configure.updatePen(allUsers[0], gameData[allUsers[0]])
            await configure.updatePen(allUsers[1], gameData[allUsers[1]])
            return;
        }
        await this.updateScoreline(scoreLine, scores, msgContent)

        await delay(5000)
        players.reverse();
        round += 0.5
        this.startPenalties(channel, players, color, round, scores, scoreLine, msg, msgContent, webhook, gameData)
    },
    updateScoreline: async function(scoreLine, scores, msgContent){
        var player = Object.values(scores)
        var playerA = player[0]
        var playerB = player[1]
        var listA = playerA.map((e, n)=> e == 1 ? (n >= 5 ? death : goal) : miss)
        while (listA.length < 5) {
            listA.push(empty);
        }
        var listB = playerB.map((e, n)=> e == 1 ? (n >= 5 ? death : goal) : miss)
        while (listB.length < 5) {
            listB.push(empty);
        }
        
        msgContent += "## " + listA.join("") + "\n## " + listB.join("")
        await scoreLine.edit({content: msgContent, embeds: [], components: []}).catch(e=>console.error("5. Penalty message can't be edited"));
    },
    verifyPenaties: function(scores, i, maxRounds){
        if (i % 1 != 0) var a = 1
        else var a = 0
        i = Math.floor(i)
        if (scores[0] > scores[1]){
            var projected = scores[1] + (maxRounds - (i + a))
            if (scores[0] > projected) return true
        }
        if (scores[1] > scores[0]){
            var projected = scores[0] + (maxRounds - (i + 1))
            if (scores[1] > projected) return true
        }
        return false
    }
}

