import { addProduct } from '../lib/database';

const sampleProducts = [
  {
    seller_name: 'AgriVendor',
    name: 'Organic Tomato Seeds',
    details: 'High-quality organic tomato seeds perfect for home gardening. Produces juicy, flavorful tomatoes.',
    unit: '200 gms',
    stock_available: 50,
    cost_per_unit: 299,
    plant_used: 'General',
    keywords: '',
  },
  {
    seller_name: 'GreenCare',
    name: 'Plant Disease Control Spray',
    details: 'Effective plant disease control spray that treats common fungal infections and bacterial diseases.',
    unit: '1 Litre',
    stock_available: 25,
    cost_per_unit: 450,
    plant_used: 'General',
    keywords: '',
  },
  {
    seller_name: 'BloomMart',
    name: 'Rose Plant Fertilizer',
    details: 'Specialized fertilizer for rose plants that promotes healthy growth and beautiful blooms.',
    unit: '500 gms',
    stock_available: 30,
    cost_per_unit: 350,
    plant_used: 'Rose',
    keywords: '',
  },
  {
    seller_name: 'FarmPro',
    name: 'Wheat Seed Treatment',
    details: 'Professional wheat seed treatment solution for improved germination and disease resistance.',
    unit: '1 Litre',
    stock_available: 100,
    cost_per_unit: 1200,
    plant_used: 'Wheat',
    keywords: '',
  },
  {
    seller_name: 'AgriPlus',
    name: 'Plant Growth Hormone',
    details: 'Natural plant growth hormone that stimulates root development and accelerates plant growth.',
    unit: '250 mL',
    stock_available: 40,
    cost_per_unit: 180,
    plant_used: 'General',
    keywords: '',
  },
  {
    seller_name: 'PlantMedic',
    name: 'Leaf Spot Treatment',
    details: 'Effective treatment for leaf spot diseases affecting various plants and crops.',
    unit: '500 mL',
    stock_available: 20,
    cost_per_unit: 320,
    plant_used: 'General',
    keywords: '',
  },
  {
    seller_name: 'GrowHub',
    name: 'Potting Soil Mix',
    details: 'Premium potting soil mix enriched with nutrients for healthy plant growth.',
    unit: '10 kg',
    stock_available: 60,
    cost_per_unit: 250,
    plant_used: 'General',
    keywords: '',
  },
  {
    seller_name: 'IrrigaTech',
    name: 'Plant Watering System',
    details: 'Automatic plant watering system with drip irrigation for efficient water management.',
    unit: '1 Nos',
    stock_available: 15,
    cost_per_unit: 850,
    plant_used: 'General',
    keywords: '',
  },
];

export async function addSampleProducts() {
  console.log('Resetting products and adding new samples...');
  try {
    await (db as any).runAsync?.('DELETE FROM products');
  } catch (e) {
    console.warn('Could not clear products table:', e);
  }
  for (const product of sampleProducts) {
    try {
      const productId = await addProduct(product as any);
      if (productId) {
        console.log(`Added product: ${product.name} (ID: ${productId})`);
      } else {
        console.error(`Failed to add product: ${product.name}`);
      }
    } catch (error) {
      console.error(`Error adding product ${product.name}:`, error);
    }
  }
  console.log('Sample products reset completed!');
}

// Run this function to add sample products
// addSampleProducts();
