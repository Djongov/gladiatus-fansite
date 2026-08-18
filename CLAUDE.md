# Gladiatus Fansite

## Project setup

- **Dev server:** `npm start` — runs Docusaurus on `http://localhost:3000` with hot reload
- **Production build:** `npm run build` — outputs static site to `/build`
- **Serve build locally:** `npm run serve`
- **Node version required:** 20+

## Architecture

- **Framework:** Docusaurus 3.9.2 (React + TypeScript static site generator)
- **Deployment:** Azure Static Web Apps at `https://gladiatus.gamerz-bg.com/` — auto-deploys on push to `main`
- **Content/docs:** `docs/` — MDX/Markdown pages (guides, calculators, planners)
- **Components:** `src/components/` — React components; major ones: `CharacterPlanner/`, `ForgeSimulator/`, `LootExplorer.tsx`, `Item.tsx`, `TrainingCalculator.jsx`
- **Item data:** `static/data/items/*.json` — `bases.json`, `prefixes.json`, `suffixes.json`, `upgrades.json`, `forging-goods.json`. This is the source of truth for all game item data.
- **Item page generation:** `docusaurus.config.ts` contains a custom plugin `itemPagesPlugin` that reads `prefixes.json` and `suffixes.json` at build time and dynamically generates individual pages for every prefix/suffix at `/items/prefix/[slug]` and `/items/suffix/[slug]`. Template is at `src/templates/itemPage.tsx`.
- **URL redirects:** `staticwebapp.config.json` has 100+ redirect rules for backwards compatibility with the legacy PHP/Joomla site.
- **Build URL sharing:** Character builds are serialised with LZ-string compression into a single `?s=` URL param. Logic lives in `src/components/CharacterPlanner/useCharacterState.ts`.

## Code conventions

- TypeScript for new code, some legacy JSX components remain
- British spelling throughout: `armour` not `armor`, matching the game
- Item stats use the exact key names from the JSON files (e.g. `hardening_value`, `block_value`)
- No repeatable code; components should be reusable and point to a single source of truth
- CSS Modules for component-scoped styles; global styles in `src/css/custom.css`

---

This is a fansite of the browser game Gladiatus, by Gameforge. There are no reliable wikis or data sources or APIs provided by the game officials so everything is reverse engineered by fellow players or reverse engineered using LLMs.

## Game structure and features

The game is a browser based MMO turn based RPG, set in Ancient Rome. There is only one class - Gladiator, although not officially named that way. Game is old and although it receives updates, it is from the end of 2000s era so no APIs or friendly ways to interact with the game are offered.

### Character stats

There are numerous stats a character can have but in general there are trainable stats and combat stats and their substats.

#### Battle system

The Battle system in Gladiatus is a non-animated turn based system that relies on Rounds. In PVP, rounds are 15 or until someone runs out of Life Points or in PVE, 20 Rounds or until someone runs out of Life Points. Each round a coin is flipped on who attacks first and then the opponent counter attacks. The chance to hit in the game is revolving around 50% or less so the RNG element of the fights is big which can cause sudden losses or wins against better or worse opponenets.

#### Character trainable stats

Character has 6 primary stats that are point based. You start with +5 stats from each stat on level 1 and can be increased by gold. There is a maximum that can be trained from gold on a character level and the formula is `Character Level * 5` *(from Level 1-40 the cap is 200)*. Each purchased stat point increases the next. Formulas below.

##### Strength

It provides flat Damage to the character's damage and the chance to block. It is relatively expensive and not worth as much to train.

Formula for how much gold each Strength stat costs: Each individual point purchased costs `(currentStatValue - 4)^2.6` gold, where `currentStatValue` is the stat's value *before* buying that point. Total cost = `FLOOR(SUM of (n - 4)^2.6 for each n from currentPoints up to targetPoints - 1)`.

Formula for how much Damage it provides: `FLOOR(Strength / 10)`

Formula for how much blocking value from Strength: `FLOOR(Strength / 10)`

##### Dexterity

Most important stat in the game. It increases chance to hit (which in Gladiatus is very low naturally) and the chance to double hit or critical hit. Critical hit can be boosted by items, double hit only from this stat. It is expensive stat to train.

Formula for how much gold each Dexterity stat costs: Each point costs `(currentStatValue - 4)^2.5` gold before buying it. Total = `FLOOR(SUM of (n - 4)^2.5 for each n from currentPoints up to targetPoints - 1)`.

Formula for how much critical attack value it provides: `FLOOR(Dexterity / 10)`

Formula for how much double hit it provides: Dexterity is the attacker's component in `(Charisma × Dexterity × 10) / (EnemyIntelligence × EnemyAgility)` %

##### Agility

Agility is the second most important stat after Dexterity. It is a defensive stat. Decreases opponent's chance of hitting and their chance of landing a double or critical hit. It also boosts Armour.

Formula for how much gold each Agility stat costs: Each point costs `(currentStatValue - 4)^2.3` gold before buying it. Total = `FLOOR(SUM of (n - 4)^2.3 for each n from currentPoints up to targetPoints - 1)`.

Formula for how much chance to hit it decreases for the opponent: Attacker's chance to hit = `FLOOR(Dexterity / (Dexterity + Agility) × 100)%` — your Agility sits in the denominator, directly reducing the opponent's hit chance.

Formula for how much critical hit it decreases for the opponent: Via Resilience — `critAvoidanceChance = MIN((totalResilience × 52 / (level - 8)) / 4, 25)%` where `totalResilience = FLOOR(Agility / 10) + itemHardeningValue`. Capped at 25%.

Formula for how much double hit it decreases for the opponent: Your Agility is the denominator in the attacker's double-hit formula: `(EnemyCharisma × EnemyDexterity × 10) / (EnemyIntelligence × Agility)` % — higher Agility directly reduces the opponent's chance.

Formula for how much hardening value (Resilience) it provides: `FLOOR(Agility / 10)`

#### Constitution

Constitution is the stat that boosts Life Points and regeneration.

Formula for how much gold each Constitution stat costs: Each point costs `(currentStatValue - 4)^2.3` gold before buying it. Total = `FLOOR(SUM of (n - 4)^2.3 for each n from currentPoints up to targetPoints - 1)`.

For formulas see Life Points formulas

#### Charisma

Charisma is one of the now lesser important stats. It increases the chance for double hit and threat.

Formula for how much gold each Charisma stat costs: Each point costs `(currentStatValue - 4)^2.5` gold before buying it. Total = `FLOOR(SUM of (n - 4)^2.5 for each n from currentPoints up to targetPoints - 1)`.

Formula for how much double hit it provides: `(Charisma × Dexterity × 10) / (EnemyIntelligence × EnemyAgility)` % — Charisma is the attacker's component alongside Dexterity. Threat from Charisma: `FLOOR(Charisma / 10)`

#### Character combat stats

##### Damage

Damage is in the form of {minDamage} - {maxDamage}. Where a random number is calculated on hit. Primary source is the weapon. Secondary is Strength, Grindstone enchants on weapons which update the flat damage of the Character and not to the weapon they are applied to and temporary buffs to flat damage or Strength.

Formula for calculating minDamage - Minimal damage of weapon + damage through items + (Strength / 10)

Formuma for calculating maxDamage - Maximal damage of weapon + damage through items + (Strength / 10)

#### Critical Damage

Critical Damage is where a character deal double damage

##### Life Points

This is the health of the Character. Damage takes out Life Points from characters or NPCs. When a character Life Points become 0, they automatically lose the battle they are in. In places like Underworld, reaching 0 Life Point thorws is more serious. Life Points can be increased from just character level, through direct item stats, through the stat Constitution, through temporary buffs or events. Life Points also have a regeneration rate in the form of {X} per hour but in reality it regens every second (the number of {X} per hour / 60).

Formula for Life Points from character level: `Level × 25`

Formula for Life Points from Constitution: `(Constitution × 25) - 50`

Formula for Life Points regeneration from character level: `Level × 2` per hour

Formula for Life Points regeneration from Constitution: `Constitution × 2` per hour (total regen = `(Level × 2) + (Constitution × 2)` per hour)

##### Armour

This is a flat number which negates Damage in the form of {minDamage} - {maxDamage}. Essentially if your enemy hits for 100-300 and your Armour negates 50-150, your opponents effective damage will be 50-150.

Formula for Armour for absorbing damage:

- Min absorbed: `MAX(0, CEIL(Armour/74 - Armour/74/660 + 1))`
- Max absorbed: `MAX(minAbsorbed, FLOOR(Armour/66 + Armour/660))`

Formula for Armour from Agility: Not found in codebase — Agility grants Resilience (hardening value) via `FLOOR(Agility / 10)`, not Armour. May not be implemented.

### Itemization

Gladiatus uses a great Diablo 2 inspired itemization where base items can have a prefix, a suffix or both. This offers a huge variety of item combinations throughout the levels.

#### Item levels

Items form their levels by combining the prefix level, the base item and the suffix level (if present).

#### Item stats

The game has a tendedency to use the british variants of words such as armour vs armor.

The items and their toolip has the following stats:

Name: Items have a name which is comprised of the name of the prefix (if any) + base item name + suffix (if any)

Here is a list of the available stats on an item. They come from prefixes or suffixes. They are in the order they should always appear in-game and on the item tooltips. Here we show how they are named in our data files and how it should be displayed (in white color always)

- 'damage'. Also known as Damage. Shown on tooltip as "Damage {min} - {max}". Damage has a minimum - maximum value

- 'armour'. Also known as Armour. Shown on tooltip as "Armour +{ammount}"

- 'strength'. Also known as Strength. Shown on tooltip as either "Strength +{ammount}" or "Strength +{ammount}%"

- 'dexterity'. Also known as Dexterity. Shown on tooltip as either "Dexterity +{ammount}" or "Dexterity +{ammount}%"

- 'agility'. Also known as Agility. Shown on tooltip as either "Agility +{ammount}" or "Agility +{ammount}%"

- 'constitution'. Also known as Constitution. Shown on tooltip as either "Constitution +{ammount}" or "Constitution +{ammount}%"

- 'charisma'. Also known as Charisma. Shown on tooltip as either "Charisma +{ammount}" or "Charisma +{ammount}%"

- 'intelligence'. Also known as Intelligence. Shown on tooltip as either "Intelligence +{ammount}" or "Intelligence +{ammount}%"

- 'healing'. Also known as Healing. Shown on the tooltip as "Healing +{ammount}"

'critical_healing_value'. Also known as Critical healing. Shown on the tooltip as "Critical healing value +{ammount}"

'critical_attack_value'. Also known as Critical attack value. Shown on the tooltip as "Critical attack value +{ammount}"

'block_value'. Also known as Block value. Shown on the tooltip as "Block value +{ammount}"

'hardening_value'. Also known as Resilience or Hardening value. Shown on the tooltip as "hardening value +{ammount}"

'threat'. Also known as Threat. Shown on the tooltip as "Threat +{ammount}"

After the stats from prefixes and suffixes, comes the item level. It is display on the tooltip as just "Level {ammount}" and in #9b9b9b. Items form their levels by combining the prefix level, the base item and the suffix level (if present).

After that comes the gold value. In the tooltips it is display as "Value +{ammount}". Gold value formula unconfirmed is this: Gold Value = CEILING(Base Gold * Rarity Multiplier) + Prefix Gold + Suffix Gold

After that comes the durability value which is in Lime color on the tooltip and is display as "Durability {currentDurability}/{maxDurability}". Formula for maxDurability = ROUND(Base Durability * Rarity Multiplier) + Rarity Tier Bonus

Rarity Tier Bonus:

Blue: +1
Purple: +2
Orange: +3
Red: +4
Red+: +5

After that comes the conditioning value of the item. Similar to durability it is displayed on the tooltip as "Conditioning {currentConditioning}/{maxConditioning}" but if {currentConditioning} is 0, it is in #9b9b9b color and it increases in color and brightness up to yellow color for full. Formula for maxDurability = FLOOR(Base Conditioning * Rarity Multiplier) - Conditioning Adjustment

Conditioning Adjustment:

Common/Green: 0
Blue/Purple: -1
Orange/Red: -2
Red+: -2

#### Item qualities

Sometimes also referred as rarity, the item qualities follow the example of other MMO or RPGs where, an item with no prefix or suffix are base items, Standard (white color, CSS white color) and if prefixes or suffixes are present:

- Item has a chance to be Ceres/Green (green color, CSS lime color), 1.0 stats, 1.0 (durability/conditioning)
- Item has a chance to be Neptune/Blue (blue color, #5159F7), x 1.15 stats , 1.5 (durability/conditioning)
- Item has a chance to be Mars/Purple (purple color, #E303E0), x 1.30 stats, 2.5 (durability/conditioning). This is a rare item and drops about 5% of the times.
- Item has a chance to be Jupiter/Orange (orange color, #ff8000) x 1.50 stats, 3.0 (durability/conditioning). This is a lot more rare than Purple and it only drops from level 102+
- Item has a chance to be Olympus/Red (red color, CSS red color) x 1.75 stats, 3.5 (durability/conditioning). This extremely rare. A lot less than 1% drop rate.

Conditioning players a role in the stats of the items. If an item is conditioned it takes the stats of the next color.

- Item that rarity Green and is conditioned has the stats of Blue unconditioned, also called green+
- Item that rarity Blue and is conditioned has the stats of Purple unconditioned, also called blue+
- Item that rarity Purple and is conditioned has the stats of Orange unconditioned, also called purple+
- Item that rarity Orange and is conditioned has the stats of Red unconditioned, also called orange+
- Item that rarity Red and is conditioned has the stats of x 2 Green, also called red+

#### Item images

Item images come from a single sprite at https://gladiatusfansite.blob.core.windows.net/images/item.png. Each item uses a backgrond offset to target its specific item from the sprite.

#### Item stat formulas

Stats coming from prefixes and suffixes are subject to the above Item qualities multipliers. So are other stats like Damage and Armour and etc. Here are some formulas for stat calculation (on green rarity)

##### Damage

So Damage is based on item level. Formula (for items with a prefix/suffix, on green rarity):

`levelMultiplier = prefixLevel + suffixLevel + 1`
`levelScaling = (levelMultiplier - 1) + FLOOR((levelMultiplier - 1) / 5)`

- Min damage: `FLOOR((CEIL(baseMin + levelScaling - 1 + 2×damageFromScroll) + 1 + damageMinOffset) × rarityMultiplier)`
- Max damage: `FLOOR((FLOOR(levelMultiplier / 2) + 2×FLOOR((levelMultiplier - 1) / 2) + baseMax + 2×damageFromScroll) × rarityMultiplier)`

For base items without prefix/suffix: `FLOOR(baseMin × rarityMultiplier)` and `FLOOR(baseMax × rarityMultiplier)`

##### Armour

Armour is also based on item level and armour type. Formula (for items with a prefix/suffix, on green rarity):

`totalLevel = prefixLevel + suffixLevel`

- Gloves: `FLOOR(baseArmour + (3 + totalLevel × 3/200) × totalLevel)`
- Shoes: `FLOOR(baseArmour + (6 + totalLevel × 3/100) × totalLevel)`
- Helmets: `FLOOR(baseArmour + (5 + totalLevel/40) × totalLevel)`
- Chest/Shield: `FLOOR(baseArmour + (10 + prefixLevel/20 + suffixLevel/20) × (totalLevel))`

Then flat armour from prefix/suffix is added, and the total is multiplied by rarityMultiplier and floored.

## Our structure

We want to have a UI that resembles the game directly. We want the players who visit the fansite to feel like they are in the game so our items and tooltips are made to look exactly like in-game.

## Our vision

- We need to allow for translation of the site
- We want to use modularity and component based approach. An item is an object loaded once and when referenced somewhere else, it always need to point to a core object/component
- We don't want repeatable code anywhere and we want good function and variale names
