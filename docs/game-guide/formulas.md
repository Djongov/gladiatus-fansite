---
title: Gladiatus Formulas
sidebar_label: Formulas
slug: /game-guide/formulas
---

Here is a collection of Gladiatus formulas. They are really hard to gather so please if you know any formula that is missing from here, please let me know on the email in the About Me page.

Formulas here are gathered from own research, forums and special thanks to the Gladiatus Crazy Addon - GreatApo & DarkThanos

The ones that are tested and are confirmed working with the latest version of the game will be marked with **(Confirmed)** in the end. If you see **(Confirmed)** on the entire category, it means all the formulas under that category are verified working. If you don't see it on the category head, individual formulas will be marked confirmed

Everything you see here is also explained in greater detail in the Game Guide page, especially in the [Character Stats](/game-guide#Character_stats "Character Stats") topic.

---

## Health points (Confirmed)

**Max Health points** = Health points from level + Health points through constitution + Health points from items + Health points from reinforcements

**Health points from level** = Character Level \*25

**Health points through constitution** = (Constitution\*2)-50

**Base Health points Regeneration (per Hour) =** Through Level + Through Constitution

**Through Level** = Character Level \*2

**Through Constitution** = Constitution \*2

Every other buff to Health points regeneration is on top of the Base Health points regeneration

Example. from guild, buffs, blessings, costumes

---

## Experience points

**From level 1-52**

(10\*(level+1)-5)-10

**From level 53-79**

(10\*(level+0.5))-10

From level 80+ - Unknown

---

## Character stats (Confirmed)

**Maximum of a stat (Strength, Dexterity, A...)** = Basic trained stat + (basic / 2) + Character Level

Example:

Character Level = 115

Basic Strength (through training) = 226

Formula = 226 + (226/2) + 115 = 226 + 113 + 115 = 454

Strength through items or dusts or holy oils cannot go higher than the max. Buffs that can increase the max stat temporary are pacts, Godly rank 1 buffs and reinforcements (excluding dusts)

![Max stat explained](https://gladiatusfansite.blob.core.windows.net/images/Startup_guide/max_stat.png "Max stat explained")

**Maximum stats through training =** Character Level \*5 (from Level 1-40 the cap is 200)

Example: Character Level = 115. 115\*5 = 575

![Max train stat explained](https://gladiatusfansite.blob.core.windows.net/images/Startup_guide/max_stat_2.png "Max train stat explained")

### Damage

**Minimal damage** = Minimal damage of weapon + damage through items + (Strength / 10)

**Maximal damage** = Maximal damage of weapon + damage through items + (Strength / 10)

### Armour

**Minimal armour absorption** = (Armour/74)-(Armour/74)/660+1 \[round up\]  
 If result is negative then it is 0

**Maximal armour absorption** (Armour/66)+(Armour/660) \[round down\]

---

## Combat (Confirmed)

**Chance for hit** = Your Dexterity/(Your Dexterity + Enemies Agility) x 100 \[round down\]

**Chance for double hit** = Your Charisma \* Your Dexterity / Enemy Intelligence / Enemy Agility \* 10

**Total Resilience/hardening value** = (Agility/10) \[round down\] + hardening value from items

**Your maximum cap for amassing hardening value is** = FLOOR.MATH(24.5\*4\*(Character Level-8)/52)+1

**Chance to avoid critical hits** = (Resilience \* 52 / (Character Level-8 )) / 4

**Total Blocking value** = (Strength/10) \[round down\] + Block value from items

**Your maximum cap for amassing Blocking value is =** FLOOR.MATH(49.5\*6\*(Character Level-8)/52)+1

**Chance to block a hit** = (Blocking value \* 52 / (Character Level-8 )) / 6

**Total Critical attack value** = (Dexterity/10) \[round down\] + Critical attack value from items

**Your maximum cap for amassing Critical hit value** = FLOOR.MATH(49.5\*5\*(Character Level-8)/52)+1

**Chance for critical hit** = (Critical attack value \* 52 / (Character Level-8 )) / 5

**Total Critical healing value =** (Intelligence/5) \[round down\] + Critical healing value from items

**Your maximum cap for amassing Critical healing value =** FLOOR.MATH(89.5\*7\*(Character Level-8)/52)+1

**Chance for Critical healing** = (Critical healing \* 52 / (Character Level-8 ) / 8

**Normal healing** = 4/5\* Intelligence \[round down\] + Healing from items

**Critical healing** = 2\*normal healing

**Threat:** basic threat per round for mercs in "draw attention to oneself mode"= (Charisma/10) \[round down\] + threat from objects (Not confirmed)

---

## Items

**Damage by grindstone** = Level of upgrade / 5 \[round up\]

**Statistic bonus by colored powder** = Level of powder / 7 \[round down\]

**Visibility of items on market** =

Max Level you can see is the minimum of the following two: Player Level + 9 or 1.25 \* Player Level (\<-round down) Or if you do the maths: From 5-36 player level, Max Level you can see = 1.25 \* player level (\<-round down) From 36+, Max Level you can see = player level + 9

**Visibility on auction house** =

Minimum levels you can see: 0.75 \* Player Level (\<-round down) Maximum levels you can see is the minimum of the following two: Player Level + 14 or 1.25 \* Player Level + 5.75 (\<-round up) Or if you do the maths: From 5-33 player level, Max Level you can see = 1.25 \* player level + 5.75 (\<-round up) From 33+, Max Level you can see = player level + 14

**Character can wear items** =

Max level you can wear is Player Level +16. More about it [here](/game-guide#Item-visibility)