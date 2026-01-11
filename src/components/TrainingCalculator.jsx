import React, { useState } from 'react';

export default function TrainingCalculator() {
  // initial state
  const initialStats = {
    strengthFrom: 5, strengthTo: '',
    dexterityFrom: 5, dexterityTo: '',
    agilityFrom: 5, agilityTo: '',
    constitutionFrom: 5, constitutionTo: '',
    charismaFrom: 5, charismaTo: '',
    intelligenceFrom: 5, intelligenceTo: '',
    trainingGroundLevel: 0,
    costumeDiscount: 0,
    furtherDiscount: 0,
  };

  const [stats, setStats] = useState(initialStats);
  const [results, setResults] = useState(null);

  const resetStats = () => {
    setStats(initialStats);
    setResults(null);
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

  const GoldIcon = () => (
    <img 
      src="https://gladiatusfansite.blob.core.windows.net/images/icon_gold.gif" 
      alt="Gold" 
      style={{ width: '16px', verticalAlign: 'middle', marginLeft: '4px' }} 
    />
  );

  return (
    <div style={{ overflowX: 'auto' }}>
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
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
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
            <th>From Level</th>
            <th>To Level</th>
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
                    type="text" 
                    id={`${stat}From`} 
                    value={stats[`${stat}From`]} 
                    onChange={handleChange}
                    style={{ width: '80px', padding: '5px' }}
                  />
                </td>
                <td>
                  <input 
                    type="text" 
                    id={`${stat}To`} 
                    value={stats[`${stat}To`]} 
                    onChange={handleChange}
                    style={{ width: '80px', padding: '5px' }}
                  />
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
