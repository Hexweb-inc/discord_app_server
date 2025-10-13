// === index.js ===
// Bot Discord News multi-salons avec embeds modernes et filtrage Tailwind CSS

const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
require('dotenv').config();
const axios = require('axios');
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
    GatewayIntentBits.GuildMessageReactions,
  ]
});

// === Gestion des nouveaux membres ===
client.on('guildMemberAdd', handleGuildMemberAdd);

// ===============================
// === FONCTION D’ENVOI DES NEWS ===
// ===============================
async function sendTechNews(channel, tech, fromDate = null, toDate = null) {
  try {
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
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        language: 'en',
        sortBy: 'publishedAt',
        pageSize: 10,
        apiKey: process.env.NEWS_API_KEY
      }
    });

    let articles = response.data.articles || [];

    // --- Filtrage spécifique Tailwind CSS ---
    if (tech.name === "Tailwind CSS") {
      articles = articles.filter(a => {
        const text = `${a.title || ""} ${a.description || ""}`.toLowerCase();
        return text.includes("tailwind") && text.includes("css");
      });
    }

    if (articles.length === 0) {
      const noNewsEmbed = new EmbedBuilder()
        .setColor(0x808080)
        .setTitle(`${tech.emoji} ${tech.name}`)
        .setDescription(`Aucune actualité pertinente trouvée pour **${tech.name}**.`)
        .setFooter({ text: `🔍 Recherche : ${tech.query}` });
      await channel.send({ embeds: [noNewsEmbed] });
      return 0;
    }

    // Header embed pour la techno
    const headerEmbed = new EmbedBuilder()
      .setColor(tech.color)
      .setTitle(`${tech.emoji} ${tech.name.toUpperCase()} — Dernières actualités`)
      .setDescription(`🗓️ Du **${fromDate.toLocaleDateString('fr-FR')}** au **${toDate.toLocaleDateString('fr-FR')}**`)
      .setThumbnail(tech.thumbnail)
      .setTimestamp();

    await channel.send({ embeds: [headerEmbed] });

    for (const article of articles) {
      const embed = new EmbedBuilder()
        .setColor(tech.color)
        .setTitle(`📰 ${article.title}`)
        .setURL(article.url)
        .setDescription(article.description ? `${article.description.substring(0, 250)}...` : 'Aucune description disponible.')
        .addFields(
          { name: '📅 Date', value: new Date(article.publishedAt).toLocaleString('fr-FR'), inline: true },
          { name: '🗞️ Source', value: article.source.name || 'Inconnue', inline: true }
        )
        .setThumbnail(article.urlToImage || tech.thumbnail)
        .setFooter({ text: `✨ ${tech.name} | Propulsé par NewsAPI.org` });

      await channel.send({ embeds: [embed] });
      await new Promise(resolve => setTimeout(resolve, 1200)); // Anti-spam
    }

    return articles.length;

  } catch (error) {
    console.error(`Erreur pour ${tech.name}:`, error.message);
    const errorEmbed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle(`❌ Erreur lors de la récupération des news ${tech.name}`)
      .setDescription('Vérifie ta clé API ou ta connexion réseau.');
    await channel.send({ embeds: [errorEmbed] });
    return 0;
  }
}

// ===============================
// === CRON : Envoi Automatique ===
// ===============================
client.once('ready', () => {
  console.log(`✅ Bot connecté en tant que ${client.user.tag}`);

  const cronExpression = `${process.env.MINUTES_PUBLISHING_NEWS} ${process.env.HOUR_PUBLISHING_NEWS} * * *`;
  console.log(`🕒 Tâche planifiée : ${cronExpression}`);

  cron.schedule(cronExpression, async () => {
    console.log('🚀 Envoi des actualités tech du jour...');

    let totalArticles = 0;

    for (const tech of technos) {
      const targetChannel = client.channels.cache.get(tech.channelId);
      if (!targetChannel) {
        console.warn(`⚠️ Salon manquant pour ${tech.name}`);
        continue;
      }

      const count = await sendTechNews(targetChannel, tech);
      totalArticles += count;
      await new Promise(resolve => setTimeout(resolve, 2500));
    }

    console.log(`📊 Total d'articles publiés aujourd'hui : ${totalArticles}`);
  }, { timezone: "Europe/Paris" });
});

// ===============================
// === Commandes Discord ===
// ===============================
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  if (message.content.startsWith('!news')) {
    const parsedArgs = parseNewsCommand(message.content);

    if (!parsedArgs || parsedArgs.error) {
      message.reply(parsedArgs?.error || getNewsCommandHelp(technos));
      return;
    }

    const { from, to, tech } = parsedArgs;
    const techsToQuery = technos.filter(t => t.name.toLowerCase() === tech.toLowerCase());

    if (techsToQuery.length === 0) {
      message.reply(`❌ Technology "${tech}" not found.\n\n${getNewsCommandHelp(technos)}`);
      return;
    }

    message.reply(`📰 Fetching news from **${from.toLocaleDateString('fr-FR')}** to **${to.toLocaleDateString('fr-FR')}**...`);

    let totalArticles = 0;

    for (const techItem of techsToQuery) {
      const channel = client.channels.cache.get(techItem.channelId);
      if (!channel) continue;
      const count = await sendTechNews(channel, techItem, from, to);
      totalArticles += count;
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    message.reply(`✅ Commande terminée : **${totalArticles}** articles envoyés.`);
  }

  if (message.content === '!test-news') {
    let totalArticles = 0;
    for (const tech of technos) {
      const channel = client.channels.cache.get(tech.channelId);
      if (!channel) continue;
      const count = await sendTechNews(channel, tech);
      totalArticles += count;
    }
    message.reply(`🧪 Test terminé : **${totalArticles}** articles envoyés dans leurs salons.`);
  }

  if (message.content === '!tech-list') {
    const techList = technos.map(t => `${t.emoji} **${t.name}**`).join('\n');
    message.reply(`**Technologies suivies :**\n${techList}`);
  }
});

// === Connexion du bot ===
client.login(process.env.DISCORD_TOKEN);
