---
title: Homepage
slug: /
keywords: [Gladiatus]
tags:
  - News
description: Welcome to Gladiatus best fansite - Expeditions, Dungeons, Underworld, Guides
image: https://gladiatusfansite.blob.core.windows.net/images/Gladiatus_hero_of_Rome.jpg
sidebar_class_name: hidden
---

Hey friends, I am happy to announce that the website has a 10 year anniversary and for it, it will get a complete makeover. It will move from a Joomla 3.10 CMS to the great static site generator - Docusaurus. On top of that, It will go on Github and will be public

![News Announcements](https://gladiatusfansite.blob.core.windows.net/images/announcement_imperator.png "News Announcements")

## Open Questions

Hey guys. We have a couple of open questions that need answering. Like formulas mostly. If you are someone who knows the answer to any of the below, please contact me on Discord - Skarsburning.

1. What is the formula for materials needed in Forging when the item has both prefix and suffix. It is no longer the sum of materials from prefix + suffix + base.
2. What is the formula for gold value/Durability/Conditioning of an item when it receives a suffix/prefix or both and with rarity levels (green, orange, red and etc)
3. How do we know if an item is conditioned from the anonymous profile page of a player
4. What happens when you wear broken items
5. What is the formula for experience needed for level after level 80

---

## Latest Gladiatus News

### Desert of Nightmare

11.10.2026 - 24.10.2026 - Important cosutme will be available and -80% training cost possibility!

---

## Events – October 2026

### 02.10.2026 0:00:00 - 03.10.2026 23:59:59

- -50% Forging time (and smelting)
- 15% forging success

### 05.10.2026 0:00:00 - 07.10.2026 23:59:59

- 100% dungeon XP
- 50% gold loot in dungeons
- 50% more dungeon points
- 10% chance of finding an item

### 09.10.2026 0:00:00 - 11.10.2026 23:59:59 - New servers only

- 50% more expedition points
- 50% faster regeneration of expedition points
- 50% gold loot on expeditions
- 100% expedition XP
- -25% training costs
- 10% chance of finding an item

### 10.10.2026 0:00:00 - 11.10.2026 23:59:59 - Old servers only

- No durability loss
- 50% gold loot on expeditions
- 30% expedition XP
- 200% arena XP
- 100% dungeon XP
- -25% Forging time (and smelting)

### 13.10.2026 0:00:00 - 14.10.2026 23:59:59

- -20% training costs

### 16.10.2026 0:00:00 - 17.10.2026 23:59:59

- No durability loss
- 20% gold loot on expeditions
- 10% chance of finding ruby on expedition

### 19.10.2026 0:00:00 - 20.10.2026 23:59:59

- 100% dungeon XP
- 200% arena XP
- 30% expedition XP

### 22.10.2026 0:00:00 - 24.10.2026 23:59:59

- 100% Pantheon quest gold, experience, grace, honor
- -50% cooldown for quests
- 50% more expedition points

### 26.10.2026 0:00:00 - 28.10.2026 23:59:59

- 25% forging success
- -10% forge duration
- 10% chance of a resource / scroll
- 30% chance of finding an item

### 30.10.2026 0:00:00 - 31.10.2026 23:59:59

- The chance to obtain additional loot on expeditions and in dungeons is increased by 20%
- 25% more dungeon points
- 25% more expedition points

---

## To Do List

- Find what the formula for materials is when prefix and suffix are mixed together. So far we hardcode them through a file that has all possible variations. Taken from [gladiatus-tools](https://gitlab.com/gladiatus-tools-ng/website/-/raw/master/src/data/prefixes_suffixes_recipes.json?ref_type=heads "gladiatus tools")
- Character planner partial costumes do not render well
- Find what the formula is for gold, durability and conditiong is when prefix/suffix or both are applied to an item

---

## Latest website news

### 20.05.2025

- Standalone Expedition Simulator
- New Arena (PvP) Simulator

### 19.05.2025

- A lot has been going on, hard to keep track of it here but notable mentions are:
  - We had our first official contribution to the project - MIcQo contributing nice filters to the Loot Exporer
  - We had our first full PR and full new feature created by another person (other than me) - arslanbenzer donating us the Optimal Build Simulation
  - Loading a character profile. This new feature let's you load a profile while browsing the site enabling some key features:
    - Your character name and level shown in the site header.
    - The Training Calculator auto-fills your base stats so you only type your target levels.
    - Fight any mob in any expedition with your loaded character — full battle simulation with full battle report, just like you are in-game.
    - Character Planner loads your character by default

### 26.03.2026

- Refreshed the Wild Farm page as the event announced and coming soon

### 24.03.2026

- There has been a huge effort from the community on finding all the new prefixes and suffixes and we finally have them all here

### 18.03.2026

- Storming the Coast dungeon page is now completed as well as few other dungeons bosses that got revealed. Just as names and images

### 10.03.2026

- New tool - Loot Explorer. Let's you explore all the possible combination of items in Gladiatus, searching for loot that you need

### 04.03.2026

- Big news on Dungeons for Britannia from Gameforge. I added all the pages required with placeholder info

### 03.03.2026

- Battle at Hadrian's wall announcement + fixed and modernized event page

### 28.02.2026

- Added 2 new pages, Top Prefixes and Top Suffixes, as requested from fans, these are present in the old site so I restored them

### 25.02.2026

- Planner is now fully functional. The only thing left is to find a way to know if an item is conditioned or not when importing a profile
- Item planner now shows materials needed for crafting

### 18.02.2026

- A lot of progress on the Character planner. It actually looks quite promising now. Tens of hours put into this in the last week.

### 04.02.2026

- Gameforge announced a surprise event coming with discount on guild buildings. Never seen before. So adapted the Guild Buildings calculator
- Fixed char planner issue where protective gear and poweders were not offered to respective slots or taken into account
- Big update on forging goods
- Char planner now live

### 03.02.2026

- I've been making huge progresses towards the itemization and character planner. Too much to put here. Progress has been great!

### 19.01.2026

- I made great progress into the items and the tooltips. Figured out the formula for damage, armor, durability and conditioning between rarities
- This will allow for great automation on displaying them on the page in beautiful way
- In the past week, I've been working on a new tool - Gladiatus Global Ranking at [Gladiatus API](https://gladiatus-api.gamerz-bg.com "Global Ranking"). It's realeased now and it's super fun to browse. Go and check it.

### 11.01.2026

- Experiments with Items and tooltips

### 10.01.2026

Today's migration progress:

- Fixed most broken links which was a huge job
- Now Prefixes and Suffixes have dynamically created routes without having hundreds of markdown files
- Published the site live

### 09.01.2026

Today's migration progress (huge effort):

- Finished main work on the expeditions, fixed broken links across dungeons and expeditions
- Events structure improved
- Costumes now has individual pages
- Underworld formatting and costumes taken out into Costumes
- Big changes to Forging Goods. Now every forging good gets its own page and link
- Forging pages migrated
- Guild done and reworked into individual pages
- Huge breakthrough for displaying items, with React, with tooltips
- Extracted all the base items, prefixes and suffixes into json files and objects
- Item prefixes and suffixes now display great and are searchable and sortable
- Split the big Items markdown into smaller ones under Items

### 08.01.2026

Today's migration progress:

- working on Expeditions mainly. I've decided to do a big change on Expeditions and split them all into their own file and url

### 07.01.2026

Today's migration progress:

- Fixed the about me page
- Calculators rebuilt in JSX
- Dungeon table recreated in Markdown
- Videos page done
- Some other cleanups

### 06.01.2026

I decided to start migrating the website from the old Joomla implementation to Markdown based Docusaurus and open-source it in Github. With the help of Github Copilot, I am migrating the pages. Here is what happened in the first day:

- Initial Docusaurus config and init
- Layout and UI to get close to the original
- Started ordering how the pages would stack in the menu
- Dungeons are fixed as a lot of stuff was missing from the migration script
- Costumes page perfected
