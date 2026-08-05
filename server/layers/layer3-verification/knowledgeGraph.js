/**
 * Layer 3: Knowledge Graph (Neo4j Integration)
 * Entity-relation mapping for fact verification
 */

const neo4j = require('neo4j-driver');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'LaChanSo2026';

let driver = null;
let session = null;

async function getDriver() {
  if (driver) return driver;
  try {
    driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD), {
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 5000
    });
    // Verify connection
    await driver.verifyConnectivity();
    console.log('[KnowledgeGraph] Neo4j connected successfully');
    return driver;
  } catch (e) {
    console.warn('[KnowledgeGraph] Neo4j connection failed:', e.message);
    return null;
  }
}

async function createEntity(entity) {
  const d = await getDriver();
  if (!d) return null;
  
  const session = d.session();
  try {
    const result = await session.run(
      `MERGE (e:Entity {name: $name, type: $type})
       SET e.source = $source, e.lastSeen = datetime()
       RETURN e`,
      { name: entity.name, type: entity.type, source: entity.source || 'unknown' }
    );
    return result.records[0]?.get('e')?.properties;
  } catch (e) {
    console.warn('[KnowledgeGraph] createEntity error:', e.message);
    return null;
  } finally {
    await session.close();
  }
}

async function createRelation(from, to, relationType) {
  const d = await getDriver();
  if (!d) return null;
  
  const session = d.session();
  try {
    const result = await session.run(
      `MATCH (a:Entity {name: $fromName}), (b:Entity {name: $toName})
       MERGE (a)-[r:${relationType}]->(b)
       SET r.lastSeen = datetime()
       RETURN type(r) as relation`,
      { fromName: from.name, toName: to.name }
    );
    return result.records[0]?.get('relation');
  } catch (e) {
    console.warn('[KnowledgeGraph] createRelation error:', e.message);
    return null;
  } finally {
    await session.close();
  }
}

async function findEntity(name) {
  const d = await getDriver();
  if (!d) return null;
  
  const session = d.session();
  try {
    const result = await session.run(
      `MATCH (e:Entity {name: $name}) RETURN e`,
      { name }
    );
    return result.records[0]?.get('e')?.properties || null;
  } catch (e) {
    return null;
  } finally {
    await session.close();
  }
}

async function getEntityContext(name) {
  const d = await getDriver();
  if (!d) return null;
  
  const session = d.session();
  try {
    const result = await session.run(
      `MATCH (e:Entity {name: $name})-[r]-(related)
       RETURN e, type(r) as relation, related
       LIMIT 20`,
      { name }
    );
    
    const entities = [];
    for (const record of result.records) {
      entities.push({
        entity: record.get('related')?.properties,
        relation: record.get('relation')
      });
    }
    return entities;
  } catch (e) {
    return [];
  } finally {
    await session.close();
  }
}

async function verifyAuthority(entity, expectedAuthority) {
  const context = await getEntityContext(entity.name);
  const authorities = context.filter(e => 
    e.entity?.type === 'ORGANIZATION' || e.entity?.type === 'PERSON'
  );
  
  return {
    entity: entity.name,
    expectedAuthority,
    relatedAuthorities: authorities.map(a => a.entity?.name),
    hasAuthority: authorities.some(a => 
      a.entity?.name?.toLowerCase().includes(expectedAuthority.toLowerCase())
    )
  };
}

async function close() {
  if (driver) {
    await driver.close();
    driver = null;
  }
}

module.exports = { createEntity, createRelation, findEntity, getEntityContext, verifyAuthority, close };
