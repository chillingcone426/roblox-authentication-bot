const { Client, Intents, Collection } = require('discord.js')
const client = new Client({
	partials: ['CHANNEL', 'USER', 'GUILD_MEMBER', 'MESSAGE'],
	intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES],
})
const config = require('./util/config.json')
const express = require('express');
const app = express();
const axios = require('axios')
const discord = require('discord.js')
const schema = require('./util/schema.js')


require('dotenv').config()
client.commands = new Collection()
client.buttons = new Collection()
client.selectMenus = new Collection()
client.slashCommands = new Collection()
client.cooldowns = new Collection();
['commandHandler.js', 'interactionHandler.js', 'eventHandler.js'].forEach((handler) => {
	require(`./handlers/${handler}`)(client)
})
process.on('unhandledRejection', error => {
	console.error('Unhandled promise rejection:', error);
});

// webserver
app.listen(80, () => {
	console.log('Listening on port 80')
})
app.get('/', (req, res) => {
	res.send('Hello World!')
})
app.get('/redirect', async ( req, res ) => {
	// make code into string
	const code = req.query.code
	const state = req.query.state
	try {
		const data = await schema.find({ statecode: state }).exec();
	  
		if (data.length === 0) {
		  res.send('An error occurred');
		  res.status(404);
		  res.end();
		} else {
		  const user = await client.users.fetch(data[0].discordID);
	  
		  if (!user) {
			res.send('An error occurred');
			res.status(404);
			res.end();
		  } else {
			res.status(200);
			res.send('You may close this tab now');
			const params = new URLSearchParams();
			params.append("client_id", config.robloxclientID);
			params.append("client_secret", config.robloxtoken);
			params.append("grant_type", "authorization_code");
			params.append("code", code);
	  
			const response = await axios.post(`https://apis.roblox.com/oauth/v1/token`, params, {
			  headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			  }
			});
	  
			if (response.status === 200) {
			  const access_token = response.data.access_token;
	  
			  const userInfoResponse = await fetch(`https://apis.roblox.com/oauth/v1/userinfo`, {
				headers: {
				  Authorization: `Bearer ${access_token}`
				}
			  });
	  
			  if (userInfoResponse.status === 200) {
				const userInfo = await userInfoResponse.json();
	  
				data[0].verified = true;
				data[0].robloxID = userInfo.sub;
				data[0].robloxUsername = userInfo.preferred_username;
				data[0].statecode = null;
				await data[0].save();

				// change nickname to roblox username
				const guild = client.guilds.cache.get(config.guildID)
				const username = userInfo.preferred_username
				const member = await guild.members.fetch(user.id)
				member.setNickname(username)
			  } else {
				const embed = new discord.MessageEmbed()
				  .setColor('RED')
				  .setDescription('An error occurred while verifying your account!')
				  .setTimestamp()
				  .setFooter({ text: 'Error!' });
	  
				client.channels.cache.get(config.verificationChannel).send({ embeds: [embed] });
			  }
			} else {
			  const embed = new discord.MessageEmbed()
				.setColor('RED')
				.setDescription('An error occurred while verifying your account!')
				.setTimestamp()
				.setFooter({ text: 'Error!' });
	  
			  client.channels.cache.get(config.verificationChannel).send({ embeds: [embed] });
			}
		  }
		}
	  } catch (err) {
		console.log(err);
		res.send('An error occurred');
		res.status(500);
		res.end();
	  }
})








client.login(process.env.BOT_TOKEN)

