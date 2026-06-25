const { MongoClient } = require('mongodb');

const mongoUrl = "mongodb+srv://eeshoca:n6hX4jS5sw58Qh3y@cluster0.rnd7y.mongodb.net/gothra?retryWrites=true&w=majority";

async function main() {
  const client = new MongoClient(mongoUrl);
  try {
    await client.connect();
    console.log('Connected to MongoDB.');
    const db = client.db('gothra');
    const products = await db.collection('products').find({}, { projection: { id: 1, name: 1, category: 1 } }).toArray();
    console.log(`Found ${products.length} products in DB:`);
    console.log(products.map(p => `${p.id}: ${p.name} (${p.category})`));
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
