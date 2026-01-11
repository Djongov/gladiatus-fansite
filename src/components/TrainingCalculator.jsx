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
  const [results, setResults] = useState({
    strength: '', dexterity: '', agility: '', constitution: '',
    charisma: '', intelligence: '', total: '', discount: ''
  });

  const resetStats = () => {
    setStats(initialStats);
    setResults({
      strength: '', dexterity: '', agility: '', constitution: '',
      charisma: '', intelligence: '', total: '', discount: ''
    });
  };

  const formatNumber = (num) => {
    if (!num && num !== 0) return '';
    return num.toString().replaceAll(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const display = (part, total) => `${formatNumber(part)} (${Math.floor(part * 100 / total)}%)`;

  const costStat = (from, to, coeff, reduc, costumeDiscount) => {
    from = Number.parseInt(from) || 0;
    to = Number.parseInt(to) || 0;
    let count = 0;
    for (let i = from; i < to; i++) count += Math.pow(i - 4, coeff) * (1 - reduc);
    if (costumeDiscount > 0) count *= (1 - costumeDiscount / 100);
    return Math.floor(count);
  };

  const calculateStats = () => {
    const reduc = 2 * stats.trainingGroundLevel / 100;
    const costumeDiscount = stats.costumeDiscount;
    const further = stats.furtherDiscount / 100;

    const strengthCost = costStat(stats.strengthFrom, stats.strengthTo, 2.6, reduc, costumeDiscount);
  const dexterityCost = costStat(stats.dexterityFrom, stats.dexterityTo, 2.5, reduc, costumeDiscount);
  const agilityCost = costStat(stats.agilityFrom, stats.agilityTo, 2.3, reduc, costumeDiscount);
  const constitutionCost = costStat(stats.constitutionFrom, stats.constitutionTo, 2.3, reduc, costumeDiscount);
  const charismaCost = costStat(stats.charismaFrom, stats.charismaTo, 2.5, reduc, costumeDiscount);
  const intelligenceCost = costStat(stats.intelligenceFrom, stats.intelligenceTo, 2.4, reduc, costumeDiscount);

  let total = strengthCost + dexterityCost + agilityCost + constitutionCost + charismaCost + intelligenceCost;

  let discount = Math.floor(total * reduc / (1 - reduc));
  if (costumeDiscount > 0) discount += Math.floor(total * (1 - reduc) * 100 / (100 - costumeDiscount) * costumeDiscount / 100);

  // Apply further discount
  discount += Math.floor(total * further);

  let discountedTotal = total - discount;

  setResults({
    strength: display(strengthCost, total),
    dexterity: display(dexterityCost, total),
    agility: display(agilityCost, total),
    constitution: display(constitutionCost, total),
    charisma: display(charismaCost, total),
    intelligence: display(intelligenceCost, total),
    total: formatNumber(discountedTotal),
    discount: formatNumber(discount)
  });
  };

  const handleChange = (e) => {
    const { id, value, type, checked } = e.target;
    setStats(prev => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : (type === 'number' || id === 'trainingGroundLevel' || id === 'furtherDiscount' || id === 'costumeDiscount') ? parseInt(value) : value
    }));
  };


  return (
    <div style={{ overflowX: 'auto', textAlign: 'center' }}>
      <table>
        <thead>
          <tr>
            <th>Stats</th>
            <th>From</th>
            <th>To</th>
            <th>Cost</th>
          </tr>
        </thead>
        <tbody>
          {['strength','dexterity','agility','constitution','charisma','intelligence'].map((stat, idx) => (
            <tr key={stat}>
              <td>{stat.charAt(0).toUpperCase() + stat.slice(1)}</td>
              <td><input type="text" id={`${stat}From`} value={stats[`${stat}From`]} onChange={handleChange} /></td>
              <td><input type="text" id={`${stat}To`} value={stats[`${stat}To`]} onChange={handleChange} /></td>
              <td>
                <img 
                    src="https://gladiatusfansite.blob.core.windows.net/images/icon_gold.gif" 
                    alt="Gold" 
                    style={{ width: '16px', verticalAlign: 'middle', marginRight: '4px' }} 
                />
                {results[stat]}
              </td>
            </tr>
          ))}
          <tr>
            <td>Level of Training Grounds</td>
            <td>
              <select id="trainingGroundLevel" value={stats.trainingGroundLevel} onChange={handleChange}>
                {Array.from({length:21}, (_, i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </td>
            <td>Discount:</td>
            <td>{results.discount}</td>
          </tr>
          <tr>
            <td>Further Discount %</td>
            <td>
              <select id="furtherDiscount" value={stats.furtherDiscount} onChange={handleChange}>
                {Array.from({ length: 21 }, (_, i) => <option key={i} value={i}>{i}%</option>)}
              </select>
            </td>
            <td colSpan={2}>Applied on total cost</td>
          </tr>
          <tr>
            <td>Costume Discount</td>
            <td>
              <select id="costumeDiscount" value={stats.costumeDiscount} onChange={handleChange}>
                <option value={0}>None</option>
                <option value={3}>Neptune's Fluid Might (3%)</option>
                <option value={20}>Bubona's Bull Armour (20%)</option>
              </select>
            </td>
            <td>Total Cost:</td>
            <td>
                <img 
                    src="https://gladiatusfansite.blob.core.windows.net/images/icon_gold.gif" 
                    alt="Gold" 
                    style={{ width: '16px', verticalAlign: 'middle', marginRight: '4px' }} 
                />
                {results.total}
            </td>
          </tr>
          <tr>
            <td colSpan="4">
              <button onClick={calculateStats}>Calculate</button>{' '}
              <button onClick={resetStats}>Reset</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
