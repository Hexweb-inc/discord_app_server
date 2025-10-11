// Souhaitons la bienvenue à un nouvel utilisateur.
function handleGuildMemberAdd(member) {
    console.log(`${member.user.tag} a rejoint ${member.guild.name}. Souhaitez lui la bienvenue !!`);
    const channel = member.guild.systemChannel;
    if (channel) {
        channel.send(`Bienvenue ${member} sur le serveur ! 🎉`);
    }
}

module.exports = handleGuildMemberAdd;