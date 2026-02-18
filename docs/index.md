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

1. What is the formula for materials needed when the item has both prefix and suffix
2. What is the formula for gold value/Durability/Conditioning of an item when it receives a suffix/prefix or both and with rarity levels (green, orange, red and etc)
3. How do we know if an item is conditioned from the anonymous profile page of a player
4. What happens when you wear broken items?

## Latest Gladiatus News

### New Servers

New servers arrive on Friday 06 February 2026. Reported list is:

- EN/UK: Server 78, speed x4.
- US: Server 43, speed x2.

## Events – February 2026

### New Servers Only — 06.02.2026 00:00 – 08.02.2026 23:59

- +50% expedition points
- +50% gold loot on expeditions
- +50% faster regeneration of expedition points
- −25% training costs
- +10% chance of finding an item
- +100% expedition XP

### Old Servers Only — 07.02.2026 00:00 – 08.02.2026 23:59

- No durability loss
- +50% gold loot on expeditions
- −25% forging and smelting time
- +200% dungeon XP
- +200% arena XP
- +30% expedition XP

### 09.02.2026 00:00 – 11.02.2026 23:59

- +30% gold loot on expeditions
- +10% chance of finding an item
- +50% expedition XP

### 13.02.2026 00:00 – 14.02.2026 23:59

- +20% chance of finding a resource or scroll

### 16.02.2026 00:00 – 17.02.2026 23:59

- −25% training costs

### 19.02.2026 00:00 – 21.02.2026 23:59

- +20% chance to obtain additional loot on expeditions and in dungeons
- +25% faster regeneration of dungeon points
- +25% more dungeon points

### 22.02.2026 00:00 – 23.02.2026 23:59

- +50% expedition points
- +50% faster regeneration of expedition points
- −50% quest cooldown
- +50% more dungeon points
- +10% chance of finding ruby on expeditions

### 25.02.2026 00:00 – 27.02.2026 23:59

- +20% chance to obtain additional loot on expeditions and in dungeons
- −35% guild expansion cost
- +25% expedition points
- +25% faster regeneration of expedition points

## To Do List

- Find what the formula for materials is when prefix and suffix are mixed together
- Make Expeditions come from data files and not just plain text
- Character planner to show substats like critical strike and etc
- Character planner partial costumes do not render well
- Find what the formula is for gold, durability and conditiong is when prefix/suffix or both are applied to an item

## Latest website news

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
