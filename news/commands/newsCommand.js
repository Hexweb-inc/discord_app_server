/**
 * Parser for !news command with date range arguments
 * Supports: !news --from YYYY-MM-DD --to YYYY-MM-DD
 */

/**
 * Parse command arguments for !news command
 * @param {string} content - The message content
 * @returns {Object|null} - Parsed arguments or null if invalid
 */
function parseNewsCommand(content) {
    // Check if message starts with !news
    if (!content.startsWith('!news')) {
        return null;
    }

    const args = content.slice(5).trim(); // Remove '!news' prefix

    // If no arguments, return default (yesterday only)
    if (!args) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0); // Start of yesterday

        const yesterdayEnd = new Date(yesterday);
        yesterdayEnd.setHours(23, 59, 59, 999); // End of yesterday

        return {
            from: yesterday,
            to: yesterdayEnd,
            tech: null // null means all technologies
        };
    }

    // Parse arguments
    const result = {
        from: null,
        to: null,
        tech: null
    };

    // Match --from YYYY-MM-DD
    const fromMatch = args.match(/--from\s+(\d{4}-\d{2}-\d{2})/);
    if (fromMatch) {
        result.from = new Date(fromMatch[1] + 'T00:00:00');
        if (isNaN(result.from.getTime())) {
            return { error: '❌ Invalid --from date format. Use YYYY-MM-DD (e.g., 2025-10-01)' };
        }
    }

    // Match --to YYYY-MM-DD
    const toMatch = args.match(/--to\s+(\d{4}-\d{2}-\d{2})/);
    if (toMatch) {
        result.to = new Date(toMatch[1] + 'T23:59:59');
        if (isNaN(result.to.getTime())) {
            return { error: '❌ Invalid --to date format. Use YYYY-MM-DD (e.g., 2025-10-09)' };
        }
    }

    // Match --techno "technology name" (required)
    const techMatch = args.match(/--techno\s+"([^"]+)"|--techno\s+(\S+)/);
    if (techMatch) {
        result.tech = techMatch[1] || techMatch[2];
    } else {
        // --techno is required
        return { error: 'required' }; // Special error to trigger help message
    }

    // Set defaults if not provided (yesterday only)
    if (!result.from && !result.to) {
        // Both missing: use yesterday
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);

        const yesterdayEnd = new Date(yesterday);
        yesterdayEnd.setHours(23, 59, 59, 999);

        result.from = yesterday;
        result.to = yesterdayEnd;
    } else if (!result.to) {
        // Only --to is missing: default to today
        result.to = new Date();
        result.to.setHours(23, 59, 59, 999);
    } else if (!result.from) {
        // Only --from is missing: default to yesterday
        const yesterday = new Date(result.to);
        yesterday.setDate(result.to.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        result.from = yesterday;
    }

    // Validation: from must be before to
    if (result.from > result.to) {
        return { error: '❌ --from date must be before --to date' };
    }

    // Validation: date range not too far in the future
    const maxFutureDate = new Date();
    maxFutureDate.setDate(maxFutureDate.getDate() + 1);
    if (result.to > maxFutureDate) {
        return { error: '❌ --to date cannot be more than 1 day in the future' };
    }

    // Validation: date range not too large (max 30 days)
    const daysDiff = Math.ceil((result.to - result.from) / (1000 * 60 * 60 * 24));
    if (daysDiff > 30) {
        return { error: '❌ Date range cannot exceed 30 days' };
    }

    return result;
}

/**
 * Get help message for !news command
 * @param {Array} availableTechnos - List of available technologies
 * @returns {string} - Help message
 */
function getNewsCommandHelp(availableTechnos = []) {
    const techList = availableTechnos.length > 0
        ? availableTechnos.map(t => `  • ${t.emoji} **${t.name}**`).join('\n')
        : '  • Loading...';

    return `
**📰 !news Command Usage**

\`\`\`
!news --techno <name> [options]
\`\`\`

**Required:**
• \`--techno <name>\` - Technology name (required)

**Optional:**
• \`--from YYYY-MM-DD\` - Start date (defaults to yesterday)
• \`--to YYYY-MM-DD\` - End date (defaults to yesterday)

**Available Technologies:**
${techList}

**Examples:**
\`\`\`
!news --techno React
  → React news from yesterday

!news --techno Symfony --from 2025-10-01 --to 2025-10-09
  → Symfony news from October 1st to 9th

!news --techno "Next.js" --from 2025-10-05
  → Next.js news from October 5th to today

!news --techno "Tailwind CSS" --to 2025-10-08
  → Tailwind CSS news up to Oct 8th
\`\`\`

**Notes:**
• \`--techno\` is **required**
• Use quotes for multi-word tech names (e.g., "Next.js", "React Native")
• Date format must be YYYY-MM-DD
• Maximum range: 30 days
• All dates are in Europe/Paris timezone
    `.trim();
}

module.exports = {
    parseNewsCommand,
    getNewsCommandHelp
};
