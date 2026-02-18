import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { BaseItem, PrefixSuffix, ItemRarity, calculateItemStats } from '../Item';

/**
 * Unicode-safe base64 encoding
 * Handles special characters, emojis, and international characters
 */
function safeBase64Encode(str: string): string {
  // Convert string to UTF-8 bytes, then to base64
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => {
    return String.fromCharCode(Number.parseInt(p1, 16));
  }));
}

/**
 * Unicode-safe base64 decoding
 * Handles special characters, emojis, and international characters
 */
function safeBase64Decode(str: string): string {
  // Decode from base64 to UTF-8 bytes, then to string
  return decodeURIComponent(Array.prototype.map.call(atob(str), (c: string) => {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
}

export type ItemSlotType = 'helmet' | 'amulet' | 'chest' | 'gloves' | 'mainHand' | 'offHand' | 'shoes' | 'ring1' | 'ring2';

export interface Upgrade {
  name: string;
  type: 'powder' | 'enchant';
  stat: 'strength' | 'dexterity' | 'agility' | 'constitution' | 'charisma' | 'intelligence' | 'damage' | 'armour';
  applicableTo: string[];
  permanent: boolean;
  description: string;
}

export interface AppliedUpgrade {
  upgrade: Upgrade;
  level: number; // Item level of the upgrade (determines stat bonus)
}

export interface EquippedItem {
  baseItem: BaseItem;
  prefix?: PrefixSuffix;
  suffix?: PrefixSuffix;
  rarity: ItemRarity;
  conditioned: boolean;
  enchantValue?: number; // Legacy: Grindstone (+Damage) for weapons, Protective gear (+Armor) for armor
  upgrades?: AppliedUpgrade[]; // New system: powders and other upgrades
}

export interface BaseStats {
  strength: number;
  dexterity: number;
  agility: number;
  constitution: number;
  charisma: number;
  intelligence: number;
}

export interface CharacterIdentity {
  name: string;
  title?: string;
  costume?: string;
  gender: 'male' | 'female';
}

export interface CharacterStats {
  totalArmor: number;
  minDamageAbsorbed: number;
  maxDamageAbsorbed: number;
  totalResilience: number;
  maxResilience: number;
  critAvoidanceChance: number;
  resilienceFromAgility: number;
  resilienceFromItems: number;
  totalBlocking: number;
  maxBlocking: number;
  blockChance: number;
  blockingFromStrength: number;
  blockingFromItems: number;
  totalThreat: number;
  threatFromCharisma: number;
  threatFromItems: number;
  totalCriticalAttack: number;
  maxCriticalAttack: number;
  criticalHitChance: number;
  criticalAttackFromDexterity: number;
  criticalAttackFromItems: number;
  chanceToHit: number;
  chanceToDoubleHit: number;
  totalDamageMin: number;
  totalDamageMax: number;
  totalHealth: number;
  stats: Map<string, { flat: number; percent: number }>;
  // Damage breakdown
  damageFromWeapons: { min: number; max: number };
  damageFromStrength: number;
  damageFromItems: number;
  // Health breakdown
  healthFromLevel: number;
  healthFromConstitution: number;
  healthFromItems: number;
  healthRegenPerHour: number;
}

export interface CharacterState {
  equippedItems: Map<ItemSlotType, EquippedItem>;
  characterLevel: number;
  baseStats: BaseStats;
  characterIdentity: CharacterIdentity;
  setCharacterLevel: (level: number) => void;
  setBaseStats: (stats: Partial<BaseStats>) => void;
  setCharacterGender: (gender: 'male' | 'female') => void;
  setItem: (slot: ItemSlotType, item: EquippedItem | null) => void;
  removeItem: (slot: ItemSlotType) => void;
  clearAll: () => void;
  characterStats: CharacterStats;
  loadFromUrl: () => void;
  importProfile: (level: number, stats: BaseStats, items: Map<ItemSlotType, EquippedItem>, identity: CharacterIdentity) => void;
}

/**
 * Calculate stat bonus from an upgrade based on its level
 * - Powders: level is the direct bonus amount (user enters the stat value)
 * - Grindstone (damage): level / 5 (round up)
 * - Protective gear (armour): level / 5 (round up)
 */
function calculateUpgradeBonus(upgrade: Upgrade, level: number): number {
  if (upgrade.type === 'powder') {
    // Powders: level field contains the direct bonus amount
    return level;
  } else if (upgrade.stat === 'damage' || upgrade.stat === 'armour') {
    // Grindstone and Protective gear: level / 5, round up
    return Math.ceil(level / 5);
  }
  return 0;
}

// Roman names for random character generation
const ROMAN_FIRST_NAMES = [
  'Marcus', 'Gaius', 'Lucius', 'Gnaeus', 'Quintus', 'Titus', 'Aulus', 
  'Publius', 'Spurius', 'Manius', 'Servius', 'Appius', 'Decimus',
  'Tiberius', 'Sextus', 'Numerius', 'Caeso', 'Vibius', 'Volesus',
];

const ROMAN_LAST_NAMES = [
  'Antonius', 'Julius', 'Claudius', 'Cornelius', 'Fabius', 'Valerius',
  'Aemilius', 'Manlius', 'Junius', 'Aurelius', 'Calpurnius', 'Cassius',
  'Horatius', 'Octavius', 'Pompeius', 'Sergius', 'Livius', 'Tullius',
  'Sabinus', 'Flavius', 'Maximus', 'Martialis', 'Severus', 'Brutus',
];

function generateRandomRomanName(): string {
  const firstName = ROMAN_FIRST_NAMES[Math.floor(Math.random() * ROMAN_FIRST_NAMES.length)];
  const lastName = ROMAN_LAST_NAMES[Math.floor(Math.random() * ROMAN_LAST_NAMES.length)];
  return `${firstName}${lastName}`;
}

/**
 * Custom hook to manage character planner state
 * Handles equipped items, stat calculations, and URL sharing
 */
export function useCharacterState(): CharacterState {
  const [equippedItems, setEquippedItems] = useState<Map<ItemSlotType, EquippedItem>>(new Map());
  const [characterLevel, setCharacterLevel] = useState<number>(1);
  const [characterIdentity, setCharacterIdentity] = useState<CharacterIdentity>(() => ({
    name: generateRandomRomanName(),
    title: undefined,
    gender: 'male',
  }));
  const [baseStats, setBaseStatsState] = useState<BaseStats>({
    strength: 5,
    dexterity: 5,
    agility: 5,
    constitution: 5,
    charisma: 5,
    intelligence: 5,
  });
  const isInitialMount = useRef(true);

  /**
   * Load character build from URL query parameters
   */
  const loadFromUrl = useCallback(() => {
    if (globalThis.window === undefined) return;

    try {
      const params = new URLSearchParams(globalThis.window.location.search);
      const buildData = params.get('build');
      const levelParam = params.get('level');
      const statsParam = params.get('stats');
      
      if (levelParam) {
        const level = Number.parseInt(levelParam, 10);
        if (level >= 1 && level <= 150) {
          setCharacterLevel(level);
        }
      }

      if (statsParam) {
        try {
          const decoded = safeBase64Decode(statsParam);
          const stats = JSON.parse(decoded);
          setBaseStatsState(stats);
        } catch (e) {
          console.error('Failed to load stats from URL:', e);
        }
      }

      // Load character identity (name, title, costume)
      const identityParam = params.get('identity');
      if (identityParam) {
        try {
          const decoded = safeBase64Decode(identityParam);
          const identity = JSON.parse(decoded);
          setCharacterIdentity(identity);
        } catch (e) {
          console.error('Failed to load character identity from URL:', e);
        }
      }
      
      if (buildData) {
        // Decode base64 and parse JSON
        const decoded = safeBase64Decode(buildData);
        const data = JSON.parse(decoded);
        
        const newItems = new Map<ItemSlotType, EquippedItem>();
        
        // Reconstruct equipped items from serialized data
        Object.entries(data).forEach(([slot, itemData]: [string, any]) => {
          if (itemData) {
            newItems.set(slot as ItemSlotType, itemData);
          }
        });
        
        setEquippedItems(newItems);
      }
    } catch (error) {
      console.error('Failed to load build from URL:', error);
    }
  }, []);

  // Load from URL on mount
  useEffect(() => {
    loadFromUrl();
  }, [loadFromUrl]);

  // Update URL when items, level, or stats change (skip on initial mount)
  useEffect(() => {
    // Skip the first render to allow loadFromUrl to populate state first
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (globalThis.window === undefined) return;

    try {
      // Convert Map to plain object for serialization
      const itemsObj: Record<string, EquippedItem> = {};
      equippedItems.forEach((item, slot) => {
        itemsObj[slot] = item;
      });

      // Update URL without reload
      const url = new URL(globalThis.window.location.href);
      
      // Add items if any
      if (equippedItems.size > 0) {
        const json = JSON.stringify(itemsObj);
        console.log('Encoding items JSON, length:', json.length);
        const encoded = safeBase64Encode(json);
        url.searchParams.set('build', encoded);
      } else {
        url.searchParams.delete('build');
      }
      
      // Add level
      url.searchParams.set('level', characterLevel.toString());
      
      // Add base stats
      const statsJson = JSON.stringify(baseStats);
      console.log('Encoding stats JSON:', statsJson);
      const statsEncoded = safeBase64Encode(statsJson);
      url.searchParams.set('stats', statsEncoded);
      
      // Add character identity (name, title, costume/image)
      const identityJson = JSON.stringify(characterIdentity);
      const identityEncoded = safeBase64Encode(identityJson);
      url.searchParams.set('identity', identityEncoded);
      
      globalThis.window.history.replaceState({}, '', url.toString());
    } catch (error) {
      console.error('Failed to update URL:', error);
      // Log more details about the error
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
    }
  }, [equippedItems, characterLevel, baseStats, characterIdentity]);

  /**
   * Set or update an item in a specific slot
   */
  const setItem = (slot: ItemSlotType, item: EquippedItem | null) => {
    setEquippedItems(prev => {
      const newItems = new Map(prev);
      if (item) {
        newItems.set(slot, item);
      } else {
        newItems.delete(slot);
      }
      return newItems;
    });
  };

  /**
   * Remove item from a slot
   */
  const removeItem = (slot: ItemSlotType) => {
    setEquippedItems(prev => {
      const newItems = new Map(prev);
      newItems.delete(slot);
      return newItems;
    });
  };

  /**
   * Clear all equipped items
   */
  const clearAll = () => {
    setEquippedItems(new Map());
  };

  /**
   * Update base stats (partial update supported)
   */
  const setBaseStats = (newStats: Partial<BaseStats>) => {
    setBaseStatsState(prev => ({ ...prev, ...newStats }));
  };

  /**
   * Update character gender
   */
  const setCharacterGender = (gender: 'male' | 'female') => {
    setCharacterIdentity(prev => ({ ...prev, gender }));
  };

  /**
   * Import profile data (bulk import for level, stats, items, and identity)
   */
  const importProfile = (level: number, stats: BaseStats, items: Map<ItemSlotType, EquippedItem>, identity: CharacterIdentity) => {
    setCharacterLevel(level);
    setBaseStatsState(stats);
    setEquippedItems(items);
    setCharacterIdentity(identity);
  };

  /**
   * Calculate total character stats from all equipped items
   */
  const characterStats = useMemo((): CharacterStats => {
    let totalArmor = 0;
    let totalDamageMin = 0;
    let totalDamageMax = 0;
    let totalHealth = 0;
    let bonusDamageFromItems = 0; // +Damage from non-weapon items
    let enchantDamageBonus = 0; // +Damage from grindstones
    let enchantArmorBonus = 0; // +Armor from protective gear
    const combinedStats = new Map<string, { flat: number; percent: number }>();

    // Process each equipped item
    equippedItems.forEach((equippedItem, slot) => {
      const itemStats = calculateItemStats(
        equippedItem.baseItem,
        equippedItem.rarity,
        equippedItem.conditioned,
        equippedItem.prefix,
        equippedItem.suffix
      );

      // Add armor
      if (itemStats.armour) {
        totalArmor += itemStats.armour;
      }

      // Add enchant bonus based on item type (legacy system)
      if (equippedItem.enchantValue) {
        if (slot === 'mainHand') {
          // Grindstone for weapons
          enchantDamageBonus += equippedItem.enchantValue;
        } else {
          // Protective gear for armor pieces (including shields)
          enchantArmorBonus += equippedItem.enchantValue;
        }
      }

      // Process upgrades (new system: powders, etc.)
      if (equippedItem.upgrades && equippedItem.upgrades.length > 0) {
        equippedItem.upgrades.forEach(appliedUpgrade => {
          const bonus = calculateUpgradeBonus(appliedUpgrade.upgrade, appliedUpgrade.level);
          
          if (appliedUpgrade.upgrade.stat === 'damage') {
            enchantDamageBonus += bonus;
          } else if (appliedUpgrade.upgrade.stat === 'armour') {
            enchantArmorBonus += bonus;
          } else {
            // Powder stats (strength, dexterity, etc.)
            const statName = appliedUpgrade.upgrade.stat.charAt(0).toUpperCase() + appliedUpgrade.upgrade.stat.slice(1);
            const existing = combinedStats.get(statName) || { flat: 0, percent: 0 };
            combinedStats.set(statName, {
              flat: existing.flat + bonus,
              percent: existing.percent,
            });
          }
        });
      }

      // Add damage (only from weapons in mainHand/offHand)
      if ((slot === 'mainHand' || slot === 'offHand') && itemStats.damage) {
        totalDamageMin += itemStats.damage.min;
        totalDamageMax += itemStats.damage.max;
      }

      // Add +Damage from non-weapon items (including shields, but not mainHand weapons)
      if (slot !== 'mainHand' && itemStats.prefixDamage !== 0) {
        bonusDamageFromItems += itemStats.prefixDamage;
      }

      // Add health from prefix
      totalHealth += itemStats.prefixHealth;

      // Combine all stats
      itemStats.stats.forEach(stat => {
        const existing = combinedStats.get(stat.name) || { flat: 0, percent: 0 };
        combinedStats.set(stat.name, {
          flat: existing.flat + stat.flat,
          percent: existing.percent + stat.percent,
        });
      });
    });

    // Add enchant bonuses to totals
    totalArmor += enchantArmorBonus;

    // Calculate Damage Absorption
    // Minimal armour absorption = (Armour/74)-(Armour/74)/660+1 [round up], if negative then 0
    const minAbsorption = Math.ceil((totalArmor / 74) - (totalArmor / 74) / 660 + 1);
    const minDamageAbsorbed = Math.max(0, minAbsorption);
    // Maximal armour absorption = (Armour/66)+(Armour/660) [round down]
    const maxDamageAbsorbed = Math.floor((totalArmor / 66) + (totalArmor / 660));

    // Calculate final agility value (base + flat bonuses + percentage bonuses), capped at max
    const agilityStat = combinedStats.get('Agility') || { flat: 0, percent: 0 };
    const agilityPercentBonus = Math.round(baseStats.agility * (agilityStat.percent / 100));
    const uncappedAgility = baseStats.agility + agilityStat.flat + agilityPercentBonus;
    const maxAgility = baseStats.agility + Math.floor(baseStats.agility / 2) + characterLevel;
    const finalAgility = Math.min(uncappedAgility, maxAgility);
    
    // Calculate Resilience: floor(Agility/10) + hardening_value from items
    const hardeningValueStat = combinedStats.get('Hardening Value') || { flat: 0, percent: 0 };
    const resilienceFromAgility = Math.floor(finalAgility / 10);
    const resilienceFromItems = hardeningValueStat.flat;
    const totalResilience = resilienceFromAgility + resilienceFromItems;
    
    // Calculate Maximum Resilience Cap: FLOOR(24.5*4*(level-8)/52)+1
    const maxResilience = Math.floor((24.5 * 4 * (characterLevel - 8) / 52) + 1);
    
    // Calculate Chance to avoid critical hits: (Resilience * 52 / (level-8)) / 4
    // Protect against division by zero for low levels
    // Cap at 25% maximum
    const critAvoidanceChance = characterLevel > 8 
      ? Math.min((totalResilience * 52 / (characterLevel - 8)) / 4, 25)
      : 0;

    // Calculate final strength value (base + flat bonuses + percentage bonuses), capped at max
    const strengthStat = combinedStats.get('Strength') || { flat: 0, percent: 0 };
    const strengthPercentBonus = Math.round(baseStats.strength * (strengthStat.percent / 100));
    const uncappedStrength = baseStats.strength + strengthStat.flat + strengthPercentBonus;
    const maxStrength = baseStats.strength + Math.floor(baseStats.strength / 2) + characterLevel;
    const finalStrength = Math.min(uncappedStrength, maxStrength);
    
    // Calculate Blocking: floor(Strength/10) + block_value from items
    const blockValueStat = combinedStats.get('Block Value') || { flat: 0, percent: 0 };
    const blockingFromStrength = Math.floor(finalStrength / 10);
    const blockingFromItems = blockValueStat.flat;
    const totalBlocking = blockingFromStrength + blockingFromItems;
    
    // Calculate Maximum Blocking Cap: FLOOR((49.5*6*(level-8)/52)+1)
    const maxBlocking = Math.floor((49.5 * 6 * (characterLevel - 8) / 52) + 1);
    
    // Calculate Chance to block a hit: (Blocking value * 52 / (level-8)) / 6
    const blockChance = characterLevel > 8
      ? (totalBlocking * 52 / (characterLevel - 8)) / 6
      : 0;
    
    // Calculate final dexterity value (base + flat bonuses + percentage bonuses), capped at max
    const dexterityStat = combinedStats.get('Dexterity') || { flat: 0, percent: 0 };
    const dexterityPercentBonus = Math.round(baseStats.dexterity * (dexterityStat.percent / 100));
    const uncappedDexterity = baseStats.dexterity + dexterityStat.flat + dexterityPercentBonus;
    const maxDexterity = baseStats.dexterity + Math.floor(baseStats.dexterity / 2) + characterLevel;
    const finalDexterity = Math.min(uncappedDexterity, maxDexterity);
    
    // Calculate Critical Attack: floor(Dexterity/10) + Critical Attack Value from items
    const criticalAttackValueStat = combinedStats.get('Critical Attack Value') || { flat: 0, percent: 0 };
    const criticalAttackFromDexterity = Math.floor(finalDexterity / 10);
    const criticalAttackFromItems = criticalAttackValueStat.flat;
    const totalCriticalAttack = criticalAttackFromDexterity + criticalAttackFromItems;
    
    // Calculate Maximum Critical Attack Cap: FLOOR((49.5*5*(level-8)/52)+1)
    const maxCriticalAttack = Math.floor((49.5 * 5 * (characterLevel - 8) / 52) + 1);
    
    // Calculate Chance for critical hit: (Critical attack value * 52 / (level-8)) / 5
    const criticalHitChance = characterLevel > 8
      ? (totalCriticalAttack * 52 / (characterLevel - 8)) / 5
      : 0;
    
    // Calculate Chance to hit: Your Dexterity/(Your Dexterity + Enemy Agility) x 100
    // Simulate enemy agility as player's max agility
    const chanceToHit = Math.floor((finalDexterity / (finalDexterity + maxAgility)) * 100);
    
    // Calculate final charisma value (base + flat bonuses + percentage bonuses), capped at max
    const charismaStat = combinedStats.get('Charisma') || { flat: 0, percent: 0 };
    const charismaPercentBonus = Math.round(baseStats.charisma * (charismaStat.percent / 100));
    const uncappedCharisma = baseStats.charisma + charismaStat.flat + charismaPercentBonus;
    const maxCharisma = baseStats.charisma + Math.floor(baseStats.charisma / 2) + characterLevel;
    const finalCharisma = Math.min(uncappedCharisma, maxCharisma);
    
    // Calculate Threat: floor(Charisma/10) + threat from items
    const threatStat = combinedStats.get('Threat') || { flat: 0, percent: 0 };
    const threatFromCharisma = Math.floor(finalCharisma / 10);
    const threatFromItems = threatStat.flat;
    const totalThreat = threatFromCharisma + threatFromItems;
    
    // Calculate final intelligence value (base + flat bonuses + percentage bonuses), capped at max
    const intelligenceStat = combinedStats.get('Intelligence') || { flat: 0, percent: 0 };
    const intelligencePercentBonus = Math.round(baseStats.intelligence * (intelligenceStat.percent / 100));
    const uncappedIntelligence = baseStats.intelligence + intelligenceStat.flat + intelligencePercentBonus;
    const maxIntelligence = baseStats.intelligence + Math.floor(baseStats.intelligence / 2) + characterLevel;
    const finalIntelligence = Math.min(uncappedIntelligence, maxIntelligence);
    
    // Calculate Chance to double hit: Your Charisma * Your Dexterity / Enemy Intelligence / Enemy Agility * 10
    // Simulate enemy intelligence as player's max intelligence and enemy agility as player's max agility
    const chanceToDoubleHit = (finalCharisma * finalDexterity * 10) / (maxIntelligence * maxAgility);
    
    // Add 10% of Strength as damage
    const strengthDamage = Math.floor(finalStrength * 0.1);
    
    // Calculate final constitution value (base + flat bonuses + percentage bonuses), capped at max
    const constitutionStat = combinedStats.get('Constitution') || { flat: 0, percent: 0 };
    const constitutionPercentBonus = Math.round(baseStats.constitution * (constitutionStat.percent / 100));
    const uncappedConstitution = baseStats.constitution + constitutionStat.flat + constitutionPercentBonus;
    const maxConstitution = baseStats.constitution + Math.floor(baseStats.constitution / 2) + characterLevel;
    const finalConstitution = Math.min(uncappedConstitution, maxConstitution);
    
    // Calculate health components
    const healthFromLevel = characterLevel * 25;
    const healthFromConstitution = (finalConstitution * 25) - 100;
    const healthFromItems = totalHealth;
    const maxHealth = healthFromLevel + healthFromConstitution + healthFromItems;
    
    // Calculate health regeneration per hour
    const healthRegenPerHour = (characterLevel * 2) + (finalConstitution * 2);
    
    // Store weapon damage before adding bonuses
    const weaponDamageMin = totalDamageMin;
    const weaponDamageMax = totalDamageMax;
    
    // Add bonus damage from items, enchants, and strength to total damage
    totalDamageMin += bonusDamageFromItems + enchantDamageBonus + strengthDamage;
    totalDamageMax += bonusDamageFromItems + enchantDamageBonus + strengthDamage;

    return {
      totalArmor,
      minDamageAbsorbed,
      maxDamageAbsorbed,
      totalResilience,
      maxResilience,
      critAvoidanceChance,
      resilienceFromAgility,
      resilienceFromItems,
      totalBlocking,
      maxBlocking,
      blockChance,
      blockingFromStrength,
      blockingFromItems,
      totalThreat,
      threatFromCharisma,
      threatFromItems,
      totalCriticalAttack,
      maxCriticalAttack,
      criticalHitChance,
      criticalAttackFromDexterity,
      criticalAttackFromItems,
      chanceToHit,
      chanceToDoubleHit,
      totalDamageMin,
      totalDamageMax,
      totalHealth: maxHealth,
      stats: combinedStats,
      damageFromWeapons: { min: weaponDamageMin, max: weaponDamageMax },
      damageFromStrength: strengthDamage,
      damageFromItems: bonusDamageFromItems + enchantDamageBonus,
      healthFromLevel,
      healthFromConstitution,
      healthFromItems,
      healthRegenPerHour,
    };
  }, [equippedItems, baseStats, characterLevel]);

  return {
    equippedItems,
    characterLevel,
    baseStats,
    characterIdentity,
    setCharacterLevel,
    setBaseStats,
    setCharacterGender,
    setItem,
    removeItem,
    clearAll,
    characterStats,
    loadFromUrl,
    importProfile,
  };
}
