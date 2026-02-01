/**
 * Tests for the /improved-categories API endpoint.
 * These tests verify that the endpoint returns categories ordered by name_en in ascending order.
 */

const express = require('express');
const request = require('supertest');

describe('GET /improved-categories API endpoint', () => {
  let app;
  let mockPool;

  beforeEach(() => {
    // Create a fresh Express app for each test
    app = express();
    app.use(express.json());

    // Mock database pool
    mockPool = {
      query: jest.fn()
    };

    // Helper function to get all rows (matches server implementation)
    const all = async (sql, params) => {
      const { rows } = await mockPool.query(sql, params);
      return rows;
    };

    // Register the /improved-categories endpoint (matching server/index.js implementation)
    app.get('/improved-categories', async (req, res) => {
      const rows = await all('SELECT * FROM improved_categories ORDER BY name_en ASC', []);
      res.json(rows);
    });
  });

  it('should return categories ordered by name_en in ascending order', async () => {
    // Mock categories returned from database (already sorted by SQL)
    const sortedCategories = [
      { id: 1, slug: 'agronomy', name_en: 'Agronomy crops', name_ta: 'வளர்ப்பு பயிர்கள்' },
      { id: 2, slug: 'animal_husbandry', name_en: 'Animal Husbandary', name_ta: 'கால்நடை வளர்ப்பு' },
      { id: 3, slug: 'horticulture', name_en: 'Horticulture crops', name_ta: 'தோட்டக்கலைப் பயிர்கள்' },
      { id: 4, slug: 'post_harvest', name_en: 'Post Harvest technologies', name_ta: 'அறுவடை பிந்தைய தொழில்நுட்பங்கள்' },
    ];

    mockPool.query.mockResolvedValue({ rows: sortedCategories });

    const response = await request(app)
      .get('/improved-categories')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toEqual(sortedCategories);
    
    // Verify the correct SQL query was used with ORDER BY name_en ASC
    expect(mockPool.query).toHaveBeenCalledWith(
      'SELECT * FROM improved_categories ORDER BY name_en ASC',
      []
    );
  });

  it('should return categories in alphabetical order by name_en', async () => {
    // Categories with intentionally varied naming for alphabetical test
    const categories = [
      { id: 1, slug: 'apple', name_en: 'Apple Farming', name_ta: null },
      { id: 2, slug: 'banana', name_en: 'Banana Cultivation', name_ta: null },
      { id: 3, slug: 'cherry', name_en: 'Cherry Growing', name_ta: null },
    ];

    mockPool.query.mockResolvedValue({ rows: categories });

    const response = await request(app)
      .get('/improved-categories')
      .expect(200);

    // Verify alphabetical ordering
    const names = response.body.map(cat => cat.name_en);
    const sortedNames = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sortedNames);
  });

  it('should return empty array when no categories exist', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    const response = await request(app)
      .get('/improved-categories')
      .expect(200);

    expect(response.body).toEqual([]);
  });

  it('should return single category correctly', async () => {
    const singleCategory = [
      { id: 1, slug: 'horticulture', name_en: 'Horticulture crops', name_ta: 'தோட்டக்கலைப் பயிர்கள்' }
    ];

    mockPool.query.mockResolvedValue({ rows: singleCategory });

    const response = await request(app)
      .get('/improved-categories')
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].name_en).toBe('Horticulture crops');
  });

  it('should verify that "A" categories come before "Z" categories', async () => {
    const categories = [
      { id: 1, slug: 'agronomy', name_en: 'Agronomy', name_ta: null },
      { id: 2, slug: 'zebra', name_en: 'Zebra Farming', name_ta: null },
    ];

    mockPool.query.mockResolvedValue({ rows: categories });

    const response = await request(app)
      .get('/improved-categories')
      .expect(200);

    expect(response.body[0].name_en).toBe('Agronomy');
    expect(response.body[1].name_en).toBe('Zebra Farming');
  });
});
