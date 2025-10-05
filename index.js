const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const fs = require('fs');
require('dotenv').config();
const axios = require("axios");
const cron = require('node-cron');

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

// Configuration des technologies
const technologies = [
    {
        name: 'Symfony',
        query: 'Symfony OR "Symfony framework"',
        color: 0x000000,
        emoji: '🎵',
        thumbnail: 'https://symfony.com/images/opengraph/symfony.png'
    },
    {
        name: 'Next.js',
        query: 'Next.js OR Nextjs OR "Next framework"',
        color: 0x000000,
        emoji: '▲',
        thumbnail: 'https://assets.vercel.com/image/upload/v1662130559/nextjs/Icon_light_background.png'
    },
    {
        name: 'Tailwind CSS',
        query: 'Tailwind CSS OR TailwindCSS',
        color: 0x06B6D4,
        emoji: '💨',
        thumbnail: 'https://tailwindcss.com/_next/static/media/tailwindcss-mark.3c5441fc7a190fb1800d4a5c7f07ba4b1345a9c8.svg'
    },
    {
        name: 'React',
        query: 'React.js OR ReactJS OR "React framework"',
        color: 0x61DAFB,
        emoji: '⚛️',
        thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg'
    },
    {
        name: 'React Native',
        query: '"React Native" OR ReactNative',
        color: 0x61DAFB,
        emoji: '📱',
        thumbnail: 'https://reactnative.dev/img/header_logo.svg'
    }
];

async function sendTechNews(channel, tech) {
    try {
        // const today = new Date();
        // today.setHours(0, 0, 0, 0);
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);

        const response = await axios.get('https://newsapi.org/v2/everything', {
            params: {
                q: tech.query,
                from: last7Days.toISOString(), // Permet de retourner les articles des x derniers jours ou heures selon ce qui est mis.
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
            for (const tech of technologies) {
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

        for (const tech of technologies) {
            const count = await sendTechNews(channel, tech);
            totalArticles += count;
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        await channel.send(`✅ Test terminé : ${totalArticles} articles envoyés`);
    }

    if (message.content === '!tech-list') {
        const techList = technologies.map(t => `${t.emoji} **${t.name}**`).join('\n');
        message.reply(`**Technologies suivies :**\n${techList}`);
    }
});

client.login(process.env.DISCORD_TOKEN);