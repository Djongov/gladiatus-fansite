import React, { useState, useEffect } from 'react';
import { useActiveCharacter } from '@site/src/hooks/useActiveCharacter';
import { decodeCharacterState } from '@site/src/components/CharacterPlanner/useCharacterState';
import { getTrainingCap } from '@site/src/utils/trainingCap';

export default function TrainingCalculator() {
  // initial state
  const initialStats = {
    strengthFrom: 5, strengthTo: '',
    dexterityFrom: 5, dexterityTo: '',
    agilityFrom: 5, agilityTo: '',
    constitutionFrom: 5, constitutionTo: '',
    charismaFrom: 5, charismaTo: '',
    intelligenceFrom: 5, intelligenceTo: '',
    characterLevel: '',
    trainingGroundLevel: 0,
    costumeDiscount: 0,
    furtherDiscount: 0,
  };

  const [stats, setStats] = useState(initialStats);
  const [results, setResults] = useState(null);
  const [prefilledFrom, setPrefilledFrom] = useState(null); // string | null

  const { character } = useActiveCharacter();

  useEffect(() => {
    if (!character) return;
    const isDefaultsFrom = (
      stats.strengthFrom === 5 && stats.dexterityFrom === 5 &&
      stats.agilityFrom === 5 && stats.constitutionFrom === 5 &&
      stats.charismaFrom === 5 && stats.intelligenceFrom === 5
    );
    if (!isDefaultsFrom) return;

    try {
      const decoded = decodeCharacterState(character.encoded, '');
      const b = decoded.baseStats;
      setStats(prev => ({
        ...prev,
        strengthFrom: b.strength,     strengthTo: b.strength,
        dexterityFrom: b.dexterity,   dexterityTo: b.dexterity,
        agilityFrom: b.agility,       agilityTo: b.agility,
        constitutionFrom: b.constitution, constitutionTo: b.constitution,
        charismaFrom: b.charisma,     charismaTo: b.charisma,
        intelligenceFrom: b.intelligence, intelligenceTo: b.intelligence,
        characterLevel: character.level,
      }));
      setPrefilledFrom(character.identity.name);
    } catch (err) {
      console.warn('[TrainingCalculator] failed to decode active character; skipping prefill:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character]);

  const resetStats = () => {
    setStats(initialStats);
    setResults(null);
    setPrefilledFrom(null);
  };

  const clearAutoload = () => {
    setStats(prev => ({
      ...prev,
      strengthFrom: 5,     strengthTo: '',
      dexterityFrom: 5,    dexterityTo: '',
      agilityFrom: 5,      agilityTo: '',
      constitutionFrom: 5, constitutionTo: '',
      charismaFrom: 5,     charismaTo: '',
      intelligenceFrom: 5, intelligenceTo: '',
      characterLevel: '',
    }));
    setPrefilledFrom(null);
  };

  const formatNumber = (num) => {
    if (!num && num !== 0) return '';
    return num.toString().replaceAll(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const costStat = (from, to, coeff, trainingGroundDiscount, costumeDiscount, additionalDiscount) => {
    from = Number.parseInt(from) || 0;
    to = Number.parseInt(to) || 0;
    let baseCount = 0;
    for (let i = from; i < to; i++) baseCount += Math.pow(i - 4, coeff);
    
    // Add all discounts together (compound)
    const totalDiscount = trainingGroundDiscount + (costumeDiscount / 100) + additionalDiscount;
    
    // Apply the total discount once to the base cost
    const finalCost = baseCount * (1 - totalDiscount);
    
    return { 
      base: Math.floor(baseCount), 
      final: Math.floor(finalCost),
      totalDiscountPercent: totalDiscount * 100
    };
  };

  const calculateStats = () => {
    const trainingGroundDiscount = 2 * stats.trainingGroundLevel / 100;
    const costumeDiscount = stats.costumeDiscount;
    const additionalDiscount = stats.furtherDiscount / 100;

    const strengthCost = costStat(stats.strengthFrom, stats.strengthTo, 2.6, trainingGroundDiscount, costumeDiscount, additionalDiscount);
    const dexterityCost = costStat(stats.dexterityFrom, stats.dexterityTo, 2.5, trainingGroundDiscount, costumeDiscount, additionalDiscount);
    const agilityCost = costStat(stats.agilityFrom, stats.agilityTo, 2.3, trainingGroundDiscount, costumeDiscount, additionalDiscount);
    const constitutionCost = costStat(stats.constitutionFrom, stats.constitutionTo, 2.3, trainingGroundDiscount, costumeDiscount, additionalDiscount);
    const charismaCost = costStat(stats.charismaFrom, stats.charismaTo, 2.5, trainingGroundDiscount, costumeDiscount, additionalDiscount);
    const intelligenceCost = costStat(stats.intelligenceFrom, stats.intelligenceTo, 2.4, trainingGroundDiscount, costumeDiscount, additionalDiscount);

    // Calculate totals
    const totalBase = strengthCost.base + dexterityCost.base + agilityCost.base + constitutionCost.base + charismaCost.base + intelligenceCost.base;
    const finalTotal = strengthCost.final + dexterityCost.final + agilityCost.final + constitutionCost.final + charismaCost.final + intelligenceCost.final;
    const totalSaved = totalBase - finalTotal;

    setResults({
      stats: {
        strength: strengthCost,
        dexterity: dexterityCost,
        agility: agilityCost,
        constitution: constitutionCost,
        charisma: charismaCost,
        intelligence: intelligenceCost
      },
      totals: {
        base: totalBase,
        final: finalTotal
      },
      savings: {
        total: totalSaved
      }
    });
  };


  const handleChange = (e) => {
    const { id, value, type, checked } = e.target;
    setStats(prev => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : (type === 'number' || id === 'trainingGroundLevel' || id === 'furtherDiscount' || id === 'costumeDiscount') ? parseInt(value) : value
    }));
  };

  const trainingCap = Number.isInteger(stats.characterLevel) && stats.characterLevel > 0
    ? getTrainingCap(stats.characterLevel)
    : null;

  const handleSetToMax = (stat) => {
    if (trainingCap === null) return;
    const toKey = `${stat}To`;
    const fromKey = `${stat}From`;
    setStats(prev => ({
      ...prev,
      [toKey]: Number(prev[toKey]) === trainingCap ? prev[fromKey] : trainingCap,
    }));
  };

  const getMaxButtonTitle = (stat, isAtMax) => {
    if (trainingCap === null) return 'Enter a Character Level first';
    if (isAtMax) return `Set back to current value (${stats[stat + 'From']})`;
    return `Set to max trainable at this level (${trainingCap})`;
  };

  const GoldIcon = () => (
    <img 
      src="https://gladiatusfansite.blob.core.windows.net/images/icon_gold.gif" 
      alt="Gold" 
      style={{ width: '16px', verticalAlign: 'middle', marginLeft: '4px' }} 
    />
  );

  return (
    <div style={{ overflowX: 'auto' }}>
      {prefilledFrom && (
        <div style={{
          marginBottom: 12,
          padding: '8px 12px',
          background: 'var(--ifm-color-emphasis-100)',
          borderLeft: '3px solid #c2a66a',
          fontSize: 14,
        }}>
          Loaded from <strong>{prefilledFrom}</strong>{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); clearAutoload(); }}>
            Reset to defaults
          </a>
        </div>
      )}
      {/* Discount Configuration Section */}
      <div style={{ 
        backgroundColor: '#D5C19A', 
        padding: '15px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        border: '1px solid #ddd'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Discount Configuration</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
          <div>
            <label htmlFor="characterLevel" style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
              Character Level
            </label>
            <input
              type="number"
              min={1}
              id="characterLevel"
              value={stats.characterLevel}
              onChange={handleChange}
              style={{ width: '100%', padding: '5px', boxSizing: 'border-box' }}
            />
            <small style={{ color: '#424242' }}>Used for the "Max" button on each stat</small>
          </div>

          <div>
            <label htmlFor="trainingGroundLevel" style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
              Training Grounds Level
            </label>
            <select 
              id="trainingGroundLevel" 
              value={stats.trainingGroundLevel} 
              onChange={handleChange}
              style={{ width: '100%', padding: '5px' }}
            >
              {Array.from({length:21}, (_, i) => (
                <option key={i} value={i}>
                  Level {i} ({i * 2}% discount)
                </option>
              ))}
            </select>
            <small style={{ color: '#424242' }}>From guild</small>
          </div>
          
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
              Costume Bonus
            </label>
            <select 
              id="costumeDiscount" 
              value={stats.costumeDiscount} 
              onChange={handleChange}
              style={{ width: '100%', padding: '5px' }}
            >
              <option value={0}>None (0%)</option>
              <option value={3}>Neptune's Fluid Might (3%)</option>
              <option value={20}>Bubona's Bull Armour (20%)</option>
            </select>
            <small style={{ color: '#424242' }}>From wearing a costume</small>
          </div>
          
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
              Additional Discount
            </label>
            <select 
              id="furtherDiscount" 
              value={stats.furtherDiscount} 
              onChange={handleChange}
              style={{ width: '100%', padding: '5px' }}
            >
              {Array.from({ length: 26 }, (_, i) => (
                <option key={i} value={i}>{i}%</option>
              ))}
            </select>
            <small style={{ color: '#424242' }}>From Microevent or Food (bunny or pumpkin)</small>
          </div>
        </div>
      </div>

      {/* Stats Input Table */}
      <table style={{ width: '100%', marginBottom: '20px' }}>
        <thead>
          <tr>
            <th>Stat</th>
            <th>From</th>
            <th>To</th>
            <th>Base Cost</th>
            <th>Discounted Cost</th>
            <th>Saved</th>
          </tr>
        </thead>
        <tbody>
          {['strength','dexterity','agility','constitution','charisma','intelligence'].map((stat) => {
            const statName = stat.charAt(0).toUpperCase() + stat.slice(1);
            const statData = results?.stats[stat];
            const hasCost = statData && statData.base > 0;
            
            return (
              <tr key={stat}>
                <td style={{ fontWeight: 'bold' }}>{statName}</td>
                <td>
                  <input
                    type="number"
                    min={1}
                    id={`${stat}From`}
                    value={stats[`${stat}From`]}
                    onChange={handleChange}
                    style={{ width: '90px', padding: '5px' }}
                  />
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <input
                    type="number"
                    min={1}
                    id={`${stat}To`}
                    value={stats[`${stat}To`]}
                    onChange={handleChange}
                    style={{ width: '90px', padding: '5px' }}
                  />
                  {(() => {
                    const isAtMax = trainingCap !== null && Number(stats[`${stat}To`]) === trainingCap;
                    return (
                      <button
                        type="button"
                        onClick={() => handleSetToMax(stat)}
                        disabled={trainingCap === null}
                        title={getMaxButtonTitle(stat, isAtMax)}
                        style={{
                          marginLeft: '6px',
                          padding: '4px 8px',
                          fontSize: '12px',
                          width: '48px',
                          cursor: trainingCap === null ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {isAtMax ? 'Base' : 'Max'}
                      </button>
                    );
                  })()}
                </td>
                <td>
                  {hasCost && (
                    <>
                      {formatNumber(statData.base)}
                      <GoldIcon />
                    </>
                  )}
                </td>
                <td style={{ fontWeight: 'bold', color: hasCost ? '#2e7d32' : 'inherit' }}>
                  {hasCost && (
                    <>
                      {formatNumber(statData.final)}
                      <GoldIcon />
                    </>
                  )}
                </td>
                <td style={{ color: '#d32f2f' }}>
                  {hasCost && statData.base !== statData.final && (
                    <>
                      {formatNumber(statData.base - statData.final)}
                      <GoldIcon />
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Action Buttons */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <button 
          onClick={calculateStats}
          style={{ 
            padding: '10px 30px', 
            fontSize: '16px',
            marginRight: '10px',
            cursor: 'pointer'
          }}
        >
          Calculate
        </button>
        <button 
          onClick={resetStats}
          style={{ 
            padding: '10px 30px', 
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          Reset
        </button>
      </div>

      {/* Results Summary */}
      {results && (
        <div style={{ 
          padding: '20px', 
          borderRadius: '8px',
          border: '1px solid #ddd',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#424242', marginBottom: '5px' }}>
              Base Cost (No Discounts)
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
              {formatNumber(results.totals.base)}
              <GoldIcon />
            </div>
          </div>
          
          <div style={{ fontSize: '40px', color: '#424242' }}>→</div>
          
          {results.savings.total > 0 && (
            <>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '14px', color: '#d32f2f', marginBottom: '5px', fontWeight: 'bold' }}>
                  Saved
                </div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#d32f2f' }}>
                  {formatNumber(results.savings.total)}
                  <GoldIcon />
                </div>
                <div style={{ fontSize: '14px', color: '#424242', marginTop: '5px' }}>
                  ({Math.round((results.savings.total / results.totals.base) * 100)}% off)
                </div>
              </div>
              
              <div style={{ fontSize: '40px', color: '#424242' }}>=</div>
            </>
          )}
          
          <div style={{ 
            textAlign: 'center',
            backgroundColor: '#f9f9f9',
            padding: '20px',
            borderRadius: '8px',
            border: '2px solid #333'
          }}>
            <div style={{ fontSize: '16px', marginBottom: '10px', fontWeight: 'bold' }}>
              Final Cost (With All Discounts)
            </div>
            <div style={{ fontSize: '42px', fontWeight: 'bold' }}>
              {formatNumber(results.totals.final)}
              <GoldIcon />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
