const simulate = require('../simulation/simulate.js')
const color = "#93c47d"
const line = "https://i.imgur.com/TX1ctG7.png"
const delay = ms => new Promise(res => setTimeout(res, ms));


module.exports = {
    startTournament: async function(channel, obj, webhook){
        var participants = obj.list
        var playerList = obj.playerList
        var interactions = obj.interactions
        var pairs = this.drawTeams(participants)
        var type = participants.length == 2 ? "Final" : participants.length == 4 ? "Semi Final" : participants.length == 8 ? "Quarter Final" : "Round of 16" 
        var round = this.createEmbed(type, pairs)
        var roundMSG = await webhook.send({ content: "``` ```\n" + participants.map(p=>`<@${p}>`).join(""), embeds: [round], threadId: channel.id}).catch(e=>console.error("9. Thread message can't be sent", e))

        for (var i = 0; i < pairs.length; i++){
            var id = pairs[i]
            var embed = new MessageEmbed().setColor(color).setAuthor({name: 'Drafts', iconURL: `https://i.imgur.com/DOo1xqu.png`}).setDescription(`<@${id[0]}> vs <@${id[1]}>`)
            var msg = await webhook.send({ embeds: [embed], threadId: channel.id}).catch(e=>console.error("2. Thread message can't be sent", e))
            if (!msg) continue;
            var userNames1 = interactions.find(e=>e.user.id == id[0]).user.username
            var userNames2 = interactions.find(e=>e.user.id == id[1]).user.username
            var info1 = this.constructInfo(playerList[id[0]].players, playerList[id[0]].formation, userNames1)
            var info2 = this.constructInfo(playerList[id[1]].players, playerList[id[1]].formation, userNames2)
            var firstLeg = {scores: [0, 0], isFinal: true}
            var game = simulate.setTwoTeams(info1, info2, firstLeg)
            var history = game.history
            history.push(game)
            var match = new MessageEmbed().setColor(color).setURL('https://leekspin.ytmnd.com/')
            var loser = game.goals[0] > game.goals[1] ? id[1] : id[0]

            for (let i = 0; i < history.length; i++) {
                var display = history[i]
                simulate.createEmbed3(display, match, firstLeg)
                
                await webhook.editMessage(msg.id, { 
                    embeds: [match],
                    threadId: channel.id
                }).catch(e=>console.error("3. Thread message can't be edited"))
                await delay(500)
            }
            pairs[i][2] = `\`${game.goals[0]}-${game.goals[1]}\``
            round = this.createEmbed(type, pairs)
            await webhook.editMessage(roundMSG.id, {embeds: [round], threadId: channel.id}).catch(e=>console.error("12. Thread message can't be sent", e))
            obj.list.splice(participants.indexOf(loser), 1)
        }
        if (obj.list.length == 1){
            var winner = obj.list[0]
            var user = interactions.find(e=>e.user.id == winner).user
            webhook.active = false
            var winnerEmbed = new MessageEmbed().setColor(color).setImage(line).setAuthor({name: 'Drafts', iconURL: `https://i.imgur.com/DOo1xqu.png`}).setTitle("Tournament Finished").setDescription(`<@${winner}> won the drafts tournament!`).setThumbnail(`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`)
            await channel.setLocked(true).catch(e=>console.error("11. can't lock thread"))
            await webhook.send({ embeds: [winnerEmbed], threadId: channel.id}).catch(e=>console.error("11. Thread message can't be sent", e))
            await channel.parent.send({embeds: [winnerEmbed]}).catch(e=>console.error("16. Thread message can't be sent"))
            return;
        }
        this.startTournament(channel, obj, webhook)
    },
    constructInfo: function(players, formation, id){
        return {
            x: id,
            team: JSON.parse(JSON.stringify(players)).reverse(),
            formation: formation,
            bench: [],
            tactic: {"formation":formation,"height":65,"length":65,"width":50,"pressing":"Balanced Pressure","marking":"Zonal Marking","timeWasting":false,"offsideTrap":true,"offensiveStyle":"Possession","transition":"Medium","corners":8,"fullbacks":"Wing-Back"}
        }
    },
    drawTeams: function(array){
        const shuffledArray = array.slice().sort(() => Math.random() - 0.5);
        const pairs = [];
    
        for (let i = 0; i < shuffledArray.length; i += 2) {
            const pair = [shuffledArray[i], shuffledArray[i + 1], "vs"];
            pairs.push(pair);
        }
    
        return pairs;
    },
    createEmbed: function(type, pairs){
        var round = new MessageEmbed().setColor(color).setAuthor({name: 'Drafts', iconURL: `https://i.imgur.com/DOo1xqu.png`}).setTitle(type).setDescription(pairs.map(id=>`<@${id[0]}> ${id[2]} <@${id[1]}>`).join("\n")).setImage(line)
        return round
    }
}