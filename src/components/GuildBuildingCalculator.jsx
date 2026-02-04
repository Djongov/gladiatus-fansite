import React, { useState } from 'react';

export default function GuildBuildingCalculator() {
  const initialBuildings = {
    forumFrom: 1, forumTo: '',
    bathhouseFrom: 1, bathhouseTo: '',
    bankFrom: 1, bankTo: '',
    libraryFrom: 1, libraryTo: '',
    warehouseFrom: 0, warehouseTo: '',
    warMasterHallFrom: 1, warMasterHallTo: '',
    guildMarketFrom: 0, guildMarketTo: '',
    negotiumXFrom: 0, negotiumXTo: '',
    templumFrom: 0, templumTo: '',
    trainingGroundsFrom: 0, trainingGroundsTo: '',
    villaMediciFrom: 0, villaMediciTo: '',
    discount: 0,
    additionalDiscount: 0
  };

  const [buildings, setBuildings] = useState(initialBuildings);
  const [results, setResults] = useState({
    forum: '', bathhouse: '', bank: '', library: '', warehouse: '',
    warMasterHall: '', guildMarket: '', negotiumX: '', templum: '',
    trainingGrounds: '', villaMedici: '', total: '', discountCost: ''
  });

  const resetBuildings = () => {
    setBuildings(initialBuildings);
    setResults({
      forum: '', bathhouse: '', bank: '', library: '', warehouse: '',
      warMasterHall: '', guildMarket: '', negotiumX: '', templum: '',
      trainingGrounds: '', villaMedici: '', total: '', discountCost: ''
    });
  };

  const formatNumber = (num) => {
    if (!num && num !== 0) return '';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const display = (part, total) => `${formatNumber(part)} (${Math.floor(part * 100 / total)}%)`;

  const costBuilding = (from, to, coeff1, coeff2, reduc) => {
    from = parseInt(from) || 0;
    to = parseInt(to) || 0;
    let count = 0;
    for (let i = from + 1; i <= to; i++) {
      count += Math.floor(Math.pow(coeff1 * i, coeff2) * (1 - reduc));
    }
    return count;
  };

  const calculateBuildings = () => {
    const centurionsReduc = 0.03 * buildings.discount;
    const additionalReduc = 0.10 * buildings.additionalDiscount;
    const reduc = centurionsReduc + additionalReduc - (centurionsReduc * additionalReduc);

    const forum = costBuilding(buildings.forumFrom, buildings.forumTo, 1.2, 6.5, reduc);
    const bathhouse = costBuilding(buildings.bathhouseFrom, buildings.bathhouseTo, 3.3, 4.5, reduc);
    const bank = costBuilding(buildings.bankFrom, buildings.bankTo, 4.8, 4.5, reduc);
    const library = costBuilding(buildings.libraryFrom, buildings.libraryTo, 2.5, 4.5, reduc);
    const warehouse = costBuilding(buildings.warehouseFrom, buildings.warehouseTo, 9, 4.5, reduc);
    const warMasterHall = costBuilding(buildings.warMasterHallFrom, buildings.warMasterHallTo, 2.3, 4.5, reduc);
    const guildMarket = costBuilding(buildings.guildMarketFrom, buildings.guildMarketTo, 2.7, 4.5, reduc);
    const negotiumX = costBuilding(buildings.negotiumXFrom, buildings.negotiumXTo, 4.1, 4.5, reduc);
    const templum = costBuilding(buildings.templumFrom, buildings.templumTo, 2, 4.5, reduc);
    const trainingGrounds = costBuilding(buildings.trainingGroundsFrom, buildings.trainingGroundsTo, 3.9, 4.5, reduc);
    const villaMedici = costBuilding(buildings.villaMediciFrom, buildings.villaMediciTo, 4.1, 4.5, reduc);

    const total = forum + bathhouse + bank + library + warehouse + warMasterHall +
                  guildMarket + negotiumX + templum + trainingGrounds + villaMedici;

    const discountCost = Math.floor(total * reduc / (1 - reduc));

    setResults({
      forum: display(forum, total),
      bathhouse: display(bathhouse, total),
      bank: display(bank, total),
      library: display(library, total),
      warehouse: display(warehouse, total),
      warMasterHall: display(warMasterHall, total),
      guildMarket: display(guildMarket, total),
      negotiumX: display(negotiumX, total),
      templum: display(templum, total),
      trainingGrounds: display(trainingGrounds, total),
      villaMedici: display(villaMedici, total),
      total: formatNumber(total),
      discountCost: formatNumber(discountCost)
    });
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setBuildings(prev => ({ ...prev, [id]: value }));
  };

  return (
    <div style={{ overflowX: 'auto', textAlign: 'center' }}>
      <table>
        <thead>
          <tr>
            <th>Building</th>
            <th>From</th>
            <th>To</th>
            <th>Cost</th>
          </tr>
        </thead>
        <tbody>
          {[
            'forum', 'bathhouse', 'bank', 'library', 'warehouse',
            'warMasterHall', 'guildMarket', 'negotiumX', 'templum',
            'trainingGrounds', 'villaMedici'
          ].map(building => (
            <tr key={building}>
              <td>{building.charAt(0).toUpperCase() + building.slice(1)}</td>
              <td><input type="text" id={`${building}From`} value={buildings[`${building}From`]} onChange={handleChange} /></td>
              <td><input type="text" id={`${building}To`} value={buildings[`${building}To`]} onChange={handleChange} /></td>
              <td>
                <img 
                    src="https://gladiatusfansite.blob.core.windows.net/images/icon_gold.gif" 
                    alt="Gold" 
                    style={{ width: '16px', verticalAlign: 'middle', marginRight: '4px' }} 
                />
                {results[building]}
              </td>
            </tr>
          ))}
          <tr>
            <td>Centurions Discount (%)</td>
            <td colSpan="2">
              <select id="discount" value={buildings.discount} onChange={handleChange}>
                {Array.from({ length: 11 }, (_, i) => <option key={i} value={i}>{i * 3}%</option>)}
              </select>
            </td>
            <td></td>
          </tr>
          <tr>
            <td>Additional Discount (%)</td>
            <td colSpan="2">
              <select id="additionalDiscount" value={buildings.additionalDiscount} onChange={handleChange}>
                {Array.from({ length: 5 }, (_, i) => <option key={i} value={i}>{i * 10}%</option>)}
              </select>
            </td>
            <td></td>
          </tr>
          <tr>
            <td>Total Discount Savings</td>
            <td colSpan="2"></td>
            <td>
                <img 
                    src="https://gladiatusfansite.blob.core.windows.net/images/icon_gold.gif" 
                    alt="Gold" 
                    style={{ width: '16px', verticalAlign: 'middle', marginRight: '4px' }} 
                />
                {results.discountCost}
            </td>
          </tr>
          <tr>
            <td colSpan="2"></td>
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
              <button onClick={calculateBuildings}>Calculate</button>{' '}
              <button onClick={resetBuildings}>Reset</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
