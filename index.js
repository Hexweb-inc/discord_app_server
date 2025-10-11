const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const fs = require('fs');
require('dotenv').config();
const axios = require("axios");
const cron = require('node-cron');
const { technos } = require('./news/technos');
const handleGuildMemberAdd = require('./members/events/onMemberAdd');
const { parseNewsCommand, getNewsCommandHelp } = require('./news/commands/newsCommand');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessageReactions,
  ]
});


client.on('guildMemberAdd', handleGuildMemberAdd);


client.on('messageCreate', message => {
    if(message.author.bot) return;

    if(message.channelId === process.env.CHANNEL_NEWS && message.content === '/news_last_7_days') {
        message.reply('News des 7 derniers jours :');
    }
});

async function sendTechNews(channel, tech, fromDate = null, toDate = null) {
    try {
        // Default to last 7 days if no dates provided
        if (!fromDate) {
            fromDate = new Date();
            fromDate.setDate(fromDate.getDate() - 7);
        }
        if (!toDate) {
            toDate = new Date();
        }

        const response = await axios.get('https://newsapi.org/v2/everything', {
            params: {
                q: tech.query,
                from: fromDate.toISOString(), // Start date for articles
                to: toDate.toISOString(), // End date for articles
                language: 'en',
                sortBy: 'publishedAt',
                pageSize: 5,
                apiKey: process.env.NEWS_API_KEY
            }
        });

        const articles = response.data.articles;

        if (articles.length === 0) {
            await channel.send(`${tech.emoji} **${tech.name}** : Aucune actualité aujourd'hui.`);
            return 0;
        }

        // Message d'intro pour cette techno
        await channel.send(`\n${tech.emoji} **──── ${tech.name.toUpperCase()} ────** ${tech.emoji}\n${articles.length} article(s) trouvé(s)\n`);

        // Envoyer les articles
        for (const article of articles) {
            const embed = new EmbedBuilder()
                .setColor(tech.color)
                .setTitle(article.title)
                .setURL(article.url)
                .setDescription(article.description?.substring(0, 200) + '...' || 'Pas de description disponible')
                .setThumbnail(article.urlToImage || tech.thumbnail)
                .addFields(
                    { name: '📰 Source', value: article.source.name, inline: true },
                    { name: '✍️ Auteur', value: article.author || 'Non spécifié', inline: true }
                )
                .setTimestamp(new Date(article.publishedAt))
                .setFooter({ text: `${tech.name} News` });

            await channel.send({ embeds: [embed] });
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return articles.length;

    } catch (error) {
        console.error(`Erreur pour ${tech.name}:`, error.message);
        await channel.send(`❌ Erreur lors de la récupération des news ${tech.name}`);
        return 0;
    }
}

// Cron des news sur les technos.
client.on('clientReady', () => {
    console.log(`Bot connecté en tant que ${client.user.tag}`);

    // Tâche programmée : tous les jours à l'heure configurée
    const cronExpression = `${process.env.MINUTES_PUBLISHING_NEWS} ${process.env.HOUR_PUBLISHING_NEWS} * * *`;
    console.log(`Configuration cron: ${cronExpression}`);

    cron.schedule(cronExpression, async () => {
        console.log('Envoi des actualités tech du jour...');

        try {
            const channel = client.channels.cache.get(process.env.CHANNEL_NEWS);
            if (!channel || !channel.isTextBased()) {
                console.error('Channel invalide!');
                return;
            }

            const now = new Date();
            // Message d'intro général
            await channel.send(`
╔═══════════════════════════════════════╗
║   📰 **ACTUALITÉS TECH DU JOUR** 📰   ║
║        ${now.toLocaleDateString('fr-FR')}         ║
╚═══════════════════════════════════════╝
            `);

            let totalArticles = 0;

            // Parcourir toutes les technologies
            for (const tech of technos) {
                const count = await sendTechNews(channel, tech);
                totalArticles += count;
                
                // Pause entre chaque techno
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // Message de fin
            await channel.send(`
╔═══════════════════════════════════════╗
║  ✅ **Rapport terminé**                ║
║  📊 Total : ${totalArticles} articles            ║
╚═══════════════════════════════════════╝
            `);

            console.log(`✅ ${totalArticles} actualités envoyées avec succès`);

        } catch (error) {
            console.error('Erreur lors de l\'envoi des news:', error);
        }
    }, {
        timezone: "Europe/Paris"
    });

    console.log(`✅ Tâche planifiée : envoi des news tech tous les jours à ${process.env.HOUR_PUBLISHING_NEWS}h${process.env.MINUTES_PUBLISHING_NEWS}`);
});

// Commandes utiles
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // !news command with date range support
    if (message.content.startsWith('!news')) {
        const parsedArgs = parseNewsCommand(message.content);

        // Show help if requested or if --techno is missing
        if (message.content.includes('--help') || message.content.includes('-h') ||
            (parsedArgs && parsedArgs.error === 'required')) {
            message.reply(getNewsCommandHelp(technos));
            return;
        }

        // Handle other parsing errors
        if (parsedArgs && parsedArgs.error) {
            message.reply(parsedArgs.error);
            return;
        }

        if (!parsedArgs) {
            message.reply('❌ Invalid command format. Use `!news --help` for usage information.');
            return;
        }

        const { from, to, tech } = parsedArgs;
        const channel = message.channel;

        // tech should always be present due to validation, but double-check
        if (!tech) {
            message.reply(getNewsCommandHelp(technos));
            return;
        }

        // Filter technologies - tech is now required so it will always be present
        const techsToQuery = technos.filter(t =>
            t.name.toLowerCase() === tech.toLowerCase()
        );

        if (techsToQuery.length === 0) {
            message.reply(`❌ Technology "${tech}" not found.\n\n${getNewsCommandHelp(technos)}`);
            return;
        }

        // Send initial message
        message.reply(`📰 Fetching news from **${from.toLocaleDateString('fr-FR')}** to **${to.toLocaleDateString('fr-FR')}**...`);

        let totalArticles = 0;

        // Header message
        await channel.send(`
╔═══════════════════════════════════════╗
║      📰 **ACTUALITÉS TECH** 📰        ║
║   ${from.toLocaleDateString('fr-FR')} → ${to.toLocaleDateString('fr-FR')}   ║
╚═══════════════════════════════════════╝
        `);

        // Fetch news for each technology
        for (const techItem of techsToQuery) {
            const count = await sendTechNews(channel, techItem, from, to);
            totalArticles += count;
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Summary message
        await channel.send(`
╔═══════════════════════════════════════╗
║  ✅ **Rapport terminé**                ║
║  📊 Total : ${totalArticles} article(s)          ║
╚═══════════════════════════════════════╝
        `);
    }

    if (message.content === '!test-news') {
        message.reply('🧪 Test des actualités en cours...');

        const channel = message.channel;
        let totalArticles = 0;

        const now = new Date();
        await channel.send(`
╔═══════════════════════════════════════╗
║   📰 **TEST ACTUALITÉS TECH** 📰      ║
║        ${now.toLocaleDateString('fr-FR')}         ║
╚═══════════════════════════════════════╝
        `);

        for (const tech of technos) {
            const count = await sendTechNews(channel, tech);
            totalArticles += count;
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        await channel.send(`✅ Test terminé : ${totalArticles} articles envoyés`);
    }

    if (message.content === '!tech-list') {
        const techList = technos.map(t => `${t.emoji} **${t.name}**`).join('\n');
        message.reply(`**Technologies suivies :**\n${techList}`);
    }
});

client.login(process.env.DISCORD_TOKEN);