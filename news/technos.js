// === news/technos.js ===
// Liste des technologies suivies par le bot
require('dotenv').config();

exports.technos = [
  {
    name: 'Symfony',
    query: 'Symfony OR "Symfony framework"',
    color: 0x000000,
    emoji: '🎵',
    thumbnail: 'https://symfony.com/images/opengraph/symfony.png',
    channelId: process.env.CHANNEL_SYMFONY, // 🔹 salon Discord dédié
  },
  {
    name: 'Next.js',
    query: 'Next.js OR Nextjs OR "Next framework"',
    color: 0x000000,
    emoji: '▲',
    thumbnail: 'https://assets.vercel.com/image/upload/v1662130559/nextjs/Icon_light_background.png',
    channelId: process.env.CHANNEL_NEXTJS,
  },
  {
    name: 'Tailwind CSS',
    query: 'Tailwind CSS OR TailwindCSS framework',
    color: 0x06B6D4,
    emoji: '💨',
    thumbnail: 'https://tailwindcss.com/_next/static/media/tailwindcss-mark.3c5441fc7a190fb1800d4a5c7f07ba4b1345a9c8.svg',
    channelId: process.env.CHANNEL_TAILWIND,
  },
  {
    name: 'React',
    query: 'React.js OR ReactJS OR "React framework"',
    color: 0x61DAFB,
    emoji: '⚛️',
    thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg',
    channelId: process.env.CHANNEL_REACT,
  },
  {
    name: 'React Native',
    query: '"React Native" OR ReactNative framework',
    color: 0x61DAFB,
    emoji: '📱',
    thumbnail: 'https://reactnative.dev/img/header_logo.svg',
    channelId: process.env.CHANNEL_REACT_NATIVE,
  },
];
