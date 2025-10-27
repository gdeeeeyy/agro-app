import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabaseSync("agroappDatabase.db");

(async () => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT,
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
      image TEXT,
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
  `);
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
    const rows = await db.getAllAsync("SELECT * FROM products ORDER BY created_at DESC");
    return rows;
  } catch (err) {
    console.error("SQLite fetch error:", err);
    return [];
  }
}

export async function getProductById(id: number) {
  try {
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
  image?: string;
  stock_available: number;
  cost_per_unit: number;
}) {
  try {
    const result = await db.runAsync(
      "INSERT INTO products (name, plant_used, keywords, details, image, stock_available, cost_per_unit) VALUES (?, ?, ?, ?, ?, ?, ?)",
      product.name,
      product.plant_used,
      product.keywords,
      product.details,
      product.image || null,
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
  image?: string;
  stock_available?: number;
  cost_per_unit?: number;
}) {
  try {
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
    await db.runAsync("DELETE FROM products WHERE id = ?", id);
    return true;
  } catch (err) {
    console.error("SQLite delete error:", err);
    return false;
  }
}

export async function searchProducts(keywords: string) {
  try {
    const searchTerm = `%${keywords.toLowerCase()}%`;
    const rows = await db.getAllAsync(
      "SELECT * FROM products WHERE LOWER(name) LIKE ? OR LOWER(plant_used) LIKE ? OR LOWER(keywords) LIKE ? OR LOWER(details) LIKE ? ORDER BY created_at DESC",
      searchTerm, searchTerm, searchTerm, searchTerm
    );
    return rows;
  } catch (err) {
    console.error("SQLite search error:", err);
    return [];
  }
}

export async function findProductsByKeywords(analysisKeywords: string[]) {
  try {
    if (analysisKeywords.length === 0) return [];
    
    // Create a more sophisticated keyword matching
    const keywordConditions = analysisKeywords.map(() => 
      "LOWER(keywords) LIKE ? OR LOWER(name) LIKE ? OR LOWER(plant_used) LIKE ? OR LOWER(details) LIKE ?"
    ).join(' OR ');
    
    const searchTerms = analysisKeywords.flatMap(keyword => {
      const term = `%${keyword.toLowerCase()}%`;
      return [term, term, term, term]; // For each keyword, search in 4 fields
    });
    
    const query = `
      SELECT *, 
      (
        CASE 
          WHEN LOWER(keywords) LIKE ? THEN 4
          WHEN LOWER(name) LIKE ? THEN 3
          WHEN LOWER(plant_used) LIKE ? THEN 2
          WHEN LOWER(details) LIKE ? THEN 1
          ELSE 0
        END
      ) as relevance_score
      FROM products 
      WHERE ${keywordConditions}
      ORDER BY relevance_score DESC, created_at DESC
      LIMIT 10
    `;
    
    // Add primary keyword for relevance scoring
    const primaryKeyword = `%${analysisKeywords[0].toLowerCase()}%`;
    const finalSearchTerms = [primaryKeyword, primaryKeyword, primaryKeyword, primaryKeyword, ...searchTerms];
    
    const rows = await db.getAllAsync(query, ...finalSearchTerms);
    return rows;
  } catch (err) {
    console.error("SQLite keyword matching error:", err);
    return [];
  }
}

// Cart functions
export async function getCartItems(userId: number) {
  try {
    const rows = await db.getAllAsync(
      `SELECT ci.*, p.name, p.image, p.cost_per_unit, p.stock_available 
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
    await db.runAsync("DELETE FROM cart_items WHERE user_id = ?", userId);
    return true;
  } catch (err) {
    console.error("SQLite delete error:", err);
    return false;
  }
}

export async function getCartTotal(userId: number) {
  try {
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
export async function createOrder(userId: number, paymentMethod: string) {
  try {
    // Get cart items
    const cartItems = await getCartItems(userId);
    if (cartItems.length === 0) {
      throw new Error('Cart is empty');
    }

    // Calculate total
    const total = await getCartTotal(userId);

    // Create order
    const orderResult = await db.runAsync(
      "INSERT INTO orders (user_id, total_amount, payment_method, status) VALUES (?, ?, ?, ?)",
      userId, total, paymentMethod, 'pending'
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
  deliveryDate?: string
) {
  try {
    const fields: string[] = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
    const values: any[] = [status];

    if (statusNote !== undefined) {
      fields.push('status_note = ?');
      values.push(statusNote);
    }

    if (deliveryDate !== undefined) {
      fields.push('delivery_date = ?');
      values.push(deliveryDate);
    }

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
    await db.runAsync("DELETE FROM orders WHERE id = ?", orderId);
    return true;
  } catch (err) {
    console.error("SQLite delete error:", err);
    return false;
  }
}

// Keyword functions
export async function getAllKeywords() {
  try {
    const rows = await db.getAllAsync("SELECT * FROM keywords ORDER BY name ASC");
    return rows;
  } catch (err) {
    console.error("SQLite fetch error:", err);
    return [];
  }
}

export async function addKeyword(name: string) {
  try {
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
    await db.runAsync("DELETE FROM keywords WHERE id = ?", id);
    return true;
  } catch (err) {
    console.error("SQLite delete error:", err);
    return false;
  }
}

export async function getProductsByKeyword(keyword: string) {
  try {
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

export default db;
