// Messaging (remote-only)
export async function createConversation(userIds: number[], initialText?: string, senderId?: number) {
  if (!API_URL) throw new Error('API_URL not configured');
  try { return await api.post('/conversations', { userIds, initialText, senderId }); }
  catch { return null; }
}
export async function listConversations(userId: number) {
  if (!API_URL) throw new Error('API_URL not configured');
  try { return await api.get(`/conversations?userId=${userId}`); }
  catch { return []; }
}
export async function listMessages(conversationId: number) {
  if (!API_URL) throw new Error('API_URL not configured');
  try { return await api.get(`/conversations/${conversationId}/messages`); }
  catch { return []; }
}
export async function getConversations(userId: number) {
  if (!API_URL) throw new Error('API_URL not configured');
  // alias for listConversations naming symmetry
  return await api.get(`/conversations?userId=${userId}`);
}
export async function sendMessage(conversationId: number, senderId: number, text: string) {
  if (!API_URL) throw new Error('API_URL not configured');
  try { return await api.post(`/conversations/${conversationId}/messages`, { senderId, text }); }
  catch (e) {
    // queue locally for retry
    try { await queueOutboxMessage(conversationId, senderId, text, String((e as any)?.message || '')); } catch {}
    return { queued: true } as any;
  }
}

import { Platform } from 'react-native';
import { api, API_URL } from './api';

let SQLite: any = null as any;
if (Platform.OS !== 'web') {
  // Lazy require to avoid importing expo-sqlite on web
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  SQLite = require('expo-sqlite');
}

const db: any = Platform.OS !== 'web' ? SQLite.openDatabaseSync("agroappDatabase.db") : null;

if (Platform.OS !== 'web') (async () => {
  // Always ensure local schema exists so we can fall back if remote API is unavailable
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

    CREATE TABLE IF NOT EXISTS order_status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
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
      caption_ta TEXT,
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
      caption_ta TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (disease_id) REFERENCES crop_diseases(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS scan_plants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      name_ta TEXT
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      user_id INTEGER NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS conversation_seen (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(conversation_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS outbox_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      tries INTEGER DEFAULT 0,
      last_error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pending_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      temp_id TEXT UNIQUE NOT NULL,
      creator_id INTEGER NOT NULL,
      participant_ids TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
    await addProdTextCol('seller_name');

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

    // variants tables (local)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS logistics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        tracking_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS product_variants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        label TEXT NOT NULL,
        price REAL NOT NULL,
        stock_available INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(product_id, label),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      );
    `);
    // add variant columns to cart/order items
    const cartCols = await db.getAllAsync("PRAGMA table_info(cart_items)");
    const cartColNames = (cartCols as any[]).map(c => c.name);
    if (!cartColNames.includes('variant_id')) {
      await db.runAsync('ALTER TABLE cart_items ADD COLUMN variant_id INTEGER');
    }
    const orderItemCols = await db.getAllAsync("PRAGMA table_info(order_items)");
    const orderItemColNames = (orderItemCols as any[]).map(c => c.name);
    if (!orderItemColNames.includes('variant_id')) await db.runAsync('ALTER TABLE order_items ADD COLUMN variant_id INTEGER');
    if (!orderItemColNames.includes('variant_label')) await db.runAsync('ALTER TABLE order_items ADD COLUMN variant_label TEXT');

    // image caption bilingual columns
    const pestImgCols = await db.getAllAsync("PRAGMA table_info(crop_pest_images)");
    const pestImgColNames = (pestImgCols as any[]).map(c => c.name);
    if (!pestImgColNames.includes('caption_ta')) {
      await db.runAsync('ALTER TABLE crop_pest_images ADD COLUMN caption_ta TEXT');
    }
    if (!pestImgColNames.includes('public_id')) {
      await db.runAsync('ALTER TABLE crop_pest_images ADD COLUMN public_id TEXT');
    }
    const disImgCols = await db.getAllAsync("PRAGMA table_info(crop_disease_images)");
    const disImgColNames = (disImgCols as any[]).map(c => c.name);
    if (!disImgColNames.includes('caption_ta')) {
      await db.runAsync('ALTER TABLE crop_disease_images ADD COLUMN caption_ta TEXT');
    }
    if (!disImgColNames.includes('public_id')) {
      await db.runAsync('ALTER TABLE crop_disease_images ADD COLUMN public_id TEXT');
    }

    // bilingual columns for pests/diseases (local fallback compatibility)
    const pestCols = await db.getAllAsync("PRAGMA table_info(crop_pests)");
    const pestColNames = (pestCols as any[]).map(c => c.name);
    if (!pestColNames.includes('name_ta')) await db.runAsync('ALTER TABLE crop_pests ADD COLUMN name_ta TEXT');
    if (!pestColNames.includes('description_ta')) await db.runAsync('ALTER TABLE crop_pests ADD COLUMN description_ta TEXT');
    if (!pestColNames.includes('management_ta')) await db.runAsync('ALTER TABLE crop_pests ADD COLUMN management_ta TEXT');

    const disCols = await db.getAllAsync("PRAGMA table_info(crop_diseases)");
    const disColNames = (disCols as any[]).map(c => c.name);
    if (!disColNames.includes('name_ta')) await db.runAsync('ALTER TABLE crop_diseases ADD COLUMN name_ta TEXT');
    if (!disColNames.includes('description_ta')) await db.runAsync('ALTER TABLE crop_diseases ADD COLUMN description_ta TEXT');
    if (!disColNames.includes('management_ta')) await db.runAsync('ALTER TABLE crop_diseases ADD COLUMN management_ta TEXT');
  } catch (e) {
    console.warn('Migration check failed:', e);
  }

  // Seed default crops locally if absent (for offline mode)
  try {
    const rows = await db.getAllAsync("SELECT lower(name) as name FROM crops");
    const names = (rows as any[]).map(r => String(r.name));
    if (!names.includes('tomato')) {
      await db.runAsync("INSERT INTO crops (name, name_ta) VALUES (?, ?)", 'Tomato', 'தக்காளி');
    }
    if (!(names.includes('brinjal') || names.includes('eggplant') || names.includes('aubergine'))) {
      await db.runAsync("INSERT INTO crops (name, name_ta) VALUES (?, ?)", 'Brinjal', 'கத்தரிக்காய்');
    }
  } catch (se) {
    console.warn('Seed crops skipped:', se);
  }
})();

export async function savePlant(userId: number, name: string, imageUri: string, result: string) {
  try {
    if (Platform.OS === 'web') return; // no-op on web
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
    if (Platform.OS === 'web') return [];
    const rows = await db.getAllAsync("SELECT * FROM plants WHERE user_id = ? ORDER BY id DESC", userId);
    return rows;
  } catch (err) {
    console.error("SQLite fetch error:", err);
    return [];
  }
}

// Product functions
export async function listUsersBasic() {
  try {
    if (API_URL) {
      try {
        const basic = await api.get('/users-basic');
        // Older deployments may not include is_admin in /users-basic. To keep
        // the app working, merge with /admins (which always has is_admin for
        // Vendor/Master) and default everything else to 0 (User).
        let admins: any[] = [];
        try {
          admins = await api.get('/admins');
        } catch {
          // If /admins is missing for some reason, just return what we have.
          return basic;
        }
        if (!Array.isArray(basic)) return basic as any;
        const roleById: Record<number, number> = {};
        for (const a of admins || []) {
          if (!a || a.id == null) continue;
          const idNum = Number(a.id);
          if (Number.isNaN(idNum)) continue;
          const role = a.is_admin != null ? Number(a.is_admin) : 0;
          roleById[idNum] = Number.isNaN(role) ? 0 : role;
        }
        return basic.map((u: any) => {
          const idNum = Number(u?.id);
          const fromBasic = u?.is_admin != null ? Number(u.is_admin) : undefined;
          const fromAdmins = !Number.isNaN(idNum) ? roleById[idNum] : undefined;
          let role: number = 0;
          if (fromBasic != null && !Number.isNaN(fromBasic)) role = fromBasic;
          else if (fromAdmins != null && !Number.isNaN(fromAdmins)) role = fromAdmins;
          return { ...u, is_admin: role };
        });
      } catch (e) {
        // fall back to local if endpoint missing / failing
      }
    }
    // Include is_admin so callers can filter by Master/Vendor/User when
    // running in local/offline mode.
    const rows = await db.getAllAsync('SELECT id, full_name, number, is_admin FROM users ORDER BY created_at ASC');
    return rows;
  } catch (err) { console.error('SQLite fetch error:', err); return []; }
}

export async function getNotifications(userId?: number) {
  try {
    if (API_URL) {
      const path = userId ? `/notifications?userId=${userId}` : '/notifications';
      return await api.get(path);
    }
    if (userId) return await db.getAllAsync('SELECT * FROM notifications WHERE user_id IS NULL OR user_id = ? ORDER BY created_at DESC', userId);
    return await db.getAllAsync('SELECT * FROM notifications WHERE user_id IS NULL ORDER BY created_at DESC');
  } catch (err) { console.error('SQLite fetch error:', err); return []; }
}

export async function publishSystemNotification(title: string, message: string, title_ta?: string, message_ta?: string) {
  try {
    if (API_URL) {
      const res = await api.post('/notifications', { title, message, title_ta, message_ta });
      return (res as any)?.id || null;
    }
    // Local: add bilingual columns if missing
    try { await db.runAsync('ALTER TABLE notifications ADD COLUMN title_ta TEXT'); } catch {}
    try { await db.runAsync('ALTER TABLE notifications ADD COLUMN message_ta TEXT'); } catch {}
    const r = await db.runAsync('INSERT INTO notifications (title, message, title_ta, message_ta, user_id) VALUES (?, ?, ?, ?, NULL)', title, message, title_ta || null, message_ta || null);
    return r.lastInsertRowId;
  } catch (err) { console.error('SQLite insert error:', err); return null; }
}

export async function getAllProducts() {
  // Remote-only mode: do not fall back to local SQLite
  if (!API_URL) throw new Error('API_URL not configured');
  return await api.get('/products');
}

export async function getAllProductsAdmin() {
  // Remote-only: do not fall back to local
  if (!API_URL) throw new Error('API_URL not configured');
  return await api.get('/products/admin');
}

export async function reviewProduct(id: number, status: 'approved'|'rejected'|'pending', note?: string, reviewer_id?: number) {
  if (!API_URL) throw new Error('API_URL not configured');
  await api.patch(`/products/${id}/review`, { status, note, reviewer_id });
  return true;
}

export async function getPendingProducts() {
  if (!API_URL) throw new Error('API_URL not configured');
  return await api.get('/products/pending');
}

export async function getProductById(id: number) {
  try {
    if (API_URL) { try { return await api.get(`/products/${id}`); } catch (e) { /* fall back */ } }
    const rows = await db.getAllAsync("SELECT * FROM products WHERE id = ?", id);
    return rows[0] || null;
  } catch (err) {
    console.error("Local fetch error:", err);
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
  seller_name?: string;
}) {
  try {
    if (API_URL) {
      const res = await api.post('/products', product);
      return (res as any).id || null;
    }
    const result = await db.runAsync(
      "INSERT INTO products (name, plant_used, keywords, details, name_ta, plant_used_ta, details_ta, image, unit, stock_available, cost_per_unit, seller_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
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
      product.cost_per_unit,
      product.seller_name || null
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
  seller_name?: string;
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
  if (!API_URL) throw new Error('API_URL not configured');
  return await api.get(`/products/search?q=${encodeURIComponent(keywords)}`);
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
    if (API_URL) {
      try { return await api.get(`/cart?userId=${userId}`); }
      catch (e) { console.warn('Remote getCartItems failed, using local DB:', e); }
    }
    const rows = await db.getAllAsync(
      `SELECT ci.*, p.name, p.name_ta, p.image,
              COALESCE(v.price, p.cost_per_unit) as cost_per_unit,
              v.label as variant_label,
              v.id as variant_id,
              p.stock_available
       FROM cart_items ci 
       JOIN products p ON ci.product_id = p.id 
       LEFT JOIN product_variants v ON ci.variant_id = v.id
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

export async function addToCart(userId: number, productId: number, quantity: number = 1, variantId?: number) {
  try {
    if (API_URL) {
      await api.post('/cart/add', { userId, productId, quantity, variantId });
      return true;
    }
    // Check if item already exists in cart
    const existing = await db.getAllAsync(
      "SELECT * FROM cart_items WHERE user_id = ? AND product_id = ? AND (variant_id IS ? OR variant_id = ?)",
      userId, productId, variantId ?? null, variantId ?? null
    );
    
    if (existing.length > 0) {
      // Update quantity
      await db.runAsync(
        "UPDATE cart_items SET quantity = quantity + ? WHERE user_id = ? AND product_id = ? AND (variant_id IS ? OR variant_id = ?)",
        quantity, userId, productId, variantId ?? null, variantId ?? null
      );
    } else {
      // Add new item
      await db.runAsync(
        "INSERT INTO cart_items (user_id, product_id, quantity, variant_id) VALUES (?, ?, ?, ?)",
        userId, productId, quantity, variantId ?? null
      );
    }
    return true;
  } catch (err) {
    console.error("SQLite insert error:", err);
    return false;
  }
}

export async function updateCartItemQuantity(userId: number, productId: number, quantity: number, variantId?: number) {
  try {
    if (API_URL) {
      await api.patch('/cart/item', { userId, productId, quantity, variantId });
      return true;
    }
    if (quantity <= 0) {
      await db.runAsync(
        "DELETE FROM cart_items WHERE user_id = ? AND product_id = ? AND (variant_id IS ? OR variant_id = ?)",
        userId, productId, variantId ?? null, variantId ?? null
      );
    } else {
      await db.runAsync(
        "UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ? AND (variant_id IS ? OR variant_id = ?)",
        quantity, userId, productId, variantId ?? null, variantId ?? null
      );
    }
    return true;
  } catch (err) {
    console.error("SQLite update error:", err);
    return false;
  }
}

export async function removeFromCart(userId: number, productId: number, variantId?: number) {
  try {
    if (API_URL) {
      await api.del('/cart/item', { userId, productId, variantId });
      return true;
    }
    await db.runAsync(
      "DELETE FROM cart_items WHERE user_id = ? AND product_id = ? AND (variant_id IS ? OR variant_id = ?)",
      userId, productId, variantId ?? null, variantId ?? null
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
      try { const res = await api.get(`/cart/total?userId=${userId}`); return (res as any)?.total || 0; }
      catch (e) { console.warn('Remote getCartTotal failed, using local DB:', e); }
    }
    const rows = await db.getAllAsync(
      `SELECT SUM(ci.quantity * COALESCE(v.price, p.cost_per_unit)) as total 
       FROM cart_items ci 
       JOIN products p ON ci.product_id = p.id 
       LEFT JOIN product_variants v ON ci.variant_id = v.id
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
    // initial timeline status
    try { await db.runAsync("INSERT INTO order_status_history (order_id, status, note) VALUES (?, ?, ?)", orderResult.lastInsertRowId, 'confirmed', note || null); } catch {}

    const orderId = orderResult.lastInsertRowId;

    // Insert order items
    for (const item of cartItems as any[]) {
      const price = (item as any).price ?? (item as any).cost_per_unit;
      await db.runAsync(
        "INSERT INTO order_items (order_id, product_id, product_name, quantity, price_per_unit, variant_id, variant_label) VALUES (?, ?, ?, ?, ?, ?, ?)",
        orderId, item.product_id, item.name, item.quantity, price, (item as any).variant_id || null, (item as any).variant_label || null
      );

      // Update stock
      if ((item as any).variant_id) {
        await db.runAsync(
          "UPDATE product_variants SET stock_available = stock_available - ? WHERE id = ?",
          item.quantity, (item as any).variant_id
        );
      } else {
        await db.runAsync(
          "UPDATE products SET stock_available = stock_available - ? WHERE id = ?",
          item.quantity, item.product_id
        );
      }
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
    if (API_URL) {
      try { return await api.get(`/orders?userId=${userId}`); }
      catch (e) { console.warn('Remote getUserOrders failed, using local DB:', e); }
    }
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
    if (API_URL) {
      try { return await api.get(`/orders/${orderId}/items`); }
      catch (e) { console.warn('Remote getOrderItems failed, using local DB:', e); }
    }
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
    if (API_URL) {
      try { return await api.get('/orders/all'); }
      catch (e) { console.warn('Remote getAllOrders failed, using local DB:', e); }
    }
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

export async function getOrderStatusHistory(orderId: number) {
  try {
    if (API_URL) {
      try { return await api.get(`/orders/${orderId}/status-history`); } catch {}
    }
    const rows = await db.getAllAsync(
      `SELECT status, note, created_at FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC, id ASC`,
      orderId
    );
    return rows;
  } catch (err) { console.error('SQLite fetch error:', err); return []; }
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
    // Append to local history timeline if status changed
    if (status !== undefined && status !== null) {
      await db.runAsync(
        `INSERT INTO order_status_history (order_id, status, note) VALUES (?, ?, ?)`,
        orderId, status, statusNote || null
      );
    }
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

// Logistics functions
export async function listLogistics() {
  try {
    if (API_URL) {
      try { return await api.get('/logistics'); } catch {}
    }
    const rows = await db.getAllAsync("SELECT * FROM logistics ORDER BY name ASC");
    return rows;
  } catch (err) { console.error('SQLite fetch error:', err); return []; }
}

export async function addLogistic(name: string, tracking_url?: string) {
  try {
    if (API_URL) {
      try { const res = await api.post('/logistics', { name, tracking_url }); return (res as any)?.id || null; } catch {}
    }
    const r = await db.runAsync("INSERT INTO logistics (name, tracking_url) VALUES (?, ?)", name, tracking_url || null);
    return r.lastInsertRowId;
  } catch (err) { console.error('SQLite insert error:', err); return null; }
}

export async function deleteLogistic(id: number) {
  try {
    if (API_URL) { try { await api.del(`/logistics/${id}`); return true; } catch {} }
    await db.runAsync("DELETE FROM logistics WHERE id = ?", id);
    return true;
  } catch (err) { console.error('SQLite delete error:', err); return false; }
}

// Crops functions
export async function getAllCrops() {
  try {
    if (API_URL) {
      try { return await api.get('/crops'); }
      catch (e) { console.warn('Remote getAllCrops failed, using local DB:', e); }
    }
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
      try {
        const res = await api.post('/crops', input);
        return (res as any).id || null;
      } catch (e) {
        console.warn('Remote addCrop failed, falling back to local:', e);
      }
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
    if (API_URL) {
      try {
        const res = await api.get(`/crops/${cropId}/guide?lang=${language}`);
        if (res && typeof res === 'object' && 'guide' in (res as any)) return (res as any).guide;
        return res as any;
      } catch (e) {
        console.warn('Remote getCropGuide failed, using local DB:', e);
      }
    }
    const row = await db.getFirstAsync?.(
      'SELECT cultivation_guide, pest_management, disease_management FROM crop_guides WHERE crop_id = ? AND language = ?',
      cropId, language
    );
    return row || { cultivation_guide: null, pest_management: null, disease_management: null };
  } catch (err) {
    console.error('SQLite fetch error:', err);
    return { cultivation_guide: null, pest_management: null, disease_management: null } as any;
  }
}

export async function upsertCropGuide(cropId: number, language: 'en'|'ta', data: { cultivation_guide?: string; pest_management?: string; disease_management?: string; }) {
  try {
    if (API_URL) {
      try { await api.put(`/crops/${cropId}/guide`, { language, ...data }); return true; }
      catch (e) { console.warn('Remote upsertCropGuide failed, falling back to local:', e); }
    }
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
    if (API_URL) {
      try { return await api.get(`/crops/${cropId}/pests`); }
      catch (e) { console.warn('Remote listCropPests failed, using local DB:', e); }
    }
    const rows = await db.getAllAsync(
      'SELECT id, crop_id, name, name_ta, description, description_ta, management, management_ta FROM crop_pests WHERE crop_id = ? ORDER BY name ASC',
      cropId
    );
    return rows;
  } catch (err) { console.error('SQLite fetch error:', err); return []; }
}
export async function updateCropPest(pestId: number, fields: { name?: string; name_ta?: string; description?: string; description_ta?: string; management?: string; management_ta?: string; }) {
  try {
    if (API_URL) { try { await api.patch(`/pests/${pestId}`, fields); return true; } catch {/* fall back */} }
    const sets: string[] = []; const vals: any[] = [];
    Object.entries(fields).forEach(([k,v]) => { if (v !== undefined) { sets.push(`${k} = ?`); vals.push(v); } });
    if (!sets.length) return true;
    vals.push(pestId);
    await db.runAsync(`UPDATE crop_pests SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, ...vals);
    return true;
  } catch (err) { console.error('SQLite update error:', err); return false; }
}
export async function addCropPest(cropId: number, language: 'en'|'ta', name: string, description?: string, management?: string) {
  try {
    if (API_URL) {
      try {
        const res = await api.post(`/crops/${cropId}/pests`, { language, name, description, management });
        return (res as any).id || null;
      } catch (e) { console.warn('Remote addCropPest failed, falling back to local:', e); }
    }
    const r = await db.runAsync("INSERT INTO crop_pests (crop_id, language, name, description, management) VALUES (?, ?, ?, ?, ?)", cropId, language, name, description || null, management || null);
    return r.lastInsertRowId;
  } catch (err) { console.error('SQLite insert error:', err); return null; }
}
export async function addCropPestBoth(cropId: number, input: { name_en: string; name_ta: string; description_en?: string; description_ta?: string; management_en?: string; management_ta?: string; }) {
  try {
    if (API_URL) {
      try {
        const res = await api.post(`/crops/${cropId}/pests-both`, input);
        return (res as any).id || null;
      } catch (e) { console.warn('Remote addCropPestBoth failed, falling back to local:', e); }
    }
    const r = await db.runAsync(
      "INSERT INTO crop_pests (crop_id, language, name, name_ta, description, description_ta, management, management_ta) VALUES (?, 'en', ?, ?, ?, ?, ?, ?)",
      cropId, input.name_en, input.name_ta || null, input.description_en || null, input.description_ta || null, input.management_en || null, input.management_ta || null
    );
    return r.lastInsertRowId;
  } catch (err) { console.error('SQLite insert error:', err); return null; }
}
export async function addCropPestImage(pestId: number, image: string, caption?: string, caption_ta?: string, public_id?: string) {
  try {
    if (API_URL) {
      try { const res = await api.post(`/pests/${pestId}/images`, { image, caption, caption_ta, public_id }); return (res as any).id || null; }
      catch (e) { console.warn('Remote addCropPestImage failed, falling back to local:', e); }
    }
    const r = await db.runAsync("INSERT INTO crop_pest_images (pest_id, image, caption, caption_ta, public_id) VALUES (?, ?, ?, ?, ?)", pestId, image, caption || null, caption_ta || null, public_id || null);
    return r.lastInsertRowId;
  } catch (err) { console.error('SQLite insert error:', err); return null; }
}
export async function listCropPestImages(pestId: number) {
  try {
    if (API_URL) {
      try { return await api.get(`/pests/${pestId}/images`); }
      catch (e) { console.warn('Remote listCropPestImages failed, using local DB:', e); }
    }
    const rows = await db.getAllAsync(
      'SELECT id, image as image, caption, caption_ta FROM crop_pest_images WHERE pest_id = ? ORDER BY id',
      pestId
    );
    return rows;
  } catch (err) { console.error('SQLite fetch error:', err); return []; }
}
export async function listCropDiseases(cropId: number, language: 'en'|'ta' = 'en') {
  try {
    if (API_URL) {
      try { return await api.get(`/crops/${cropId}/diseases`); }
      catch (e) { console.warn('Remote listCropDiseases failed, using local DB:', e); }
    }
    const rows = await db.getAllAsync(
      'SELECT id, crop_id, name, name_ta, description, description_ta, management, management_ta FROM crop_diseases WHERE crop_id = ? ORDER BY name ASC',
      cropId
    );
    return rows;
  } catch (err) { console.error('SQLite fetch error:', err); return []; }
}
export async function updateCropDisease(diseaseId: number, fields: { name?: string; name_ta?: string; description?: string; description_ta?: string; management?: string; management_ta?: string; }) {
  try {
    if (API_URL) { try { await api.patch(`/diseases/${diseaseId}`, fields); return true; } catch {/* fall back */} }
    const sets: string[] = []; const vals: any[] = [];
    Object.entries(fields).forEach(([k,v]) => { if (v !== undefined) { sets.push(`${k} = ?`); vals.push(v); } });
    if (!sets.length) return true;
    vals.push(diseaseId);
    await db.runAsync(`UPDATE crop_diseases SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, ...vals);
    return true;
  } catch (err) { console.error('SQLite update error:', err); return false; }
}
export async function addCropDisease(cropId: number, language: 'en'|'ta', name: string, description?: string, management?: string) {
  try {
    if (API_URL) {
      try {
        const res = await api.post(`/crops/${cropId}/diseases`, { language, name, description, management });
        return (res as any).id || null;
      } catch (e) { console.warn('Remote addCropDisease failed, falling back to local:', e); }
    }
    const r = await db.runAsync("INSERT INTO crop_diseases (crop_id, language, name, description, management) VALUES (?, ?, ?, ?, ?)", cropId, language, name, description || null, management || null);
    return r.lastInsertRowId;
  } catch (err) { console.error('SQLite insert error:', err); return null; }
}
export async function addCropDiseaseBoth(cropId: number, input: { name_en: string; name_ta: string; description_en?: string; description_ta?: string; management_en?: string; management_ta?: string; }) {
  try {
    if (API_URL) {
      try {
        const res = await api.post(`/crops/${cropId}/diseases-both`, input);
        return (res as any).id || null;
      } catch (e) { console.warn('Remote addCropDiseaseBoth failed, falling back to local:', e); }
    }
    const r = await db.runAsync(
      "INSERT INTO crop_diseases (crop_id, language, name, name_ta, description, description_ta, management, management_ta) VALUES (?, 'en', ?, ?, ?, ?, ?, ?)",
      cropId, input.name_en, input.name_ta || null, input.description_en || null, input.description_ta || null, input.management_en || null, input.management_ta || null
    );
    return r.lastInsertRowId;
  } catch (err) { console.error('SQLite insert error:', err); return null; }
}
export async function addCropDiseaseImage(diseaseId: number, image: string, caption?: string, caption_ta?: string, public_id?: string) {
  try {
    if (API_URL) {
      try { const res = await api.post(`/diseases/${diseaseId}/images`, { image, caption, caption_ta, public_id }); return (res as any).id || null; }
      catch (e) { console.warn('Remote addCropDiseaseImage failed, falling back to local:', e); }
    }
    const r = await db.runAsync("INSERT INTO crop_disease_images (disease_id, image, caption, caption_ta, public_id) VALUES (?, ?, ?, ?, ?)", diseaseId, image, caption || null, caption_ta || null, public_id || null);
    return r.lastInsertRowId;
  } catch (err) { console.error('SQLite insert error:', err); return null; }
}
export async function listCropDiseaseImages(diseaseId: number) {
  try {
    if (API_URL) {
      try { return await api.get(`/diseases/${diseaseId}/images`); }
      catch (e) { console.warn('Remote listCropDiseaseImages failed, using local DB:', e); }
    }
    const rows = await db.getAllAsync(
      'SELECT id, image as image, caption, caption_ta FROM crop_disease_images WHERE disease_id = ? ORDER BY id',
      diseaseId
    );
    return rows;
  } catch (err) { console.error('SQLite fetch error:', err); return []; }
}

export async function deleteCropPestImage(imageId: number) {
  try {
    // Only call remote if explicitly enabled
    if (API_URL && process.env.EXPO_PUBLIC_API_SUPPORTS_CROP_DOCTOR_DELETE === '1') {
      try { await api.del(`/pest-images/${imageId}`); } catch {/* ignore; fall back to local */}
    }
    await db.runAsync("DELETE FROM crop_pest_images WHERE id = ?", imageId);
    return true;
  } catch (err) { console.error('SQLite delete error:', err); return false; }
}

export async function deleteCropDiseaseImage(imageId: number) {
  try {
    if (API_URL && process.env.EXPO_PUBLIC_API_SUPPORTS_CROP_DOCTOR_DELETE === '1') {
      try { await api.del(`/disease-images/${imageId}`); } catch {/* ignore */}
    }
    await db.runAsync("DELETE FROM crop_disease_images WHERE id = ?", imageId);
    return true;
  } catch (err) { console.error('SQLite delete error:', err); return false; }
}

export async function deleteCropPest(imageId: number) {
  try {
    if (API_URL) { try { await api.del(`/pests/${imageId}`); } catch {/* fall back to local */} }
    await db.runAsync("DELETE FROM crop_pests WHERE id = ?", imageId);
    return true;
  } catch (err) { console.error('SQLite delete error:', err); return false; }
}

export async function deleteCropDisease(diseaseId: number) {
  try {
    if (API_URL) { try { await api.del(`/diseases/${diseaseId}`); } catch {/* fall back to local */} }
    await db.runAsync("DELETE FROM crop_diseases WHERE id = ?", diseaseId);
    return true;
  } catch (err) { console.error('SQLite delete error:', err); return false; }
}

export async function deleteCropGuide(cropId: number, language: 'en'|'ta') {
  try {
    if (API_URL) { try { await api.del(`/crops/${cropId}/guide?lang=${language}`); } catch (e) { console.warn('Remote deleteCropGuide failed, deleting local only:', e); } }
    await db.runAsync("DELETE FROM crop_guides WHERE crop_id = ? AND language = ?", cropId, language);
    return true;
  } catch (err) { console.error('SQLite delete error:', err); return false; }
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
// Variants APIs
export async function getProductVariants(productId: number) {
  try {
    if (API_URL) {
      try { return await api.get(`/products/${productId}/variants`); }
      catch { /* fall through to local */ }
    }
    const rows = await db.getAllAsync("SELECT id, product_id, label, price, stock_available FROM product_variants WHERE product_id = ? ORDER BY price ASC", productId);
    return rows;
  } catch (err) { console.error('SQLite fetch error:', err); return []; }
}
export async function addProductVariant(productId: number, input: { label: string; price: number; stock_available?: number; }) {
  try {
    if (API_URL) {
      try { const r = await api.post(`/products/${productId}/variants`, input); return (r as any).id || null; }
      catch { /* fall back to local */ }
    }
    // UPSERT in SQLite to avoid UNIQUE(product_id,label) failures
    await db.runAsync(
      `INSERT INTO product_variants (product_id, label, price, stock_available)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(product_id, label)
       DO UPDATE SET price=excluded.price, stock_available=excluded.stock_available, updated_at=CURRENT_TIMESTAMP`,
      productId, input.label, input.price, input.stock_available ?? 0
    );
    const row = await db.getFirstAsync?.("SELECT id FROM product_variants WHERE product_id = ? AND label = ?", productId, input.label);
    return row?.id ?? null;
  } catch (err) { console.error('SQLite insert error:', err); return null; }
}
export async function updateProductVariant(variantId: number, fields: { label?: string; price?: number; stock_available?: number; }) {
  try {
    if (API_URL) { try { await api.patch(`/variants/${variantId}`, fields); return true; } catch { /* fall back */ } }
    const sets: string[] = []; const vals: any[] = [];
    Object.entries(fields).forEach(([k,v]) => { if (v !== undefined) { sets.push(`${k} = ?`); vals.push(v); } });
    if (!sets.length) return true;
    vals.push(variantId);
    await db.runAsync(`UPDATE product_variants SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, ...vals);
    return true;
  } catch (err) { console.error('SQLite update error:', err); return false; }
}
export async function deleteProductVariant(variantId: number) {
  try {
    if (API_URL) { try { await api.del(`/variants/${variantId}`); return true; } catch { /* fall back */ } }
    await db.runAsync("DELETE FROM product_variants WHERE id = ?", variantId);
    return true;
  } catch (err) { console.error('SQLite delete error:', err); return false; }
}

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
  if (!API_URL) throw new Error('API_URL not configured');
  return await api.get(`/products/by-keyword?name=${encodeURIComponent(keyword)}`);
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

export async function updateUser(userId: number, fields: { full_name?: string; address?: string; number?: string; is_admin?: number }) {
  try {
    if (API_URL) { await api.patch(`/users/${userId}`, fields); return true; }
    const sets: string[] = []; const vals: any[] = [];
    if (fields.full_name !== undefined) { sets.push('full_name = ?'); vals.push(fields.full_name); }
    if (fields.address !== undefined) { sets.push('address = ?'); vals.push(fields.address); }
    if (fields.number !== undefined) { sets.push('number = ?'); vals.push(fields.number); }
    if (fields.is_admin !== undefined) { sets.push('is_admin = ?'); vals.push(fields.is_admin); }
    if (!sets.length) return true;
    vals.push(userId);
    await db.runAsync(`UPDATE users SET ${sets.join(', ')}, created_at=created_at WHERE id = ?`, ...vals);
    return true;
  } catch (err) { console.error('SQLite update error:', err); return false; }
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

export async function listAdmins() {
  try {
    if (API_URL) {
      try { return await api.get('/admins'); }
      catch (e) { /* fall back to local */ }
    }
    const rows = await db.getAllAsync("SELECT id, number, full_name, is_admin FROM users WHERE is_admin > 0 ORDER BY created_at ASC");
    return rows;
  } catch (err) { console.error('SQLite fetch error:', err); return []; }
}

export async function setAdminRole(userId: number, role: 0|1|2) {
  try {
    if (API_URL) { await api.patch(`/users/${userId}`, { is_admin: role }); return true; }
    await db.runAsync("UPDATE users SET is_admin = ? WHERE id = ?", role, userId);
    return true;
  } catch (err) { console.error('SQLite update error:', err); return false; }
}

export async function deleteUser(id: number) {
  try {
    if (API_URL) {
      await api.del(`/users/${id}`);
      return true;
    }
    await db.runAsync("DELETE FROM users WHERE id = ?", id);
    return true;
  } catch (err) {
    console.error('SQLite delete error:', err);
    return false;
  }
}

// Conversation seen (local-only for unread badges)
export async function markConversationSeen(conversationId: number, userId: number, whenIso?: string) {
  try {
    if (Platform.OS === 'web') return true;
    const ts = whenIso || new Date().toISOString();
    await db.runAsync(
      `INSERT INTO conversation_seen (conversation_id, user_id, last_seen_at)
       VALUES (?, ?, ?)
       ON CONFLICT(conversation_id, user_id)
       DO UPDATE SET last_seen_at=excluded.last_seen_at`,
      conversationId, userId, ts
    );
    return true;
  } catch (e) { console.warn('markConversationSeen failed', e); return false; }
}
export async function getConversationSeenAt(conversationId: number, userId: number): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return null;
    const row = await db.getFirstAsync?.("SELECT last_seen_at FROM conversation_seen WHERE conversation_id = ? AND user_id = ?", conversationId, userId);
    return row?.last_seen_at || null;
  } catch { return null; }
}

export async function queueOutboxMessage(conversationId: number, senderId: number, text: string, last_error?: string) {
  try {
    if (Platform.OS === 'web') return null;
    const r = await db.runAsync(
      "INSERT INTO outbox_messages (conversation_id, sender_id, text, tries, last_error) VALUES (?, ?, ?, 0, ?)",
      conversationId, senderId, text, last_error || null
    );
    return r.lastInsertRowId || null;
  } catch { return null; }
}
export async function createPendingConversation(tempId: string, creatorId: number, participantIds: number[]) {
  try {
    if (Platform.OS === 'web') return null;
    const r = await db.runAsync(
      "INSERT INTO pending_conversations (temp_id, creator_id, participant_ids) VALUES (?, ?, ?)",
      tempId, creatorId, JSON.stringify(participantIds || [])
    );
    return r.lastInsertRowId || null;
  } catch { return null; }
}
export async function getPendingConversationByTempId(tempId: string) {
  try {
    if (Platform.OS === 'web') return null;
    const row = await db.getFirstAsync?.("SELECT * FROM pending_conversations WHERE temp_id = ?", tempId);
    return row || null;
  } catch { return null; }
}
export async function flushOutbox(limit: number = 20) {
  try {
    if (!API_URL) return 0;
    if (Platform.OS === 'web') return 0;
    const pending = await db.getAllAsync("SELECT * FROM outbox_messages ORDER BY id ASC LIMIT ?", limit);
    let sent = 0;
    for (const row of (pending as any[])) {
      try {
        let targetConversationId = Number(row.conversation_id);
        if (targetConversationId < 0) {
          const pendId = Math.abs(targetConversationId);
          const pend = await db.getFirstAsync?.("SELECT * FROM pending_conversations WHERE id = ?", pendId);
          if (pend) {
            const participants = JSON.parse(pend.participant_ids || '[]');
            const created = await api.post('/conversations', { userIds: participants, initialText: undefined, senderId: Number(pend.creator_id) });
            const realId = Number((created as any)?.id);
            if (realId) {
              await db.runAsync("UPDATE outbox_messages SET conversation_id = ? WHERE conversation_id = ?", realId, row.conversation_id);
              await db.runAsync("DELETE FROM pending_conversations WHERE id = ?", pendId);
              targetConversationId = realId;
            } else {
              throw new Error('Failed to create conversation');
            }
          } else {
            throw new Error('Pending conversation not found');
          }
        }
        await api.post(`/conversations/${targetConversationId}/messages`, { senderId: row.sender_id, text: row.text });
        await db.runAsync("DELETE FROM outbox_messages WHERE id = ?", row.id);
        sent++;
      } catch (e) {
        const tries = Number(row.tries || 0) + 1;
        await db.runAsync("UPDATE outbox_messages SET tries = ?, last_error = ? WHERE id = ?", tries, String((e as any)?.message || ''), row.id);
      }
    }
    return sent;
  } catch { return 0; }
}

export async function deleteAdmin(userId: number) {
  try {
    if (API_URL) { await api.del(`/admins/${userId}`); return true; }
    await db.runAsync("DELETE FROM users WHERE id = ?", userId);
    return true;
  } catch (err) { console.error('SQLite delete error:', err); return false; }
}

export default db;
