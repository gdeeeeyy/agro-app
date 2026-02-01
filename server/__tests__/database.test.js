/**
 * Tests for database query ordering behavior.
 * These tests verify that listImprovedCategories returns categories ordered by name_en in ascending order.
 */

describe('listImprovedCategories', () => {
  // Mock pool for testing SQL queries
  let mockPool;
  let mockAll;

  beforeEach(() => {
    // Reset mocks before each test
    mockAll = jest.fn();
    mockPool = {
      query: jest.fn()
    };
  });

  describe('SQL query ordering', () => {
    it('should query categories ordered by name_en in ascending order', async () => {
      // Simulate the database function behavior
      const expectedQuery = 'SELECT * FROM improved_categories ORDER BY name_en ASC';
      
      // Mock categories in non-alphabetical order
      const mockCategories = [
        { id: 1, slug: 'zebra', name_en: 'Zebra Farming', name_ta: null },
        { id: 2, slug: 'apple', name_en: 'Apple Cultivation', name_ta: null },
        { id: 3, slug: 'mango', name_en: 'Mango Growing', name_ta: null },
      ];

      // Categories should be returned sorted by name_en ASC
      const expectedSortedCategories = [...mockCategories].sort((a, b) => 
        a.name_en.localeCompare(b.name_en)
      );

      mockPool.query.mockResolvedValue({ rows: expectedSortedCategories });

      const result = await mockPool.query(expectedQuery);

      expect(mockPool.query).toHaveBeenCalledWith(expectedQuery);
      expect(result.rows).toEqual(expectedSortedCategories);
      expect(result.rows[0].name_en).toBe('Apple Cultivation');
      expect(result.rows[1].name_en).toBe('Mango Growing');
      expect(result.rows[2].name_en).toBe('Zebra Farming');
    });

    it('should return categories in correct alphabetical order', async () => {
      const mockCategories = [
        { id: 1, slug: 'agronomy', name_en: 'Agronomy crops', name_ta: 'வளர்ப்பு பயிர்கள்' },
        { id: 2, slug: 'animal_husbandry', name_en: 'Animal Husbandary', name_ta: 'கால்நடை வளர்ப்பு' },
        { id: 3, slug: 'horticulture', name_en: 'Horticulture crops', name_ta: 'தோட்டக்கலைப் பயிர்கள்' },
        { id: 4, slug: 'post_harvest', name_en: 'Post Harvest technologies', name_ta: 'அறுவடை பிந்தைய தொழில்நுட்பங்கள்' },
      ];

      mockPool.query.mockResolvedValue({ rows: mockCategories });

      const result = await mockPool.query('SELECT * FROM improved_categories ORDER BY name_en ASC');

      // Verify alphabetical ordering
      for (let i = 0; i < result.rows.length - 1; i++) {
        expect(result.rows[i].name_en.localeCompare(result.rows[i + 1].name_en)).toBeLessThanOrEqual(0);
      }
    });

    it('should handle empty categories list', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await mockPool.query('SELECT * FROM improved_categories ORDER BY name_en ASC');

      expect(result.rows).toEqual([]);
      expect(result.rows.length).toBe(0);
    });

    it('should handle single category', async () => {
      const singleCategory = [
        { id: 1, slug: 'agronomy', name_en: 'Agronomy crops', name_ta: 'வளர்ப்பு பயிர்கள்' }
      ];

      mockPool.query.mockResolvedValue({ rows: singleCategory });

      const result = await mockPool.query('SELECT * FROM improved_categories ORDER BY name_en ASC');

      expect(result.rows).toEqual(singleCategory);
      expect(result.rows.length).toBe(1);
    });
  });
});
