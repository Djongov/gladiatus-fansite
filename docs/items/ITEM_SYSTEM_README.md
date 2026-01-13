# Gladiatus Item System Documentation

## Overview

The item system consists of:
- **Base Items**: Core items from `bases.json` with base stats
- **Rarities**: 6 rarity levels that multiply base stats
- **Conditioning**: Additional 25% bonus when active
- **Prefixes/Suffixes**: Add custom stats and bonuses (future implementation)

## Component Usage

### Simple Base Item (White)
```tsx
import Item from '@site/src/components/Item';

<Item baseItem={club} />
```

### With Prefix/Suffix (Auto Green)
```tsx
<Item 
  baseItem={sword} 
  prefix="Antonius"
  suffix="of Assassination"
/>
```

### Full Featured Item
```tsx
<Item 
  baseItem={sword} 
  prefix="Antonius"
  suffix="of Assassination"
  rarity="red"
  conditioned={true}
  enchantValue={33}
/>
```

## Stat Calculation System

### Durability & Conditioning Multipliers
Based on actual in-game formulas:
- **Common/Green**: ×1.0 (base stats)
- **Blue**: ×1.5
- **Purple**: ×2.5
- **Orange**: ×3.0
- **Red**: ×3.5

### Conditioning Bonus
- **Not Conditioned**: No additional multiplier
- **Conditioned**: Adds ×0.5 (equivalent to moving up one rarity tier)

Examples:
- Green + Conditioned = ×1.5 (same as Blue)
- Blue + Conditioned = ×2.0 (between Blue and Purple)
- Red + Conditioned = ×4.0 (best possible for durability/conditioning)

### Damage System
Damage uses **flat additions**, not multipliers:
- **Green/Blue/Purple**: Base damage (no bonus)
- **Orange** (or Purple+Cond): +1 to max damage
- **Red** (or Orange+Cond): +2 to max damage
- **Red+Conditioned**: +1 to min, +3 to max damage

Example with Club (base 1-3):
- Green: 1-3
- Orange: 1-4
- Red: 1-5
- Red+Conditioned: 2-6

### Total Multiplier
For durability, conditioning, and gold:
`Total = Rarity Base Multiplier + (0.5 if conditioned)`

Examples:
- Red + Conditioned: 3.5 + 0.5 = **×4.0** (best possible)
- Orange + Conditioned: 3.0 + 0.5 = **×3.5**
- Red + Not Conditioned: 3.5 + 0 = **×3.5**

### Affected Stats
**Multiplier applies to:**
- Durability
- Conditioning (max value)
- Gold value

**Flat additions apply to:**
- Damage (min and max)

**NOT affected:**
- Materials (always base values)
- Item type
- Item level

## Programmatic API

### Calculate Item Stats
```tsx
import { calculateItemStats } from '@site/src/components/Item';

const stats = calculateItemStats(
  baseItem,      // BaseItem object
  'red',         // rarity
  true,          // conditioned
  'Antonius',    // prefix (optional)
  'of Assassination' // suffix (optional)
);

// Returns CalculatedItemStats:
{
  name: "Antonius Long sword of Assassination",
  rarity: "red",
  damage: { min: 8, max: 11 },
  armor: undefined,
  durability: 16642,
  conditioning: { current: 9373, max: 9373 },
  gold: 1147,
  stats: {},  // Will contain prefix/suffix stats when implemented
  bonusMultiplier: 2.8125
}
```

## TypeScript Interfaces

### BaseItem
```typescript
interface BaseItem {
  name: string;
  type: 'weapons' | 'shields' | 'armor' | 'helmets' | 'gloves' | 'shoes' | 'rings' | 'amulets';
  level: number | null;
  damageMin?: number;
  damageMax?: number;
  armor?: number | null;
  durability: number | null;
  conditioning: number | null;
  gold: number | null;
  image: string;
  materials: Record<string, number>;
}
```

### PrefixSuffix
```typescript
interface PrefixSuffix {
  name: string;
  stats?: Record<string, number>;  // e.g., { "Strength": 10, "Dexterity": 5 }
  damageBonus?: number;            // Flat damage bonus
  armorBonus?: number;             // Flat armor bonus
  applicableTypes?: string[];      // Which item types can use this
}
```

### CalculatedItemStats
```typescript
interface CalculatedItemStats {
  name: string;
  rarity: ItemRarity;
  damage?: { min: number; max: number };
  armor?: number;
  durability?: number;
  conditioning: { current: number; max: number };
  gold?: number;
  stats: Record<string, number>;
  bonusMultiplier: number;
}
```

## Future: Prefix/Suffix Implementation

When ready to add actual prefix/suffix stats:

1. Create `static/data/items/prefixes.json` (see prefixes.json.example)
2. Create `static/data/items/suffixes.json` (see suffixes.json.example)
3. Load and pass as objects instead of strings:

```tsx
import prefixes from '@site/static/data/items/prefixes.json';
import suffixes from '@site/static/data/items/suffixes.json';

const antoniusPrefix = prefixes.find(p => p.name === 'Antonius');
const assassinationSuffix = suffixes.find(s => s.name === 'of Assassination');

<Item 
  baseItem={sword}
  prefix={antoniusPrefix}
  suffix={assassinationSuffix}
  rarity="red"
  conditioned={true}
/>
```

The stats will automatically:
- Display in the tooltip
- Be included in `calculateItemStats` output
- Be available for character planner calculations

## Character Planner Integration

```tsx
function calculateTotalCharacterStats(equippedItems) {
  let totalDamage = { min: 0, max: 0 };
  let totalArmor = 0;
  let totalStats = {};
  
  equippedItems.forEach(item => {
    const stats = calculateItemStats(
      item.baseItem,
      item.rarity,
      item.conditioned,
      item.prefix,
      item.suffix
    );
    
    // Accumulate damage
    if (stats.damage) {
      totalDamage.min += stats.damage.min;
      totalDamage.max += stats.damage.max;
    }
    
    // Accumulate armor
    if (stats.armor) {
      totalArmor += stats.armor;
    }
    
    // Accumulate all stats from prefixes/suffixes
    Object.entries(stats.stats).forEach(([stat, value]) => {
      totalStats[stat] = (totalStats[stat] || 0) + value;
    });
  });
  
  return { totalDamage, totalArmor, totalStats };
}
```

## File Structure

```
static/data/items/
├── bases.json              # All base items (required)
├── prefixes.json.example   # Example prefix structure
├── suffixes.json.example   # Example suffix structure
└── (future)
    ├── prefixes.json       # Actual prefix data
    └── suffixes.json       # Actual suffix data

src/components/
├── Item.tsx                # Main item component
├── CustomItemTooltip.tsx   # Custom tooltip (existing items)
└── BaseItemTooltip.tsx     # Old component (deprecated)

docs/items/
├── base-items-demo.mdx           # Item component examples
└── character-planner-demo.mdx    # Character planner example
```

## Migration from Old Components

- **ItemTooltip** → **CustomItemTooltip**: For hand-crafted items with custom stats
- **BaseItemTooltip** → **Item**: For items from bases.json with automatic calculations
- Use **Item** for all new implementations

## Benefits of This System

1. **Automatic Calculations**: Stats update based on rarity and conditioning
2. **Type Safe**: Full TypeScript support
3. **Reusable**: Same component for display and calculations
4. **Future Proof**: Ready for prefix/suffix stats
5. **Character Planner Ready**: Exported calculation functions
6. **Consistent**: Single source of truth for item stats
