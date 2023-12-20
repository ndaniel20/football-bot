const similarity = require('similarity')
const {flag} = require('country-emoji');
const playersList = require("../data/options.json")
const teams = require("./teams.json")
const REMOVE = require('replace-special-characters');
const line = "https://i.imgur.com/TX1ctG7.png"
const maxRounds = 15
const customFlags = {'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿','Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿','England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿','Ivory Coast': '🇨🇮'}
const delay = ms => new Promise(res => setTimeout(res, ms));

module.exports = {
    startBallIQ: async function(channel, players, modes, color, round, leaderboard, webhook){
        if (round == maxRounds) {
            var entries = Object.entries(leaderboard).sort((a, b) => b[1] - a[1])
            var description = entries.map((e, n)=>`${n+1}. <@${e[0]}> \`${e[1]}\``).join("\n")
            var leaderEmbed = new MessageEmbed().setAuthor({name: 'Ball IQ', iconURL: `https://i.imgur.com/UlcGnSx.png`}).setColor(color).setImage(line).setTitle(`👑 Leaderboard`).setDescription(description)
            
            webhook.active = false
            await webhook.send({embeds: [leaderEmbed], threadId: channel.id}).catch(e=>console.error("16. Ball IQ message can't be sent"))
            await channel.parent.send({embeds: [leaderEmbed]}).catch(e=>console.error("16. Ball IQ message can't be sent"))
            await channel.setLocked(true).catch(e=>console.error("17. can't lock thread"))
            return
        }
        var boolean = {isFound: false}
        var mode = modes[Math.floor(Math.random()*modes.length)]
        round += 1
        var allIDs = players.map(u=>u.id)
        if (mode == "Wiki") var [answer, alternative, imgURL, embed] = this.BQWiki(channel, color, round, boolean, webhook)
        if (mode == "Who Is") var [answer, alternative, imgURL, embed] = this.BQWhoIs(channel, color, round, boolean, webhook)
        if (mode == "Clubs") var [answer, alternative, imgURL, embed] = this.BQClubs(channel, color, round, boolean)
        //if (mode == "POV") var [answer, alternative, imgURL, embed] = this.BQPov(channel, color, round, boolean)

        var msg = await webhook.send({embeds: [embed], threadId: channel.id}).catch(e=>console.error("12. Ball IQ message can't be sent"))
        const filter = (m) => allIDs.includes(m.author.id);
        const collector = channel.createMessageCollector({ filter: filter, time: 45000});
        var lastTime = new Date().getTime()

        collector.on('collect', async (collected) => {
            var guess = collected.content
            if (answer.some(a=>a.replace(/[-\s]/g, '').toLowerCase() == REMOVE(guess.replace(/[-\s]/g, '').toLowerCase())) || alternative.some(a=>a == REMOVE(guess.replace(/[-\s]/g, '').toLowerCase()))){
                var user = collected.author
                var diffTime = ((new Date().getTime() - lastTime)/1000).toFixed(2)
                if (mode == "POV") var congratEmbed = new MessageEmbed().setAuthor({name: 'Ball IQ', iconURL: `https://i.imgur.com/UlcGnSx.png`}).setThumbnail(imgURL).setColor(color).setImage(line).setTitle(`**${user.username}** has found the answer!`).setDescription(`👍 That answer is in the list\nThe answer was found in *${diffTime} seconds*\n\n__Possible Answers:__\n${answer.map(e=>`- ${e}`).slice(0, 10).join("\n")}`).setFooter({text: user.username, iconURL: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`})
                else var congratEmbed = new MessageEmbed().setAuthor({name: 'Ball IQ', iconURL: `https://i.imgur.com/UlcGnSx.png`}).setThumbnail(imgURL).setColor(color).setImage(line).setTitle(`**${user.username}** has found the answer!`).setDescription(`👍 The answer was **${answer[0]}**\nThe answer was found in *${diffTime} seconds*`).setFooter({text: user.username, iconURL: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`})
                await webhook.send({embeds: [congratEmbed], threadId: channel.id}).catch(e=>console.error("14. Ball IQ message can't be sent"))
                boolean.isFound = true
                leaderboard[user.id] = (leaderboard[user.id] || 0) + 1
                return collector.stop()
            }

            var close = answer.concat(alternative).map(a=>similarity(guess, a))
            if (close.some(n=>n >= 0.75)) await collected.react("🥵")
        });

        collector.on('end', async(collected, reason) => {
            if (!boolean.isFound){
                if (mode == "POV") var lossEmbed = new MessageEmbed().setAuthor({name: 'Ball IQ', iconURL: `https://i.imgur.com/UlcGnSx.png`}).setThumbnail(imgURL).setColor(color).setTitle(`❌ Nobody found the answer in time`).setImage(line).setDescription(`__Possible Answers:__\n${answer.map(e=>`- ${e}`).slice(0, 10).join("\n")}`)
                else var lossEmbed = new MessageEmbed().setAuthor({name: 'Ball IQ', iconURL: `https://i.imgur.com/UlcGnSx.png`}).setThumbnail(imgURL).setColor(color).setTitle(`❌ Nobody found the answer in time`).setImage(line).setDescription(`The answer was **${answer[0]}**`)
                await webhook.send({embeds: [lossEmbed], threadId: channel.id}).catch(e=>console.error("15. Ball IQ message can't be sent"))
            }
            embed.description = embed.description.split("\n").slice(1).join("\n")
            await webhook.editMessage(msg.id, {embeds: [embed], threadId: channel.id}).catch(e=>console.error("13. Ball IQ message can't be edited"))
            await delay(5000)
            this.startBallIQ(channel, players, modes, color, round, leaderboard, webhook)
        });
    },
    BQWhoIs: function(channel, color, round, boolean, webhook){
        var randomItem = playersList[Math.floor(Math.random()*playersList.length)]
        var answer = randomItem.name
        var imgURL = `https://img.fminside.net/facesfm23/${randomItem.id}.png`
        var alternative = findAlternative(answer)
        var playerFlag = getFlag(randomItem.nation)
        var images = randomItem.images
        var randomImage = images[Math.floor(Math.random()*images.length)]
        var allHints = [`\`${censorName(answer)}\``, `Player's current age: \`${calculateAge(randomItem.date)}\``, `Player's primary position: \`${randomItem.position}\``, `Player's nation: ${playerFlag}`]
        const hint = new MessageEmbed().setAuthor({name: 'Ball IQ', iconURL: `https://i.imgur.com/UlcGnSx.png`}).setColor(color).setImage(line).setTitle("🔍 " + allHints[Math.floor(Math.random()*(!playerFlag ? 3 : 4))])
        setTimeout(async () =>{
            if (!boolean.isFound){
                await webhook.send({embeds: [hint], threadId: channel.id}).catch(e=>console.error("16. Ball IQ hint message can't be sent"))
            }
        },30000)

        var time = ((new Date().getTime() + 46000)/1000).toFixed(0)
        var embed = new MessageEmbed().setAuthor({name: 'Ball IQ', iconURL: `https://i.imgur.com/UlcGnSx.png`}).setColor(color).setImage(randomImage).setTitle("Who is this player?").setDescription(`Time runs out <t:${time}:R>`).setFooter({text: `Round ${round}`})
        return [[answer], [alternative], imgURL, embed]
    },
    BQWiki: function(channel, color, round, boolean, webhook){
        var randomItem = playersList[Math.floor(Math.random()*playersList.length)]
        var answer = randomItem.name
        var imgURL = `https://img.fminside.net/facesfm23/${randomItem.id}.png`
        var alternative = findAlternative(answer)
        var playerWiki = randomItem.wiki
        var playerFlag = getFlag(randomItem.nation)
        var allHints = [`\`${censorName(answer)}\``, `Player's current age: \`${calculateAge(randomItem.date)}\``, `Player's primary position: \`${randomItem.position}\``, `Player's nation: ${playerFlag}`]
        const hint = new MessageEmbed().setAuthor({name: 'Ball IQ', iconURL: `https://i.imgur.com/UlcGnSx.png`}).setColor(color).setImage(line).setTitle("🔍 " + allHints[Math.floor(Math.random()*(!playerFlag ? 3 : 4))])
        setTimeout(async () =>{
            if (!boolean.isFound){
                await webhook.send({embeds: [hint], threadId: channel.id}).catch(e=>console.error("16. Ball IQ hint message can't be sent"))
            }
        },30000)

        var time = ((new Date().getTime() + 46000)/1000).toFixed(0)
        const formattedRows = playerWiki.map(([years, team, apps, goals]) => {
            var yearSplit = years.split("–")
            var formattedYears = yearSplit[0] + "–" + (yearSplit[1] ? yearSplit[1].slice(-2) : "")
            return `| ${formattedYears.padEnd(9)} | ${removeKeywords(team).padEnd(19)}| ${apps.padEnd(5)} | ${goals.padEnd(5)} |`;
        });
    
        const header = "|  'Years'  |       'Team'       | 'App' | 'Gls' |";
        const separator = '+-----------+--------------------+-------+-------+';
        const formattedTable = [separator, header, separator, ...formattedRows, separator].join('\n');
          
        var embed = new MessageEmbed().setAuthor({name: 'Ball IQ', iconURL: `https://i.imgur.com/UlcGnSx.png`}).setColor(color).setTitle("Who is this player?").setDescription(`Time runs out <t:${time}:R>\n\n\`\`\`ml\n${formattedTable}\n\`\`\``).setFooter({text: `Round ${round}`})
        return [[answer], [alternative], imgURL, embed]
    },
    BQClubs: function (channel, color, round, boolean){
        var clubs = Object.entries(teams)
        var randomItem = clubs[Math.floor(Math.random()*clubs.length)]
        var years = Object.entries(randomItem[1].years)
        var randomYear = years[Math.floor(Math.random()*years.length)]
        var imgURL = `https://cdn.sofifa.net/meta/team/${randomItem[0]}/240.png`
        var alternative = []
        var answer = randomItem[1].options
        var yearFormat = `${1999 + parseInt(randomYear[0])}-${randomYear[0]}`

        var time = ((new Date().getTime() + 46000)/1000).toFixed(0)
        var embed = new MessageEmbed().setAuthor({name: 'Ball IQ', iconURL: `https://i.imgur.com/UlcGnSx.png`}).setColor(color).setTitle(`${yearFormat}`).setDescription(`Time runs out <t:${time}:R>`).setImage(randomYear[1]).setFooter({text: `Round ${round}`})
        return [answer, [alternative], imgURL, embed]
    },
    BQPov: function (channel, color, round, boolean){
        //club, league, position, age, nation
        var list = playersList.filter(e=>e.club != "Free agent")
        var randomItem = list[Math.floor(Math.random()*list.length)]
        var club = randomItem.club
        var league = randomItem.league
        var position = getPosition(randomItem.position)
        var range = getAgeRange(calculateAge(randomItem.date))
        var nation = randomItem.nation
        var randomnumber = Math.floor((Math.random() * 8))

        var n1 = playersList.filter(e=>e.club != "Free agent").filter(e=>e.club == club && position == getPosition(e.position))
        var n2 = playersList.filter(e=>e.club != "Free agent").filter(e=>e.club == club && nation == e.nation)
        var n3 = playersList.filter(e=>e.club != "Free agent").filter(e=>e.league == league && nation == e.nation)
        var n4 = playersList.filter(e=>e.club != "Free agent").filter(e=>e.league == league && position == getPosition(e.position))
        var n5 = playersList.filter(e=>e.club != "Free agent").filter(e=>e.nation == nation && position == getPosition(e.position))
        var n6 = playersList.filter(e=>e.club != "Free agent").filter(e=>getAgeRange(calculateAge(e.date))[0] == range[0] && position == getPosition(e.position))
        var n7 = playersList.filter(e=>e.club != "Free agent").filter(e=>getAgeRange(calculateAge(e.date))[0] == range[0] && e.league == league)
        var n8 = playersList.filter(e=>e.club != "Free agent").filter(e=>e.nation == nation && e.league == league && position == getPosition(e.position))
        var possible = [n1, n2, n3, n4, n5, n6, n7, n8]
        var picked = possible[randomnumber]
        var answer = shuffle(picked.map(e=>e.name))
        var alternative = answer.map(e=>findAlternative(e))
        var str = ""
        var ageStr = range[0] == 30 ? `${range[0]}+` : `${range[0]}-${range[1]}`
        if (randomnumber == 0) str = `POV: You can't name a player who plays as a **${position}** and plays for **${club}**`
        if (randomnumber == 1) str = `POV: You can't name a player who's from **${nation}** and plays for **${club}**`
        if (randomnumber == 2) str = `POV: You can't name a player who's from **${nation}** and plays in the **${league}**`
        if (randomnumber == 3) str = `POV: You can't name a player who plays as a **${position}** and plays in the **${league}**`
        if (randomnumber == 4) str = `POV: You can't name a player who's from **${nation}** and plays as a **${position}**`
        if (randomnumber == 5) str = `POV: You can't name a player who's **${ageStr}** years old and plays as a **${position}**`
        if (randomnumber == 6) str = `POV: You can't name a player who's **${ageStr}** years old and plays in the **${league}**`
        if (randomnumber == 7) str = `POV: You can't name a player who's from **${nation}**, plays in the **${league}** and plays as a **${position}**`

        var time = ((new Date().getTime() + 46000)/1000).toFixed(0)
        var embed = new MessageEmbed().setAuthor({name: 'Ball IQ', iconURL: `https://i.imgur.com/UlcGnSx.png`}).setColor(color).setTitle(`Name a player`).setDescription(`Time runs out <t:${time}:R>\n\n${str}\n\n`).setFooter({text: `Round ${round}`})
        return [answer, alternative, "", embed]
    }
}

function findAlternative(answer){
    var alternative = answer.split(" ")
    if (alternative.length > 1) alternative = alternative.slice(1).join(" ").replace(/[-\s]/g, '').toLowerCase()
    else alternative = answer
    return alternative
}

function getPosition(position) {
    if (["ST"].includes(position)) return "Striker"
    if (["LW", "LM", "RM", "RW"].includes(position)) return "Winger"
    if (["AM", "CM", "DM"].includes(position)) return "Midfielder"
    if (["RB", "RWB"].includes(position)) return "Right Back"
    if (["LB", "LWB"].includes(position)) return "Left Back"
    if (["CB"].includes(position)) return "Center Back"
    if (["GK"].includes(position)) return "Goalkeeper"
}

function getAgeRange(age){
    if (age <= 23) return [0, 23]
    if (age >= 24 && age <= 29) return [24, 29]
    if (age >= 30 ) return [30, 100]
}

function calculateAge(birthDate) {
    const birthYear = new Date(birthDate).getUTCFullYear();
    const currentYear = new Date().getUTCFullYear();
    
    let age = currentYear - birthYear;
    
    return new Date(birthDate).setUTCFullYear(currentYear) > Date.now() ? age - 1 : age;
}

function removeKeywords(inputString) {
    const keywords = ['CF', 'FC', 'F.C.', 'C.F.', '1.'];
    const words = inputString.split(/\s+/);
    const cleanedWords = words.filter(word => !keywords.includes(word) && !/\d/.test(word));
    const cleanedString = REMOVE(cleanedWords.join(' '));
    
    if (cleanedString.length > 19) {
      return cleanedString.slice(0, 17) + '..';
    }
    
    return cleanedString;
}

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function censorName(playerName) {
  var allNums = playerName.split("")
  var options = []
  var revealed = []
  for (let x in allNums){
    if ([" ", "-"].includes(allNums[x])) revealed.push(x)
    else options.push(x)
  }
  var shuffled = shuffle(options)
  var max = Math.ceil(0.5 * options.length)
  var allPossible = revealed.concat(shuffled.slice(max)).map(e=>parseInt(e))
  var finalString = allNums.map((e,n)=>allPossible.includes(n) ? e : "_").join("")
  return finalString
}

function getFlag(nation){
    const customFlag = customFlags[nation];
    if (customFlag) return customFlag;
    return flag(nation);
}