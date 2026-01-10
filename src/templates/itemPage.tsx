import React from 'react';
import { useLocation } from '@docusaurus/router';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import prefixes from '@site/static/data/items/prefixes.json';
import suffixes from '@site/static/data/items/suffixes.json';

const slugify = (value?: string) =>
  typeof value === 'string'
    ? value.toLowerCase().replace(/\s+/g, '-')
    : '';

const formatGold = (value: number) =>
  value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export default function ItemPage() {
  const location = useLocation();
  
  // Parse the URL to get type and slug
  // URL format: /items/prefix/accas or /items/suffix/of-terror
  const pathParts = location.pathname.split('/').filter(Boolean);
  const type = pathParts[1] as 'prefix' | 'suffix'; // items/[prefix|suffix]/slug
  const slug = pathParts[2];

  // Get the appropriate data source
  const items = type === 'prefix' ? prefixes : suffixes;
  
  // Find the item that matches the slug
  const item = items.find(i => slugify(i.name) === slug);

  if (!item) {
    return (
      <Layout title="Item Not Found">
        <div className="container margin-vert--lg">
          <h1>Item Not Found</h1>
          <p>The {type} "{slug}" could not be found.</p>
        </div>
      </Layout>
    );
  }

  const title = `${item.name} - ${type === 'prefix' ? 'Prefix' : 'Suffix'}`;

  return (
    <Layout title={title}>
      <div className="container margin-vert--lg">
        {/* Breadcrumb navigation */}
        <nav style={{ marginBottom: '20px' }}>
          <Link to={`/items/${type}es`}>← Back to {type === 'prefix' ? 'Prefixes' : 'Suffixes'}</Link>
        </nav>
        
        <h1>{item.name}</h1>
        <p className="hero__subtitle">
          {type === 'prefix' ? 'Prefix' : 'Suffix'}
        </p>
        
        {/* Game-style tooltip display */}
        <div
          style={{
            backgroundColor: '#000',
            border: '2px solid #333',
            padding: '20px',
            borderRadius: '8px',
            fontFamily: 'monospace',
            color: '#ccc',
            maxWidth: '400px',
            marginTop: '24px',
          }}
        >
          {/* Name */}
          <div
            style={{
              color: '#00ff00',
              fontWeight: 'bold',
              fontSize: '20px',
              marginBottom: '12px',
            }}
          >
            {item.name}
          </div>

          {/* Stats */}
          {Object.entries(item.stats || {}).map(([stat, values]: [string, any]) => {
            const lines = [];
            const formatKey = stat
              .replace(/_/g, ' ')
              .split(' ')
              .map(w => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' ');

            if (values.flat !== 0) {
              const sign = values.flat > 0 ? '+' : '';
              lines.push(
                <div key={`${stat}-flat`} style={{ marginBottom: '4px' }}>
                  {formatKey} {sign}{values.flat}
                </div>
              );
            }

            if (values.percent !== 0) {
              const sign = values.percent > 0 ? '+' : '';
              lines.push(
                <div key={`${stat}-percent`} style={{ marginBottom: '4px' }}>
                  {formatKey} {sign}{values.percent}%
                </div>
              );
            }

            return lines;
          })}

          {/* Level */}
          <div style={{ color: '#9b9b9b', marginTop: '12px' }}>
            Level {item.level}
          </div>

          {/* Gold */}
          <div style={{ marginTop: '8px', fontWeight: 'bold' }}>
            Value {formatGold(item.gold)}{' '}
            <img
              src="https://gladiatusfansite.blob.core.windows.net/images/icon_gold.gif"
              alt="gold"
              style={{ verticalAlign: 'middle', width: '16px', height: '16px' }}
            />
          </div>
        </div>

        {/* Materials Section */}
        {item.materials && Object.keys(item.materials).length > 0 && (
          <div style={{ marginTop: '32px' }}>
            <h2>Crafting Materials</h2>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '16px',
              marginTop: '16px'
            }}>
              {Object.entries(item.materials).map(([material, quantity]) => {
                // Create a slug for the material image
                const materialSlug = material.replace(/\s+/g, '_');
                const imageUrl = `https://gladiatusfansite.blob.core.windows.net/images/Forging/Forging_goods/${materialSlug}.png`;
                
                return (
                  <div 
                    key={material}
                    style={{
                      border: '1px solid #333',
                      borderRadius: '8px',
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <img 
                      src={imageUrl}
                      alt={material}
                      title={material}
                      style={{ 
                        width: '48px', 
                        height: '48px',
                        objectFit: 'contain'
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                        {material}
                      </div>
                      <div>
                        Quantity: {quantity}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
