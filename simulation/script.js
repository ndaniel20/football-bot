const { webhookList } = require('../server.js');
const simulate = require('./simulate.js')
const teamInfo = require("../data/teamInfo.json")
const delay = ms => new Promise(res => setTimeout(res, ms));
const color = "#741b47"
const line = "https://i.imgur.com/TX1ctG7.png"
const simObj = {}

module.exports = {
    handleInteraction: async (interaction) => {
        const { commandName, options, user } = interaction;

        if (commandName == "simulate" || interaction.customId == "second_match"){
            if (interaction.isButton()){
                interaction.deferUpdate();
                var firstObj = simObj[interaction.message.id]
                if (!firstObj) return;
                if (firstObj.id != user.id) return;
                if (firstObj.isPlayed) return;
                firstObj.isPlayed = true
                var n1 = firstObj.teams[1]
                var n2 = firstObj.teams[0]
                var firstLeg = firstObj.firstLeg
            }else{
                await interaction.deferReply();
                var msg = await interaction.fetchReply().catch(e=>console.error("4. Can't fetch reply from simulation"))
                await msg.delete().catch(e=>console.error("5. Can't delete reply from simulation"))
                var n1 = options._hoistedOptions[0].value
                var n2 = options._hoistedOptions[1].value
            }
            var t1 = teamInfo.find(t=>t.x == n1)
            var t2 = teamInfo.find(t=>t.x == n2)
            if (!t1 || !t2) return;
            const info1 = JSON.parse(JSON.stringify(t1))
            const info2 = JSON.parse(JSON.stringify(t2))
            var game = simulate.setTwoTeams(info1, info2, firstLeg)
            var webhook = webhookList[interaction.guildId].randomHook();

            var history = game.history
            var embed = new MessageEmbed().setColor(color).setAuthor({name: 'Simulation', iconURL: `https://i.imgur.com/9qKUdgH.png`}).setImage(game.stadium ? `${game.stadium}/preview` : "").setTitle(`${game.teams[0]} vs ${game.teams[1]}`)
            var msg = await webhook.send({ embeds: [embed]}).catch(e=>console.error("2. Simulation message can't be sent", e))
            if (!msg) return;
            simObj[msg.id] = {teams: game.teams, skip: false, view: 1, id: user.id}
            var button1 = new MessageButton().setStyle('SECONDARY').setLabel("Skip").setEmoji("⏩").setCustomId(`skip_match_${msg.id}`)
            var button2 = new MessageButton().setStyle('SECONDARY').setLabel("View").setEmoji("🎦").setCustomId(`view_match_${msg.id}`)
            var button3 = new MessageButton().setStyle('SECONDARY').setLabel("Second Leg").setEmoji("🔁").setCustomId(`second_match`)
            var buttonRow = new MessageActionRow().addComponents(button1, button2);
            history.push(game)
            var match1 = new MessageEmbed().setColor(color).setURL('https://leekspin.ytmnd.com/')
            var match2 = new MessageEmbed().setColor(color).setURL('https://leekspin.ytmnd.com/')
            var _match1 = new MessageEmbed().setURL('https://leekspin.ytmnd.com/').setDescription(".")
            var _match2 = new MessageEmbed().setURL('https://leekspin.ytmnd.com/').setDescription(".")
            var obj = simObj[msg.id]

            await delay(5000)
            for (let i = 0; i < history.length; i++) {
                if (obj.skip) i = history.length - 1;
                var display = history[i]
                var view = obj.view
                simulate.createEmbed1(display, match1, _match1, firstLeg)
                simulate.createEmbed2(display, match2, _match2, firstLeg)
                if (i == history.length - 1 && !firstLeg) buttonRow.components.push(button3)
                
                await webhook.editMessage(msg.id, { 
                    embeds: view == 1 ? [match1, _match1] : [match2, _match2],
                    components: [buttonRow]
                }).catch(e=>console.error("3. Simulation message can't be edited"))
                await delay(500)
            }
            obj.webhook = webhook
            obj.views = [[match1, _match1], [match2, _match2]]
            obj.firstLeg = {scores: [game.goals[1], game.goals[0]], isFinal: false}
            webhook.active = false
        }
    },
    buttonInteraction: async (interaction) => {
        const { customId, user } = interaction;

        if (customId.startsWith("skip_match")){
            var msgId = customId.split("_").pop()
            var obj = simObj[msgId]
            if (!obj) return interaction.deferUpdate();
            if (obj.id != user.id) return interaction.deferUpdate(); 
            if (obj.skip == true) return interaction.deferUpdate(); 

            obj.skip = true
            interaction.deferUpdate();
        }

        if (customId.startsWith("view_match")){
            var msgId = customId.split("_").pop()
            var obj = simObj[msgId]
            if (!obj) return interaction.deferUpdate();
            if (obj.id != user.id) return interaction.deferUpdate(); 
            interaction.deferUpdate();
            if (obj.view == 1) obj.view = 2
            else obj.view = 1

            if (obj.views){
                await obj['webhook'].editMessage(interaction.message.id, { 
                    embeds: [obj.views[obj.view-1][0], obj.views[obj.view-1][1]],
                    components: interaction.message.components
                }).catch(e=>console.error("6. Simulation message can't be edited", e))
            }
        }

    }
}