import * as SQLite from "expo-sqlite";
import { api, API_URL } from './api';

const db = SQLite.openDatabaseSync("agroappDatabase.db");

(async () => {
  if (API_URL) return; // remote mode: API owns schema
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT,
      address TEXT,
      is_admin INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS plants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      imageUri TEXT,
      result TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      plant_used TEXT NOT NULL,
      keywords TEXT NOT NULL,
      details TEXT NOT NULL,
      name_ta TEXT,
      plant_used_ta TEXT,
      details_ta TEXT,
      image TEXT,
      unit TEXT,
      stock_available INTEGER DEFAULT 0,
      cost_per_unit REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE(user_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      total_amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      delivery_address TEXT,
      status TEXT DEFAULT 'pending',
      status_note TEXT,
      delivery_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price_per_unit REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS keywords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS crops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      name_ta TEXT,
      image TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS crop_guides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      crop_id INTEGER NOT NULL,
      language TEXT NOT NULL DEFAULT 'en',
      cultivation_guide TEXT,
      pest_management TEXT,
      disease_management TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(crop_id, language),
      FOREIGN KEY (crop_id) REFERENCES crops(id) ON DELETE CASCADE
    );

    -- Pests and diseases nested under crop (by language)
    CREATE TABLE IF NOT EXISTS crop_pests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      crop_id INTEGER NOT NULL,
      language TEXT NOT NULL DEFAULT 'en',
      name TEXT NOT NULL,
      description TEXT,
      management TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(crop_id, language, name),
      FOREIGN KEY (crop_id) REFERENCES crops(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS crop_pest_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pest_id INTEGER NOT NULL,
      image TEXT NOT NULL,
      caption TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pest_id) REFERENCES crop_pests(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS crop_diseases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      crop_id INTEGER NOT NULL,
      language TEXT NOT NULL DEFAULT 'en',
      name TEXT NOT NULL,
      description TEXT,
      management TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(crop_id, language, name),
      FOREIGN KEY (crop_id) REFERENCES crops(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS crop_disease_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      disease_id INTEGER NOT NULL,
      image TEXT NOT NULL,
      caption TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (disease_id) REFERENCES crop_diseases(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS scan_plants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      name_ta TEXT
    );
  `);

  try {
    // products migration
    const prodCols = await db.getAllAsync("PRAGMA table_info(products)");
    const prodColNames = (prodCols as any[]).map(c => c.name);
    const addProdTextCol = async (name: string) => {
      if (!prodColNames.includes(name)) {
        await db.runAsync(`ALTER TABLE products ADD COLUMN ${name} TEXT`);
      }
    };
    await addProdTextCol('name_ta');
    await addProdTextCol('plant_used_ta');
    await addProdTextCol('details_ta');
    await addProdTextCol('unit');

    // orders migration (align with server: add logistics fields if missing)
    const orderCols = await db.getAllAsync("PRAGMA table_info(orders)");
    const orderColNames = (orderCols as any[]).map(c => c.name);
    const addOrderTextCol = async (name: string) => {
      if (!orderColNames.includes(name)) {
        await db.runAsync(`ALTER TABLE orders ADD COLUMN ${name} TEXT`);
      }
    };
    await addOrderTextCol('status_note'); // already exists in schema, but safe
    await addOrderTextCol('delivery_date'); // already exists in schema, but safe
    await addOrderTextCol('logistics_name');
    await addOrderTextCol('tracking_number');
    await addOrderTextCol('tracking_url');
  } catch (e) {
    console.warn('Migration check failed:', e);
  }
})();

export async function savePlant(userId: number, name: string, imageUri: string, result: string) {
  try {
    await db.runAsync("INSERT INTO plants (user_id, name, imageUri, result) VALUES (?, ?, ?, ?)",
      userId,
      name,
      imageUri,
      result
    );
  } catch (err) {
    console.error("SQLite insert error:", err);
  }
}

export async function getAllPlants(userId: number) {
  try {
    const rows = await db.getAllAsync("SELECT * FROM plants WHERE user_id = ? ORDER BY id DESC", userId);
    return rows;
  } catch (err) {
    console.error("SQLite fetch error:", err);
    return [];
  }
}

// Product functions
export async function getAllProducts() {
  try {
    if (API_URL) return await api.get('/products');
    const rows = await db.getAllAsync("SELECT * FROM products ORDER BY created_at DESC");
    return rows;
  } catch (err) {
    console.error("SQLite fetch error:", err);
    return [];
  }
}

export async function getProductById(id: number) {
  try {
    if (API_URL) return await api.get(`/products/${id}`);
    const rows = await db.getAllAsync("SELECT * FROM products WHERE id = ?", id);
    return rows[0] || null;
  } catch (err) {
    console.error("SQLite fetch error:", err);
    return null;
  }
}

export async function addProduct(product: {
  name: string;
  plant_used: string;
  keywords: string;
  details: string;
  name_ta?: string;
  plant_used_ta?: string;
  details_ta?: string;
  image?: string;
  stock_available: number;
  cost_per_unit: number;
  unit?: string;
}) {
  try {
    if (API_URL) {
      const res = await api.post('/products', product);
      return (res as any).id || null;
    }
    const result = await db.runAsync(
      "INSERT INTO products (name, plant_used, keywords, details, name_ta, plant_used_ta, details_ta, image, unit, stock_available, cost_per_unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      product.name,
      product.plant_used,
      product.keywords,
      product.details,
      product.name_ta || null,
      product.plant_used_ta || null,
      product.details_ta || null,
      product.image || null,
      product.unit || null,
      product.stock_available,
      product.cost_per_unit
    );
    return result.lastInsertRowId;
  } catch (err) {
    console.error("SQLite insert error:", err);
    return null;
  }
}

export async function updateProduct(id: number, product: {
  name?: string;
  plant_used?: string;
  keywords?: string;
  details?: string;
  name_ta?: string;
  plant_used_ta?: string;
  details_ta?: string;
  image?: string;
  stock_available?: number;
  cost_per_unit?: number;
  unit?: string;
}) {
  try {
    if (API_URL) {
      await api.patch(`/products/${id}`, product);
      return true;
    }
    const fields: string[] = [];
    const values: any[] = [];
    
    Object.entries(product).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });
    
    if (fields.length === 0) return false;
    
    values.push(id);
    await db.runAsync(
      `UPDATE products SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      ...values
    );
    return true;
  } catch (err) {
    console.error("SQLite update error:", err);
    return false;
  }
}

export async function deleteProduct(id: number) {
  try {
    if (API_URL) {
      await api.del(`/products/${id}`);
      return true;
    }
    await db.runAsync("DELETE FROM products WHERE id = ?", id);
    return true;
  } catch (err) {
    console.error("SQLite delete error:", err);
    return false;
  }
}

export async function searchProducts(keywords: string) {
  try {
    if (API_URL) return await api.get(`/products/search?q=${encodeURIComponent(keywords)}`);
    const searchTerm = `%${keywords.toLowerCase()}%`;
    const rows = await db.getAllAsync(
      "SELECT * FROM products WHERE LOWER(name) LIKE ? OR LOWER(plant_used) LIKE ? OR LOWER(keywords) LIKE ? OR LOWER(details) LIKE ? OR LOWER(name_ta) LIKE ? OR LOWER(plant_used_ta) LIKE ? OR LOWER(details_ta) LIKE ? ORDER BY created_at DESC",
      searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm
    );
    return rows;
  } catch (err) {
    console.error("SQLite search error:", err);
    return [];
  }
}

export async function findProductsByKeywords(analysisKeywords: string[], limit: number = 5) {
  try {
    if (analysisKeywords.length === 0) return [];

    // Remote mode: approximate by search across joined keywords
    if (API_URL) {
      const q = analysisKeywords.join(' ');
      const rows = await api.get(`/products/search?q=${encodeURIComponent(q)}`) as any[];
      return rows.slice(0, Math.max(1, Math.min(50, Number(limit) || 5)));
    }

    // Local mode (SQLite)
    const keywordConditions = analysisKeywords.map(() =>
      "LOWER(keywords) LIKE ? OR LOWER(name) LIKE ? OR LOWER(plant_used) LIKE ? OR LOWER(details) LIKE ? OR LOWER(name_ta) LIKE ? OR LOWER(plant_used_ta) LIKE ? OR LOWER(details_ta) LIKE ?"
    ).join(' OR ');
    
    const searchTerms = analysisKeywords.flatMap(keyword => {
      const term = `%${keyword.toLowerCase()}%`;
      return [term, term, term, term, term, term, term];
    });
    
    const query = `
      SELECT *, 
      (
        CASE 
          WHEN LOWER(keywords) LIKE ? THEN 7
          WHEN LOWER(name) LIKE ? THEN 6
          WHEN LOWER(plant_used) LIKE ? THEN 5
          WHEN LOWER(details) LIKE ? THEN 4
          WHEN LOWER(name_ta) LIKE ? THEN 3
          WHEN LOWER(plant_used_ta) LIKE ? THEN 2
          WHEN LOWER(details_ta) LIKE ? THEN 1
          ELSE 0
        END
      ) as relevance_score
      FROM products 
      WHERE ${keywordConditions}
      ORDER BY relevance_score DESC, created_at DESC
      LIMIT ${Math.max(1, Math.min(50, Number(limit) || 5))}
    `;
    
    const primaryKeyword = `%${analysisKeywords[0].toLowerCase()}%`;
    const finalSearchTerms = [primaryKeyword, primaryKeyword, primaryKeyword, primaryKeyword, primaryKeyword, primaryKeyword, primaryKeyword, ...searchTerms];
    
    const rows = await db.getAllAsync(query, ...finalSearchTerms);
    return rows;
  } catch (err: any) {
    const msg = String(err?.message || '').toLowerCase();
    if (msg.includes('no such table')) return [];
    console.error("SQLite keyword matching error:", err);
    return [];
  }
}

export async function getRelatedProductsByName(query: string, excludeIds: number[] = [], limit: number = 3) {
  try {
    const tokens = query
      .split(/[^\p{L}\p{N}]+/u)
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 2);
    if (tokens.length === 0) return [];

    if (API_URL) {
      const res = await api.get(`/products/search?q=${encodeURIComponent(tokens.join(' '))}`) as any[];
      const filtered = res.filter(p => !excludeIds.includes(Number(p.id)));
      return filtered.slice(0, Math.max(1, Math.min(20, Number(limit) || 3)));
    }

    const nameConds = tokens.map(() => "LOWER(name) LIKE ? OR LOWER(name_ta) LIKE ?").join(" OR ");
    const params = tokens.flatMap(t => {
      const term = `%${t}%`;
      return [term, term];
    });

    const excludeClause = excludeIds.length > 0
      ? `AND id NOT IN (${excludeIds.map(() => '?').join(',')})`
      : '';
    const excludeParams = excludeIds;

    const sql = `
      SELECT * FROM products
      WHERE (${nameConds}) ${excludeClause}
      ORDER BY created_at DESC
      LIMIT ${Math.max(1, Math.min(20, Number(limit) || 3))}
    `;

    const rows = await db.getAllAsync(sql, ...params, ...excludeParams);
    return rows;
  } catch (err: any) {
    const msg = String(err?.message || '').toLowerCase();
    if (msg.includes('no such table')) return [];
    console.error('SQLite related products error:', err);
    return [];
  }
}

// Cart functions
export async function getCartItems(userId: number) {
  try {
    if (API_URL) return await api.get(`/cart?userId=${userId}`);
    const rows = await db.getAllAsync(
      `SELECT ci.*, p.name, p.name_ta, p.image, p.cost_per_unit, p.stock_available 
       FROM cart_items ci 
       JOIN products p ON ci.product_id = p.id 
       WHERE ci.user_id = ? 
       ORDER BY ci.created_at DESC`,
      userId
    );
    return rows;
  } catch (err) {
    console.error("SQLite fetch error:", err);
    return [];
  }
}

export async function addToCart(userId: number, productId: number, quantity: number = 1) {
  try {
    if (API_URL) {
      await api.post('/cart/add', { userId, productId, quantity });
      return true;
    }
    // Check if item already exists in cart
    const existing = await db.getAllAsync(
      "SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?",
      userId, productId
    );
    
    if (existing.length > 0) {
      // Update quantity
      await db.runAsync(
        "UPDATE cart_items SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?",
        quantity, userId, productId
      );
    } else {
      // Add new item
      await db.runAsync(
        "INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)",
        userId, productId, quantity
      );
    }
    return true;
  } catch (err) {
    console.error("SQLite insert error:", err);
    return false;
  }
}

export async function updateCartItemQuantity(userId: number, productId: number, quantity: number) {
  try {
    if (API_URL) {
      await api.patch('/cart/item', { userId, productId, quantity });
      return true;
    }
    if (quantity <= 0) {
      await db.runAsync(
        "DELETE FROM cart_items WHERE user_id = ? AND product_id = ?",
        userId, productId
      );
    } else {
      await db.runAsync(
        "UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?",
        quantity, userId, productId
      );
    }
    return true;
  } catch (err) {
    console.error("SQLite update error:", err);
    return false;
  }
}

export async function removeFromCart(userId: number, productId: number) {
  try {
    if (API_URL) {
      await api.del('/cart/item', { userId, productId });
      return true;
    }
    await db.runAsync(
      "DELETE FROM cart_items WHERE user_id = ? AND product_id = ?",
      userId, productId
    );
    return true;
  } catch (err) {
    console.error("SQLite delete error:", err);
    return false;
  }
}

export async function clearCart(userId: number) {
  try {
    if (API_URL) {
      await api.del(`/cart/clear?userId=${userId}`);
      return true;
    }
    await db.runAsync("DELETE FROM cart_items WHERE user_id = ?", userId);
    return true;
  } catch (err) {
    console.error("SQLite delete error:", err);
    return false;
  }
}

export async function getCartTotal(userId: number) {
  try {
    if (API_URL) {
      const res = await api.get(`/cart/total?userId=${userId}`);
      return (res as any)?.total || 0;
    }
    const rows = await db.getAllAsync(
      `SELECT SUM(ci.quantity * p.cost_per_unit) as total 
       FROM cart_items ci 
       JOIN products p ON ci.product_id = p.id 
       WHERE ci.user_id = ?`,
      userId
    );
    return (rows[0] as any)?.total || 0;
  } catch (err) {
    console.error("SQLite fetch error:", err);
    return 0;
  }
}

// Order functions
export async function createOrder(userId: number, paymentMethod: string, deliveryAddress?: string, note?: string) {
  try {
    if (API_URL) {
      const res = await api.post('/orders', { userId, paymentMethod, deliveryAddress: deliveryAddress || null, note: note || null });
      return (res as any).id;
    }
    // Get cart items
    const cartItems = await getCartItems(userId);
    if (cartItems.length === 0) {
      throw new Error('Cart is empty');
    }

    // Calculate total
    const total = await getCartTotal(userId);

    // Create order
    const orderResult = await db.runAsync(
      "INSERT INTO orders (user_id, total_amount, payment_method, delivery_address, status, status_note) VALUES (?, ?, ?, ?, ?, ?)",
      userId, total, paymentMethod, deliveryAddress || null, 'pending', note || null
    );

    const orderId = orderResult.lastInsertRowId;

    // Insert order items
    for (const item of cartItems as any[]) {
      await db.runAsync(
        "INSERT INTO order_items (order_id, product_id, product_name, quantity, price_per_unit) VALUES (?, ?, ?, ?, ?)",
        orderId, item.product_id, item.name, item.quantity, item.cost_per_unit
      );

      // Update product stock
      await db.runAsync(
        "UPDATE products SET stock_available = stock_available - ? WHERE id = ?",
        item.quantity, item.product_id
      );
    }

    // Clear cart
    await clearCart(userId);

    return orderId;
  } catch (err) {
    console.error("SQLite order creation error:", err);
    throw err;
  }
}

export async function getUserOrders(userId: number) {
  try {
    if (API_URL) return await api.get(`/orders?userId=${userId}`);
    const rows = await db.getAllAsync(
      `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`,
      userId
    );
    return rows;
  } catch (err) {
    console.error("SQLite fetch error:", err);
    return [];
  }
}

export async function getOrderItems(orderId: number) {
  try {
    if (API_URL) return await api.get(`/orders/${orderId}/items`);
    const rows = await db.getAllAsync(
      `SELECT * FROM order_items WHERE order_id = ? ORDER BY id`,
      orderId
    );
    return rows;
  } catch (err) {
    console.error("SQLite fetch error:", err);
    return [];
  }
}

export async function getAllOrders() {
  try {
    if (API_URL) return await api.get('/orders/all');
    const rows = await db.getAllAsync(
      `SELECT o.*, u.full_name, u.number 
       FROM orders o 
       JOIN users u ON o.user_id = u.id 
       ORDER BY o.created_at DESC`
    );
    return rows;
  } catch (err) {
    console.error("SQLite fetch error:", err);
    return [];
  }
}

export async function updateOrderStatus(
  orderId: number,
  status: string,
  statusNote?: string,
  deliveryDate?: string,
  logisticsName?: string,
  trackingNumber?: string,
  trackingUrl?: string
) {
  try {
    if (API_URL) {
      await api.patch(`/orders/${orderId}`, { status, statusNote, deliveryDate, logisticsName, trackingNumber, trackingUrl });
      return true;
    }
    const fields: string[] = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
    const values: any[] = [status];

    if (statusNote !== undefined) { fields.push('status_note = ?'); values.push(statusNote); }
    if (deliveryDate !== undefined) { fields.push('delivery_date = ?'); values.push(deliveryDate); }
    if (logisticsName !== undefined) { fields.push('logistics_name = ?'); values.push(logisticsName); }
    if (trackingNumber !== undefined) { fields.push('tracking_number = ?'); values.push(trackingNumber); }
    if (trackingUrl !== undefined) { fields.push('tracking_url = ?'); values.push(trackingUrl); }

    values.push(orderId);

    await db.runAsync(
      `UPDATE orders SET ${fields.join(', ')} WHERE id = ?`,
      ...values
    );
    return true;
  } catch (err) {
    console.error("SQLite update error:", err);
    return false;
  }
}

export async function deleteOrder(orderId: number) {
  try {
    if (API_URL) {
      await api.del(`/orders/${orderId}`);
      return true;
    }
    await db.runAsync("DELETE FROM orders WHERE id = ?", orderId);
    return true;
  } catch (err) {
    console.error("SQLite delete error:", err);
    return false;
  }
}

// Crops functions
export async function getAllCrops() {
  try {
    if (API_URL) return await api.get('/crops');
    const rows = await db.getAllAsync("SELECT * FROM crops ORDER BY name ASC");
    return rows;
  } catch (err) {
    console.error("SQLite fetch error:", err);
    return [];
  }
}

export async function addCrop(input: { name: string; name_ta?: string; image?: string; }) {
  try {
    if (API_URL) {
      const res = await api.post('/crops', input);
      return (res as any).id || null;
    }
    const result = await db.runAsync(
      "INSERT INTO crops (name, name_ta, image) VALUES (?, ?, ?)",
      input.name, input.name_ta || null, input.image || null
    );
    return result.lastInsertRowId;
  } catch (err) {
    console.error("SQLite insert error:", err);
    return null;
  }
}

export async function updateCrop(id: number, input: { name?: string; name_ta?: string; image?: string; }) {
  try {
    if (API_URL) { await api.patch(`/crops/${id}`, input); return true; }
    const fields: string[] = []; const vals: any[] = [];
    Object.entries(input).forEach(([k,v]) => { if (v !== undefined) { fields.push(`${k} = ?`); vals.push(v); } });
    if (!fields.length) return true;
    vals.push(id);
    await db.runAsync(`UPDATE crops SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, ...vals);
    return true;
  } catch (err) { console.error('SQLite update error:', err); return false; }
}

export async function deleteCrop(id: number) {
  try {
    if (API_URL) { await api.del(`/crops/${id}`); return true; }
    await db.runAsync("DELETE FROM crops WHERE id = ?", id);
    return true;
  } catch (err) { console.error('SQLite delete error:', err); return false; }
}

export async function getCropGuide(cropId: number, language: 'en'|'ta' = 'en') {
  try {
    if (API_URL) return await api.get(`/crops/${cropId}/guide?lang=${language}`);
    const rows = await db.getAllAsync(
      "SELECT * FROM crop_guides WHERE crop_id = ? AND language = ?",
      cropId, language
    );
    return rows[0] || { crop_id: cropId, language, cultivation_guide: null, pest_management: null, disease_management: null };
  } catch (err) { console.error('SQLite fetch error:', err); return null; }
}

export async function upsertCropGuide(cropId: number, language: 'en'|'ta', data: { cultivation_guide?: string; pest_management?: string; disease_management?: string; }) {
  try {
    if (API_URL) { await api.put(`/crops/${cropId}/guide`, { language, ...data }); return true; }
    await db.runAsync(
      `INSERT INTO crop_guides (crop_id, language, cultivation_guide, pest_management, disease_management)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(crop_id, language)
       DO UPDATE SET cultivation_guide=excluded.cultivation_guide, pest_management=excluded.pest_management, disease_management=excluded.disease_management, updated_at=CURRENT_TIMESTAMP`,
      cropId, language, data.cultivation_guide || null, data.pest_management || null, data.disease_management || null
    );
    return true;
  } catch (err) { console.error('SQLite upsert error:', err); return false; }
}

export async function listCropPests(cropId: number, language: 'en'|'ta' = 'en') {
  try {
    if (API_URL) return await api.get(`/crops/${cropId}/pests?lang=${language}`);
    const rows = await db.getAllAsync("SELECT * FROM crop_pests WHERE crop_id = ? AND language = ? ORDER BY name ASC", cropId, language);
    return rows;
  } catch (err) { console.error('SQLite fetch error:', err); return []; }
}
export async function addCropPest(cropId: number, language: 'en'|'ta', name: string, description?: string, management?: string) {
  try {
    if (API_URL) {
      const res = await api.post(`/crops/${cropId}/pests`, { language, name, description, management });
      return (res as any).id || null;
    }
    const r = await db.runAsync("INSERT INTO crop_pests (crop_id, language, name, description, management) VALUES (?, ?, ?, ?, ?)", cropId, language, name, description || null, management || null);
    return r.lastInsertRowId;
  } catch (err) { console.error('SQLite insert error:', err); return null; }
}
export async function addCropPestImage(pestId: number, image: string, caption?: string) {
  try {
    if (API_URL) { const res = await api.post(`/pests/${pestId}/images`, { image, caption }); return (res as any).id || null; }
    const r = await db.runAsync("INSERT INTO crop_pest_images (pest_id, image, caption) VALUES (?, ?, ?)", pestId, image, caption || null);
    return r.lastInsertRowId;
  } catch (err) { console.error('SQLite insert error:', err); return null; }
}
export async function listCropDiseases(cropId: number, language: 'en'|'ta' = 'en') {
  try {
    if (API_URL) return await api.get(`/crops/${cropId}/diseases?lang=${language}`);
    const rows = await db.getAllAsync("SELECT * FROM crop_diseases WHERE crop_id = ? AND language = ? ORDER BY name ASC", cropId, language);
    return rows;
  } catch (err) { console.error('SQLite fetch error:', err); return []; }
}
export async function addCropDisease(cropId: number, language: 'en'|'ta', name: string, description?: string, management?: string) {
  try {
    if (API_URL) {
      const res = await api.post(`/crops/${cropId}/diseases`, { language, name, description, management });
      return (res as any).id || null;
    }
    const r = await db.runAsync("INSERT INTO crop_diseases (crop_id, language, name, description, management) VALUES (?, ?, ?, ?, ?)", cropId, language, name, description || null, management || null);
    return r.lastInsertRowId;
  } catch (err) { console.error('SQLite insert error:', err); return null; }
}
export async function addCropDiseaseImage(diseaseId: number, image: string, caption?: string) {
  try {
    if (API_URL) { const res = await api.post(`/diseases/${diseaseId}/images`, { image, caption }); return (res as any).id || null; }
    const r = await db.runAsync("INSERT INTO crop_disease_images (disease_id, image, caption) VALUES (?, ?, ?)", diseaseId, image, caption || null);
    return r.lastInsertRowId;
  } catch (err) { console.error('SQLite insert error:', err); return null; }
}

export async function getScanPlants() {
  try {
    if (API_URL) return await api.get('/scan-plants');
    const rows = await db.getAllAsync("SELECT * FROM scan_plants ORDER BY name ASC");
    return rows;
  } catch (err) { console.error('SQLite fetch error:', err); return []; }
}

export async function addScanPlant(name: string, name_ta?: string) {
  try {
    if (API_URL) {
      const res = await api.post('/scan-plants', { name, name_ta });
      return (res as any).id || null;
    }
    const r = await db.runAsync("INSERT INTO scan_plants (name, name_ta) VALUES (?, ?)", name, name_ta || null);
    return r.lastInsertRowId;
  } catch (err) { console.error('SQLite insert error:', err); return null; }
}

export async function deleteScanPlant(id: number) {
  try {
    if (API_URL) { await api.del(`/scan-plants/${id}`); return true; }
    await db.runAsync("DELETE FROM scan_plants WHERE id = ?", id);
    return true;
  } catch (err) { console.error('SQLite delete error:', err); return false; }
}

// Keyword functions
export async function getAllKeywords() {
  try {
    if (API_URL) return await api.get('/keywords');
    const rows = await db.getAllAsync("SELECT * FROM keywords ORDER BY name ASC");
    return rows;
  } catch (err) {
    console.error("SQLite fetch error:", err);
    return [];
  }
}

export async function addKeyword(name: string) {
  try {
    if (API_URL) {
      const res = await api.post('/keywords', { name: name.toLowerCase().trim() });
      return (res as any).id || null;
    }
    const result = await db.runAsync(
      "INSERT INTO keywords (name) VALUES (?)",
      name.toLowerCase().trim()
    );
    return result.lastInsertRowId;
  } catch (err) {
    console.error("SQLite insert error:", err);
    return null;
  }
}

export async function deleteKeyword(id: number) {
  try {
    if (API_URL) {
      await api.del(`/keywords/${id}`);
      return true;
    }
    await db.runAsync("DELETE FROM keywords WHERE id = ?", id);
    return true;
  } catch (err) {
    console.error("SQLite delete error:", err);
    return false;
  }
}

export async function getProductsByKeyword(keyword: string) {
  try {
    if (API_URL) return await api.get(`/products/by-keyword?name=${encodeURIComponent(keyword)}`);
    const searchTerm = `%${keyword.toLowerCase()}%`;
    const rows = await db.getAllAsync(
      "SELECT * FROM products WHERE LOWER(keywords) LIKE ? ORDER BY created_at DESC",
      searchTerm
    );
    return rows;
  } catch (err) {
    console.error("SQLite fetch error:", err);
    return [];
  }
}

// User functions
export async function updateUserAddress(userId: number, address: string) {
  try {
    if (API_URL) {
      await api.patch(`/users/${userId}`, { address });
      return true;
    }
    await db.runAsync(
      "UPDATE users SET address = ? WHERE id = ?",
      address, userId
    );
    return true;
  } catch (err) {
    console.error("SQLite update error:", err);
    return false;
  }
}

export async function getUserById(userId: number) {
  try {
    const rows = await db.getAllAsync("SELECT * FROM users WHERE id = ?", userId);
    return rows[0] || null;
  } catch (err) {
    console.error("SQLite fetch error:", err);
    return null;
  }
}

export default db;
