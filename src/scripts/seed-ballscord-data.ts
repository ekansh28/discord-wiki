/* scripts/seed-ballscord-data.ts
import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mbessirvgrfztivyftfl.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY

if (!supabaseKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_KEY")
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Updated ballscord page content as the main page
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
* **The Birth (2021)**: Founded by [[Ekansh]] and friends, the server began as a small community spun off from another group. Early experiments with vanity URLs (like "tech" and later "racism") attracted rapid—if unpredictable—growth.
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
[[File:ekanshPFP.png|40x40px]] **[https://instagram.com/15ekansh ekansh]** – creator of the server

### Co-Owners
[[File:jaonPFP.png|50x50px]] **[[Jaon]]** – co-owner

[[File:genPFP.png|50x50px]] **[[Gen]]** – co-owner

[[File:aleksPFP.png|50x50px]] **[[Aleks]]** – co-owner

### Moderators
* **[[Mod1]]** – The Peacekeeper. Wields banhammer like it's Excalibur on a caffeine drip.
* **[[Mod2]]** – Brings justice with less mercy than a microwave timer.
* **[[Mod3]]** – Organizes events and regrets them instantly.

### Notable Members
* **[[ClownLord69]]** – Meme overlord. You've laughed at his content and hated yourself after.
* **[[SpammerDude]]** – Banned 15 times, came back 16. He is inevitable.
* **[[HistorianBot]]** – Has a better memory than your ex. Records everything, including that one time you rage quit.

## Channels

**Important**
* #info — Has staff applications and the appeal server link.
* #rules
* #announcements
* #color-roles

**General**
* #general — Often gets purged and deleted.
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
* #wear-or-tear — Rate peoples' clothes.
* #stage

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
* [[Ekansh]]
* [[List of Server Memes]]
* [[Community Guidelines]]
* [[Help:Editing]]

[[Category:Discord Servers]]
[[Category:Communities]]
[[Category:Main]]`

interface PageData {
  title: string
  slug: string
  content: string
  categories: string[]
}

const pages: PageData[] = [
  {
    title: 'Ballscord',
    slug: 'ballscord', // This becomes the main page
    content: ballscordMainPageContent,
    categories: ['Discord Servers', 'Communities', 'Main']
  },
  {
    title: 'Ekansh',
    slug: 'ekansh',
    content: `## Ekansh

**Ekansh** (born in 2005) is the founder and owner of [[Ballscord]], known for creating one of Discord's most chaotic communities.

### Biography
Ekansh started his online journey at age 15 and quickly became known for his edgy humor and community building skills. He founded Ballscord and has been its central figure ever since.

### Projects
* **[[Ballscord]]** - Discord server with 9000+ members
* **[https://tinchat.online TinChat]** - Social platform
* **Music** - Experimental ambient artist on Spotify

### Social Media
* **Instagram**: [https://instagram.com/15ekansh @15ekansh]
* **Spotify**: [https://open.spotify.com/artist/72uXuSxQ9QxRGsPQ25QUNe Ekansh on Spotify]

[[Category:Users]]
[[Category:Server Owners]]
[[Category:Musicians]]`,
    categories: ['Users', 'Server Owners', 'Musicians']
  },
  {
    title: 'Server Lore',
    slug: 'server-lore',
    content: `# Server Lore

The complete history of [[Ballscord]] from its founding in 2021 to the present day.

## Timeline

### 2021: The Beginning
* Server founded by [[Ekansh]]
* Early growth and community building
* First vanity URL experiments

### 2022-2024: Evolution
* Major events and drama
* Community milestones
* Ongoing development

## Major Events
* **The Great Emoji War**
* **Vanity URL Struggles**
* **The Mod Revolt**
* **NSFW Channel Purges**

For the complete uncensored history, visit: [https://www.geocities.ws/ballscord/pages/Lore/Lore.html Official Archives]

[[Category:History]]
[[Category:Ballscord]]`,
    categories: ['History', 'Ballscord']
  },
  {
    title: 'Help:Editing',
    slug: 'help-editing',
    content: `# Help: Editing Pages

Learn how to edit and create pages on the Ballscord Wiki.

## Getting Started
1. **Login** - You need to be logged in to edit pages
2. **Click Edit** - Use the edit button on any page
3. **Make Changes** - Use the visual or source editor
4. **Save** - Add an edit summary and save your changes

## Visual Editor
The visual editor lets you format text easily:
* **Bold** and *italic* formatting
* Headings and lists
* Wiki links: \`[[Page Name]]\`
* Images and tables
* Colors and fonts

## Wiki Markup
For advanced users, the source editor supports:
* \`**bold**\` and \`*italic*\`
* \`# Heading 1\`, \`## Heading 2\`
* \`[[Link to Page]]\`
* \`* List items\`

## Creating Links
Link to other pages: \`[[Ballscord]]\`
Link with custom text: \`[[Ekansh|Server Owner]]\`

## Tips
* Always provide edit summaries
* Be respectful and constructive
* Follow [[Community Guidelines]]
* Ask for help if needed

[[Category:Help]]`,
    categories: ['Help']
  },
  {
    title: 'Community Guidelines',
    slug: 'community-guidelines',
    content: `# Community Guidelines

Rules and guidelines for contributing to the Ballscord Wiki.

## General Rules
1. **Be respectful** to all users
2. **Stay on topic** - Keep content relevant
3. **No vandalism** - Don't damage existing content
4. **Cite sources** when possible
5. **Use edit summaries** to explain changes

## Content Standards
* Write in a neutral tone
* Keep content appropriate
* Respect copyright
* Avoid personal attacks

## Editing Etiquette
* Make constructive edits
* Discuss disagreements
* Be bold but careful
* Ask moderators for help

## Consequences
Violations may result in warnings, blocks, or bans.

## Questions?
Contact moderators in the Discord server or ask on user talk pages.

[[Category:Community]]
[[Category:Help]]`,
    categories: ['Community', 'Help']
  },
  {
    title: 'Featured Content',
    slug: 'featured-content',
    content: `# Featured Content

Showcase of the best articles and content on the Ballscord Wiki.

## Featured Articles

### [[Ballscord]]
The main article about the Discord server, covering its history, culture, and community.

### [[Ekansh]]
Biography of the server founder and his various projects.

### [[Server Lore]]
Comprehensive timeline of major events and drama.

## How to Nominate
1. Ensure the article is well-written
2. Check it follows wiki standards
3. Post on community discussion
4. Get consensus from editors

## Criteria
Featured content should be:
* Accurate and comprehensive
* Well-written and engaging
* Properly formatted
* Representative of quality

[[Category:Featured]]
[[Category:Community]]`,
    categories: ['Featured', 'Community']
  }
]

const categories = [
  { name: 'Discord Servers', description: 'Discord server related pages' },
  { name: 'Communities', description: 'Online communities and groups' },
  { name: 'Users', description: 'User profiles and information' },
  { name: 'Server Owners', description: 'Discord server owners and administrators' },
  { name: 'Musicians', description: 'Musical artists and creators' },
  { name: 'History', description: 'Historical information and timelines' },
  { name: 'Ballscord', description: 'Everything related to the Ballscord server' },
  { name: 'Help', description: 'Help and tutorial pages for using the wiki' },
  { name: 'Featured', description: 'Featured and highlighted content' },
  { name: 'Community', description: 'Community guidelines and policies' },
  { name: 'Main', description: 'Main/homepage content' }
]

async function seedData() {
  console.log('🚀 Starting Ballscord Wiki data seeding with Ballscord as main page...')

  try {
    const adminUserId = 'a37c22fa-7f5d-4e68-afc0-34d093eff609'

    // 1. Seed categories first
    console.log('📁 Creating categories...')
    for (const category of categories) {
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
      const { data: existingPage } = await supabase
        .from('pages')
        .select('id')
        .eq('slug', pageData.slug)
        .single()
      
      if (existingPage) {
        console.log(`⚠️ Page ${pageData.title} already exists, updating content...`)
        
        // Update existing page content
        const { error: updateError } = await supabase
          .from('pages')
          .update({
            title: pageData.title,
            content: pageData.content
          })
          .eq('slug', pageData.slug)
        
        if (updateError) {
          console.error(`Error updating page ${pageData.title}:`, updateError)
        } else {
          console.log(`✅ Updated page: ${pageData.title}`)
        }
        continue
      }

      // Create new page
      const { data: page, error: pageError } = await supabase
        .from('pages')
        .insert({
          title: pageData.title,
          slug: pageData.slug,
          content: pageData.content,
          created_by: adminUserId,
          view_count: Math.floor(Math.random() * 100) + 10
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
    console.log('📝 Main page is now /wiki/ballscord')
    console.log('📝 Available pages:')
    pages.forEach(page => {
      const isMain = page.slug === 'ballscord' ? ' (MAIN PAGE)' : ''
      console.log(`   - /wiki/${page.slug}${isMain}`)
    })
    console.log('📝 Next steps:')
    console.log('   1. Update your navigation to point to /wiki/ballscord')
    console.log('   2. Test the visual editor improvements')
    console.log('   3. Verify login prompts work for non-logged users')

  } catch (error) {
    console.error('❌ Error during data seeding:', error)
    process.exit(1)
  }
}

// Run the seeder
seedData()
*/