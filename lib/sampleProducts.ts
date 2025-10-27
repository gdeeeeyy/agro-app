import { addProduct } from '../lib/database';

const sampleProducts = [
  {
    name: "Organic Tomato Seeds",
    plant_used: "Tomato",
    keywords: "tomato, seeds, organic, planting, vegetables",
    details: "High-quality organic tomato seeds perfect for home gardening. Produces juicy, flavorful tomatoes.",
    stock_available: 50,
    cost_per_unit: 299,
  },
  {
    name: "Plant Disease Control Spray",
    plant_used: "General",
    keywords: "disease, spray, control, treatment, fungicide, pesticide",
    details: "Effective plant disease control spray that treats common fungal infections and bacterial diseases.",
    stock_available: 25,
    cost_per_unit: 450,
  },
  {
    name: "Rose Plant Fertilizer",
    plant_used: "Rose",
    keywords: "rose, fertilizer, nutrients, growth, flowering",
    details: "Specialized fertilizer for rose plants that promotes healthy growth and beautiful blooms.",
    stock_available: 30,
    cost_per_unit: 350,
  },
  {
    name: "Wheat Seed Treatment",
    plant_used: "Wheat",
    keywords: "wheat, seeds, treatment, farming, agriculture",
    details: "Professional wheat seed treatment solution for improved germination and disease resistance.",
    stock_available: 100,
    cost_per_unit: 1200,
  },
  {
    name: "Plant Growth Hormone",
    plant_used: "General",
    keywords: "growth, hormone, rooting, propagation, cuttings",
    details: "Natural plant growth hormone that stimulates root development and accelerates plant growth.",
    stock_available: 40,
    cost_per_unit: 180,
  },
  {
    name: "Leaf Spot Treatment",
    plant_used: "General",
    keywords: "leaf spot, treatment, disease, fungal, control",
    details: "Effective treatment for leaf spot diseases affecting various plants and crops.",
    stock_available: 20,
    cost_per_unit: 320,
  },
  {
    name: "Potting Soil Mix",
    plant_used: "General",
    keywords: "soil, potting, mix, nutrients, planting",
    details: "Premium potting soil mix enriched with nutrients for healthy plant growth.",
    stock_available: 60,
    cost_per_unit: 250,
  },
  {
    name: "Plant Watering System",
    plant_used: "General",
    keywords: "watering, irrigation, system, automatic, drip",
    details: "Automatic plant watering system with drip irrigation for efficient water management.",
    stock_available: 15,
    cost_per_unit: 850,
  },
];

export async function addSampleProducts() {
  console.log('Adding sample products...');
  
  for (const product of sampleProducts) {
    try {
      const productId = await addProduct(product);
      if (productId) {
        console.log(`Added product: ${product.name} (ID: ${productId})`);
      } else {
        console.error(`Failed to add product: ${product.name}`);
      }
    } catch (error) {
      console.error(`Error adding product ${product.name}:`, error);
    }
  }
  
  console.log('Sample products addition completed!');
}

// Run this function to add sample products
// addSampleProducts();
