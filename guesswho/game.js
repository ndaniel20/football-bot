const REMOVE = require('replace-special-characters');
const maxRounds = 15
const delay = ms => new Promise(res => setTimeout(res, ms));
const line = "https://i.imgur.com/TX1ctG7.png"
const questionModal = new Modal().setCustomId('gw-form').setTitle('Guess Who').addComponents([
    new MessageActionRow().addComponents(
        new TextInputComponent()
        .setCustomId('gw-form-question')
        .setLabel('Ask a question')
        .setStyle('SHORT')
        .setMinLength(1)
        .setMaxLength(100)
        .setPlaceholder('e.g. Has the player ever played for PSG?')
        .setRequired(true),
    ),
]);

const guessModal = new Modal().setCustomId('gw-form').setTitle('Guess Who').addComponents([
    new MessageActionRow().addComponents(
        new TextInputComponent()
        .setCustomId('gw-form-guess')
        .setLabel('Make a wild guess')
        .setStyle('SHORT')
        .setMinLength(1)
        .setMaxLength(100)
        .setPlaceholder('e.g. Lionel Messi')
        .setRequired(true),
    ),
]);

module.exports = {
    startGuessWho: async function(channel, players, answer, color, host, img, round, firstID, webhook){
        await delay(2000)
        var member = players[0]
        var id = member.id
        if (round == maxRounds){
            var question = new MessageEmbed().setImage(line).setAuthor({name: 'Guess Who', iconURL: `https://i.imgur.com/thhcjpK.png`}).setColor(color).setTitle("Nobody wins").setDescription(`Nobody managed to find the player after ${maxRounds} rounds\nThe player was **${answer}**`).setThumbnail(img)
            webhook.active = false
            await webhook.send({
                threadId: channel.id,
                embeds: [question], 
            }).catch(e=>console.error("17. Cannot edit guess who (game) message"))
            await channel.setLocked(true).catch(e=>console.error("21. can't lock thread"))
            return;
        }
        if (id == firstID) round += 1

        var time = ((new Date().getTime() + 46000)/1000).toFixed(0)
        var question = new MessageEmbed().setImage(line).setAuthor({name: 'Guess Who', iconURL: `https://i.imgur.com/thhcjpK.png`}).setColor(color).setTitle("Ask a question").setDescription(`Use the form below to ask a yes/no question to the host\nYour time expires <t:${time}:R>`)
        var questioButton = new MessageButton().setStyle('PRIMARY').setLabel('Question').setCustomId('ask_gwquestion').setEmoji(`❓`);
        var guessButton = new MessageButton().setStyle('SECONDARY').setLabel('Guess').setCustomId('guess_gwquestion').setEmoji(`🃏`);
        var actionRow = new MessageActionRow().addComponents(questioButton, guessButton);
        var questionMessage = await webhook.send({
            threadId: channel.id,
            content: `<@${id}>`,
            embeds: [question],
            components: [actionRow]
        }).catch(e=>console.error("12. Cannot send guess who (game) message"))

        const filter1 = (i) => i.user.id === id;
        const filter2 = (i) => i.user.id === host;
        var query = ""
        var guess = ""

        // Question
        try {
            var lastTime = (time - (new Date().getTime()/1000)) * 1000
            const buttonInteraction = await questionMessage.awaitMessageComponent({ filter: filter1, componentType: 'BUTTON', time: lastTime });
            if (buttonInteraction.customId == "ask_gwquestion"){
                await buttonInteraction.showModal(questionModal);
                var lastTime = (time - (new Date().getTime()/1000)) * 1000
                const modalInteraction = await buttonInteraction.awaitModalSubmit({ filter: filter1, time: lastTime })
                modalInteraction.deferUpdate()
                query = modalInteraction.fields.components[0].components[0].value
                modalInteraction.close();
            }
            if (buttonInteraction.customId == "guess_gwquestion"){
                await buttonInteraction.showModal(guessModal);
                var lastTime = (time - (new Date().getTime()/1000)) * 1000
                const modalInteraction = await buttonInteraction.awaitModalSubmit({ filter: filter1, time: lastTime })
                modalInteraction.deferUpdate()
                guess = modalInteraction.fields.components[0].components[0].value
                modalInteraction.close();
            }
        }
        catch (error){
            var lastName = answer.split(" ")
            if (lastName.length > 1) lastName = lastName.slice(1).join(" ").replace(/[-\s]/g, '').toLowerCase()
            else lastName = answer

            if (answer.replace(/[-\s]/g, '').toLowerCase() == REMOVE(guess.replace(/[-\s]/g, '').toLowerCase()) || lastName == REMOVE(guess.replace(/[-\s]/g, '').toLowerCase())){
                question.title = "The player has been guessed correctly"
                question.description = `The player was **"${answer}"**`
                question.setThumbnail(img)
                question.footer = {text: `Guess made by ${member.username}`, iconURL: `https://cdn.discordapp.com/avatars/${member.id}/${member.avatar}.png`}
                webhook.active = false
                await webhook.editMessage(questionMessage.id, {embeds: [question], components: [], threadId: channel.id}).catch(e=>console.error("14. Cannot edit guess who (game) message"))
                await channel.setLocked(true).catch(e=>console.error("20. can't lock thread"))
                return;
            }
            if (guess.length > 0){
                question.title = "A wrong guess was made"
                question.description = `**"${guess}"** is incorrect`
                question.setThumbnail("https://i.imgur.com/BcilwPN.png")
                question.footer = {text: `Guess made by ${member.username}`, iconURL: `https://cdn.discordapp.com/avatars/${member.id}/${member.avatar}.png`}
                await webhook.editMessage(questionMessage.id, {embeds: [question], components: [], threadId: channel.id}).catch(e=>console.error("15. Cannot edit guess who (game) message"))
                this.nextBatch(players, member);
                this.startGuessWho(channel, players, answer, color, host, img, round, firstID, webhook)
                return;
            }
            if (query.length < 1) {
                await questionMessage.delete().catch(e=>console.error("16. Cannot delete guess who (game) message"))
                this.nextBatch(players, member);
                this.startGuessWho(channel, players, answer, color, host, img, round, firstID, webhook)
                return;
            }
            question.title = "Answer the question"
            question.description = query
            question.footer = {text: `Question asked by ${member.username}`, iconURL: `https://cdn.discordapp.com/avatars/${member.id}/${member.avatar}.png`}
            var buttons = ["Yes", "No"].map((boolean, n) => new MessageButton().setStyle(["SUCCESS", "DANGER"][n]).setLabel(boolean).setCustomId(`answer_gwquestion_${n}`));
            var actionRow = new MessageActionRow().addComponents(buttons);
            await webhook.editMessage(questionMessage.id, {content: `<@${host}>`,embeds: [question], components: [actionRow], threadId: channel.id}).catch(e=>console.error("13. Cannot edit guess who (game) message"))
        }


        // Answer
        try {
            const buttonInteraction2 = await questionMessage.awaitMessageComponent({ filter: filter2, componentType: 'BUTTON', time: 45000 });
            if (buttonInteraction2.customId == "answer_gwquestion_0") question.setThumbnail("https://i.imgur.com/Lr66tls.png")
            if (buttonInteraction2.customId == "answer_gwquestion_1") question.setThumbnail("https://i.imgur.com/BcilwPN.png")
            
            await webhook.editMessage(questionMessage.id, {content: `<@${host}>`, embeds: [question], components: [], threadId: channel.id}).catch(e=>console.error("13. Cannot edit guess who (game) message"))
            buttonInteraction2.deferUpdate()
            buttonInteraction2.close()
        }
        catch (error){
            this.nextBatch(players, member);
            this.startGuessWho(channel, players, answer, color, host, img, round, firstID, webhook)
        }

    },
    nextBatch: function (players, member){
        players.shift();
        players.push(member);
        return players
    }
}