const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
require('dotenv').config();
const axios = require("axios");
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

async function sendTechNews(tech) {
    channel = process.env.CHANNEL_NEWS;
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const response = await axios.get('https://newsapi.org/v2/everything', {
            params: {
                q: tech.query,
                from: today.toISOString(),
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


// Souhaitons la bienvenue à un nouvel utilisateur.
client.on('guildMemberAdd', (member) => {
  console.log(`${member.user.tag} a rejoint ${member.guild.name}. Souhaitez lui la bienvenue !!`);
  const channel = member.guild.systemChannel;
  if (channel) {
    channel.send(`Bienvenue ${member} sur le serveur ! 🎉`);
  }
});

// Cron des news sur les technos.
client.on('clientReady', () => {
    console.log(`Bot connecté en tant que ${client.user.tag}`);

    // Tâche programmée : tous les jours à 20h00 (timezone de votre serveur)
    cron.schedule(`${process.env.MINUTES_PUBLISHING_NEWS} ${process.env.HOUR_PUBLISHING_NEWS} * * *`, async () => {
        console.log('Envoi des news Symfony de 20h...');

        try {
            const channel = client.channels.cache.get(process.env.CHANNEL_NEWS);
            if (!channel || !channel.isTextBased()) {
                console.error('Channel invalide!');
                return;
            }

            // Date du jour à minuit
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const response = await axios.get('https://newsapi.org/v2/everything', {
                params: {
                    q: 'Symfony OR "Symfony framework"',
                    from: today.toISOString(),
                    language: 'en',
                    sortBy: 'publishedAt',
                    apiKey: process.env.NEWS_API_KEY
                }
            });

            const articles = response.data.articles;

            if (articles.length === 0) {
                await channel.send('📰 Aucune actualité Symfony aujourd\'hui.');
                return;
            }

            // Message d'intro
            const now = new Date();
            await channel.send(`📰 **Actualités Symfony du ${now.toLocaleDateString('fr-FR')}** 📰\n${articles.length} article(s) trouvé(s) !\n`);


            for (const article of articles) {
                const embed = new EmbedBuilder()
                    .setColor(0x000000)
                    .setTitle(article.title)
                    .setURL(article.url)
                    .setDescription(article.description || 'Pas de description disponible')
                    .setThumbnail(article.urlToImage || '')
                    .addFields(
                        { name: '📰 Source', value: article.source.name, inline: true },
                        { name: '✍️ Auteur', value: article.author || 'Non spécifié', inline: true }
                    )
                    .setTimestamp(new Date(article.publishedAt))
                    .setFooter({ text: 'Symfony News Bot' });

                await channel.send({ embeds: [embed] });
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            console.log(`${articlesToSend.length} actualités envoyées avec succès`);

        } catch (error) {
            console.error('Erreur lors de l\'envoi des news:', error);
        }
    }, {
        timezone: "Europe/Paris" // Adaptez selon votre timezone
    });

    console.log('✅ Tâche planifiée : envoi des news Symfony tous les jours à 20h');
});



client.login(process.env.DISCORD_TOKEN);
