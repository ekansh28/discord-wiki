// scripts/seed-ballscord-data.ts
import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js'
import { slugify } from '../lib/wiki-utils'
import { Page, PageRevision, UserProfile, Category, PendingChange, PageSummary } from '../types/wiki'
const supabaseUrl = 'https://mbessirvgrfztivyftfl.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY

if (!supabaseKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_KEY")
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Main page content extracted from the XML
const ballscordMainPageContent = `{{Infobox
|title        = Ballscord Wiki
|image        = Discord-Logo-Color.png
|caption      = The Official Discord Logo
|founder      = [[User:OwnerUsername|ekansh]]
|coowners     = [[User:CoOwner1|jaon]], [[User:CoOwner2|aleks]]
|date_created = Date unknown, 2021
|members      = 9000+
|status       = Functionally insane
|link         = [https://discord.gg/gayporn Join Server]
}}

## What is Ballscord?

**Ballscord** is a Discord server built on hatred, mental instability, racism, and cardinal sin—hated by many; loved by a dangerously unwell and psychopathic few. It's infamous for its problematic lore that has affected thousands, sparking community-wide meltdowns and allegedly attracting federal-level attention, from its toxicity from its more oldgen members, from the brain-deadness of it all, from the racism, transphobia, homophobia, etcetera, and from the fact that there are so many pedophiles who make alt accounts and try to get back in. (Seriously there's like 22 pedophiles and none of the minors they try to groom are attractive. I don't know what they see in them.)

## Server Lore

The history of **Ballscord Wiki** is a chaotic saga of growth, conflicts, and internet culture. Below are the defining chapters of the server's evolution. You can also read about it here on Ekansh's outdated website: https://www.geocities.ws/ballscord/pages/Lore/Lore.html

### Founding and Early Days
* **The Birth (2021)**: Founded by [[User:OwnerUsername|Ekansh]] and friends, the server began as a small community spun off from another group. Early experiments with vanity URLs (like "tech" and later "racism") attracted rapid—if unpredictable—growth.
* **The Promotion Boom**: A strategic advertisement in a larger server (Trollcord) brought an influx of members, though tensions arose with rival communities.

### Major Events
* **The Great Emoji War**: A conflict sparked by the removal of a popular emoji, leading to weeks of meme-fueled battles.
* **The Raid Era**: Organized raids on external platforms (e.g., YouTube, other servers) became a controversial tradition before Discord's moderation policies forced a shift.
* **The Vanity Struggles**: Repeated losses of the server's custom URL ("racism") led to negotiations, scams, and eventual recoveries—often with help from allies like [[User:Ayato|Ayato]].

### Internal Conflicts
* **The Fake Server Incident**: A co-owner briefly created an unauthorized replica of the server, which was later reclaimed and shut down.
* **The Mod Revolt**: Demotions of inactive staff and a subsequent rebellion resulted in mass bans, followed by appeals and reintegration.
* **The NSFW Purge**: Channels like "brothel" were removed after repeated policy violations, prompting stricter moderation

### Modern Era
Despite bans, rebrands, and internal drama, the server endures as a hub for dark humor, nostalgia, and unpredictable camaraderie. Its lore remains a living document—often absurd, occasionally heartfelt, and always evolving.

For uncensored details (and questionable life choices), see the [https://www.geocities.ws/ballscord/pages/Lore/Lore.html full archives].

## Important Members

### Owner
[[File:ekanshPFP.png|40x40px]] **[https://instagram.com/15ekansh - ekansh]** – creator of the server

### Co-Owners
[[File:jaonPFP.png|50x50px]] **[[User:CoOwner1|Jaon- Jaon]]** – about

[[File:genPFP.png|50x50px]] **[[User:CoOwner2|Gen- Gen]]** – about

[[File:aleksPFP.png|50x50px]] **[[User:CoOwner3|Aleks- Aleks]]** – about

### Moderators
[[File:Mod1PFP.jpg|90px]]  
* **[[User:Mod1|Mod1]]** – The Peacekeeper. Wields banhammer like it's Excalibur on a caffeine drip.

[[File:Mod2PFP.jpg|90px]]  
* **[[User:Mod2|Mod2]]** – Brings justice with less mercy than a microwave timer.

[[File:Mod3PFP.jpg|90px]]  
* **[[User:Mod3|Mod3]]** – Organizes events and regrets them instantly.

### Notable Members
[[File:ClownLord69PFP.jpg|90px]]  
* **[[User:ClownLord69]]** – Meme overlord. You've laughed at his content and hated yourself after.

[[File:SpammerDudePFP.jpg|90px]]  
* **[[User:SpammerDude]]** – Banned 15 times, came back 16. He is inevitable.

[[File:HistorianBotPFP.jpg|90px]]  
* **[[User:HistorianBot]]** – Has a better memory than your ex. Records everything, including that one time you rage quit.

## Channels
* #staff-furry-rp — It exists.
* #minecraft — There's a Minecraft server. It supports Java and Bedrock, but it's emptier nowadays.
* #wear-or-tear — Rate peoples' clothes.
* #stage

**Important**
* #info — Has staff applications and the appeal server link.
* #rules
* #announcements
* #color-roles-݁˚

**◆◆◆◆**
* #˚ʚ♡ɞ˚-heartboard — Get "❤️" reactions and a bot puts your message here.
* #starboard — Get "⭐️" reactions and a bot puts your message here.
* #୧partners
* #patreon — There's a Patreon so you can bribe staff.

**Tickets**
* #create-a-ticket

**Text channels**
* #genreal — Often gets purged and deleted.
* #bots
* #gaming
* #critters — Post animals, pets, etcetera.
* #tinchat — Ekansh made a chatting website ([https://tinchat.online/ tinchat.online]) and he updates us here.

**Misc**
* #selfies
* #art
* #memes
* #food
* #count

**Voice Channels**
* Bloods
* Crips
* poop
* Private #1 — 11 people max.
* Private #2 — 6 people max.
* Private #3 — 2 people max.

## Server Bots
* **CarlBot** – .timeout
* **Vexera** – +penis
* **Esmbot** – for speechbubble

## Server Culture
We're assholes.

## Join the Server
We don't recommend it, but if you're broken enough to try: [https://discord.gg/gayporn discord.gg/gayporn]

## See Also
* [[Server Lore]]
* [[List of Server Memes]]
* [[Mod List]]
* [[Bot Documentation]]

[[Category:Discord Servers]]
[[Category:Communities]]`

// Ekansh user page content
const ekanshPageContent = `<!-- USER PROFILE PAGE FOR SERVER OWNER -->

## Ekansh

{{Infobox
|title        = Ekansh
|image        = ekanshPFP.png
|caption      = Owner of Ballscord and part-time chaos generator
|full_name    = Ekansh Sharma
|nickname     = ekansh, wood, snailvagina78, ovulatingchair21
|location     = India
|status       = Executed
|role         = silly owner of Ballscord
|website      = [https://tinchat.online tinchat.online]
|socials      = [https://instagram.com/15ekansh Instagram]
}}

*This article is about the founder of Ballscord. For the server itself, see [[Ballscord]].*

## Biography
**Ekansh** (born in 2005) is a silly, edgy guy best known for founding the chaotic Discord server **Ballscord**. He's been described as "what happens when you give a 15-year-old admin rights and too much free time."

## Early Life
Not much is publicly known about his early life, but it's widely agreed that his rise began at age 15 when he joined the notorious server *The Cum Palace*. It was there that he met key figures who helped him found what would become Ballscord.

## Role in Ballscord
Ekansh is the original founder and central figure behind Ballscord. 
His silly acts include :

* Creating 15 alt accounts for Nitro boosts
* Purchasing server ads on Trollcord
* Launching cursed vanity URLs like \`discord.gg/racism\`
* Surviving multiple server deletions, betrayals, and minor breakdowns

He is also known for creating the infamous silly [[EkanshBot]].

## Controversies
Ekansh has been involved in numerous questionable decisions including:
* Nuking co-owned servers out of spite or boredom
* Public feuds with rival communities (e.g., Pisscord)
* Allegations (many later disproven) circulated by ex-moderators

Despite this, his community has remained loyal — or maybe they're just trapped in Stockholm Syndrome.

## Projects
In addition to Ballscord, Ekansh is the developer of:
* [https://tinchat.online TinChat.online] – A retro-styled social platform inspired by MySpace, Discord, and Omegle.
* **Spotify Artist Project**: Ekansh is also an **experimental ambient musician**. 

## Music Career
* 🎧 **Spotify**: [https://open.spotify.com/artist/72uXuSxQ9QxRGsPQ25QUNe?si=7mvgWMUdRiWlgv-tK5-CgA Stream Ekansh on Spotify]
* He previously released ambient/glitchcore tracks under the alias **"Ballscord"**, but later discontinued the project.

## Social Media
* **Instagram**: [https://instagram.com/15ekansh @15ekansh]
* **Spotify**: [https://open.spotify.com/artist/72uXuSxQ9QxRGsPQ25QUNe Ekansh on Spotify]
* **Website**: [https://tinchat.online tinchat.online]

## External Links
* [[Ballscord]]
* [[Server Lore]]
* [[List of Ballscord Events]]
* [[Mod List]]

[[Category:Users]]
[[Category:Server Owners]]
[[Category:Ballscord]]
[[Category:Musicians]]`

// Server Lore page
const serverLoreContent = `# Server Lore

The **Ballscord Server Lore** is an extensive and chaotic chronicle of one of Discord's most notorious communities. This page contains the complete timeline of events, drama, and memorable moments that have shaped Ballscord into what it is today.

## Full Lore Archive

For the complete, uncensored history of Ballscord, visit Ekansh's original documentation:
**[https://www.geocities.ws/ballscord/pages/Lore/Lore.html Official Ballscord Lore Archives]**

## Timeline Overview

### 2021: The Beginning
* Server founded by [[Ekansh]] and early crew
* First vanity URL experiments
* Initial growth phase

### 2022: The Growth
* Major recruitment drives
* First major drama incidents
* Community structure establishment

### 2023: The Chaos
* Multiple server recreations
* Vanity URL wars
* The Great Emoji Conflict

### 2024: Modern Era
* Current server structure
* Ongoing community evolution
* Recent events and updates

## Major Events

### The Great Emoji War
A legendary conflict that erupted when a beloved emoji was removed from the server. What started as simple complaints escalated into weeks of meme warfare, faction creation, and server-wide chaos.

### The Vanity Struggles
The server's attempts to secure and maintain custom vanity URLs, particularly the infamous "racism" URL, led to numerous scams, negotiations, and community drama.

### The Mod Revolt
A period of internal strife when moderator changes led to community upheaval, mass bans, and eventual reconciliation.

## Important Figures

See [[Ekansh]] for information about the server founder.

Other notable figures include various moderators, long-time members, and infamous troublemakers who have left their mark on server history.

## Cultural Impact

Ballscord has influenced numerous other Discord communities and has become a case study in online community management (or mismanagement, depending on your perspective).

## See Also
* [[Ballscord]]
* [[Ekansh]]
* [[List of Server Memes]]
* [[Community Guidelines]]

[[Category:History]]
[[Category:Ballscord]]
[[Category:Communities]]`

// NEW MISSING PAGES CONTENT
const helpEditingContent = `# Help: Editing Pages

This page explains how to edit pages on the Ballscord Wiki.

## Getting Started

To edit a page, click the "Edit" button at the top of any page. You'll need to be logged in to make edits.

## Visual Editor

The wiki includes a rich visual editor that lets you format text without knowing markup:

* **Bold** and *italic* text formatting
* Headings and lists
* Wiki links to other pages
* Images and tables
* Colors and fonts

## Wiki Markup

You can also use the source editor for advanced formatting:

\`\`\`
**Bold text**
*Italic text*
[[Link to Page]]
[[Page Name|Display Text]]
# Heading 1
## Heading 2
* List item
\`\`\`

## Creating Links

To link to other wiki pages, use double square brackets:
* \`[[Main Page]]\` - Links to the main page
* \`[[User:Ekansh|Ekansh]]\` - Links to Ekansh's user page with custom text

## Categories

Add categories to pages using:
\`[[Category:Help]]\`

## Tips

* Always provide an edit summary
* Preview your changes before saving
* Be respectful and constructive
* Follow the community guidelines

## Need Help?

Ask questions in the Discord server or contact a moderator.

[[Category:Help]]`

const communityGuidelinesContent = `# Community Guidelines

Welcome to the Ballscord Wiki! Please follow these guidelines to maintain a positive community.

## General Rules

1. **Be respectful** - Treat all users with dignity
2. **Stay on topic** - Keep content relevant to Ballscord
3. **No vandalism** - Don't delete or damage existing content
4. **Cite sources** - Back up claims with evidence
5. **Use edit summaries** - Explain your changes

## Content Standards

* Write in a neutral, encyclopedic tone
* Avoid personal attacks or drama
* Keep content appropriate for all ages
* Respect copyright and fair use

## Editing Etiquette

* Make constructive edits
* Don't edit war - discuss disagreements
* Be bold but not reckless
* Ask for help if unsure

## Consequences

Violations may result in:
* Warnings
* Temporary blocks
* Permanent bans
* Page protection

## Questions?

Contact the moderators in Discord or on their user pages.

[[Category:Community]]
[[Category:Help]]`

const featuredContentContent = `# Featured Content

This page showcases the best articles and content on the Ballscord Wiki.

## Featured Articles

### [[Ballscord]]
The main article about the Discord server, covering its history, culture, and community.

### [[Ekansh]]
Biography of the server founder and his various projects.

### [[Server Lore]]
Comprehensive timeline of major events and drama in server history.

## Featured Media

* Server screenshots and memorable moments
* Memes and community art
* Music and creative content

## How to Nominate

To nominate content for featuring:

1. Ensure the article is well-written and comprehensive
2. Check that it follows wiki standards
3. Post on the community discussion page
4. Get consensus from active editors

## Criteria

Featured content should be:
* Accurate and well-sourced
* Comprehensive coverage of the topic
* Well-written and engaging
* Properly formatted with good images
* Representative of the wiki's best work

## Archive

View all previously featured content in the [[Featured Content Archive]].

[[Category:Featured]]
[[Category:Community]]`

interface PageData {
  title: string
  slug: string
  content: string
  categories: string[]
}

const pages: PageData[] = [
  {
    title: 'Ballscord Wiki',
    slug: 'main-page',
    content: ballscordMainPageContent,
    categories: ['Discord Servers', 'Communities']
  },
  {
    title: 'Ekansh',
    slug: 'ekansh',
    content: ekanshPageContent,
    categories: ['Users', 'Server Owners', 'Ballscord', 'Musicians']
  },
  {
    title: 'Server Lore',
    slug: 'server-lore',
    content: serverLoreContent,
    categories: ['History', 'Ballscord', 'Communities']
  },
  // NEW MISSING PAGES
  {
    title: 'Help:Editing',
    slug: 'help-editing',
    content: helpEditingContent,
    categories: ['Help']
  },
  {
    title: 'Community Guidelines',
    slug: 'community-guidelines',
    content: communityGuidelinesContent,
    categories: ['Community', 'Help']
  },
  {
    title: 'Featured Content',
    slug: 'featured-content',
    content: featuredContentContent,
    categories: ['Featured', 'Community']
  }
]

const categories = [
  { name: 'Discord Servers', description: 'Discord server related pages' },
  { name: 'Communities', description: 'Online communities and groups' },
  { name: 'Users', description: 'User profiles and information' },
  { name: 'Server Owners', description: 'Discord server owners and administrators' },
  { name: 'Ballscord', description: 'Everything related to the Ballscord server' },
  { name: 'Musicians', description: 'Musical artists and creators' },
  { name: 'History', description: 'Historical information and timelines' },
  // NEW CATEGORIES
  { name: 'Help', description: 'Help and tutorial pages for using the wiki' },
  { name: 'Featured', description: 'Featured and highlighted content' }
]

async function seedData() {
  console.log('🚀 Starting Ballscord Wiki data seeding (including missing pages)...')

  try {
    // Use a proper UUID format instead of placeholder text
    const adminUserId = 'a37c22fa-7f5d-4e68-afc0-34d093eff609' // Valid UUID format

    // 1. Seed categories first
    console.log('📁 Creating categories...')
    for (const category of categories) {
      // Check if category already exists first
      const { data: existingCategory } = await supabase
        .from('categories')
        .select('id')
        .eq('name', category.name)
        .single()
      
      if (existingCategory) {
        console.log(`⚠️ Category ${category.name} already exists, skipping`)
        continue
      }

      const { error } = await supabase
        .from('categories')
        .insert({
          name: category.name,
          description: category.description,
          created_by: adminUserId
        })
      
      if (error) {
        console.error(`Error creating category ${category.name}:`, error)
      } else {
        console.log(`✅ Created category: ${category.name}`)
      }
    }

    // 2. Seed pages
    console.log('📄 Creating pages...')
    for (const pageData of pages) {
      // Check if page already exists
      const { data: existingPage } = await supabase
        .from('pages')
        .select('id')
        .eq('slug', pageData.slug)
        .single()
      
      if (existingPage) {
        console.log(`⚠️ Page ${pageData.title} already exists, skipping`)
        continue
      }

      // Create the page
      const { data: page, error: pageError } = await supabase
        .from('pages')
        .insert({
          title: pageData.title,
          slug: pageData.slug,
          content: pageData.content,
          created_by: adminUserId,
          view_count: Math.floor(Math.random() * 100) + 10 // Random initial view count
        })
        .select()
        .single()

      if (pageError) {
        console.error(`Error creating page ${pageData.title}:`, pageError)
        continue
      }

      console.log(`✅ Created page: ${pageData.title}`)

      // Create initial revision
      const { error: revisionError } = await supabase
        .from('page_revisions')
        .insert({
          page_id: page.id,
          title: pageData.title,
          content: pageData.content,
          edit_summary: 'Initial page creation',
          created_by: adminUserId,
          revision_number: 1,
          is_approved: true,
          approved_by: adminUserId,
          approved_at: new Date().toISOString()
        })

      if (revisionError) {
        console.error(`Error creating revision for ${pageData.title}:`, revisionError)
      } else {
        console.log(`✅ Created initial revision for: ${pageData.title}`)
      }
    }

    console.log('🎉 Ballscord Wiki data seeding completed successfully!')
    console.log('📝 All pages including missing ones are now available:')
    pages.forEach(page => {
      console.log(`   - /wiki/${page.slug}`)
    })
    console.log('📝 Next steps:')
    console.log('   1. Update the admin user ID in your user_profiles table')
    console.log('   2. Visit your wiki to see the new content')
    console.log('   3. Test the previously broken links')

  } catch (error) {
    console.error('❌ Error during data seeding:', error)
    process.exit(1)
  }
}

// Run the seeder immediately
console.log('🚀 Starting Ballscord Wiki data seeding (including missing pages)...')
seedData()