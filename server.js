import express from "express";
import { neon } from "@neondatabase/serverless";

const app = express();
const PORT = process.env.PORT || 3000;

// Koneksi database Neon
const sql = process.env.DATABASE_URL
  ? neon(process.env.DATABASE_URL)
  : null;

// Middleware
app.use(express.json({ limit: "20kb" }));
app.use(express.static("public"));

// Memastikan database sudah terhubung
function checkDatabase(req, res, next) {
  if (!sql) {
    return res.status(500).json({
      error: "DATABASE_URL belum diatur di Render."
    });
  }

  next();
}

// GET: Mengambil dan mencari produk
app.get("/api/products", checkDatabase, async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();

    const products = await sql`
      SELECT id, name, price, stock
      FROM products
      WHERE name ILIKE ${"%" + q + "%"}
      ORDER BY id DESC
    `;

    res.json(products);

  } catch (error) {
    console.error("GET error:", error.message);

    res.status(500).json({
      error: "Gagal mengambil data produk."
    });
  }
});

// POST: Menambahkan produk
app.post("/api/products", checkDatabase, async (req, res) => {
  try {
    const { name, price, stock } = req.body || {};

    if (
      typeof name !== "string" ||
      !name.trim() ||
      !Number.isSafeInteger(price) ||
      !Number.isSafeInteger(stock) ||
      price < 0 ||
      stock < 0
    ) {
      return res.status(400).json({
        error: "Nama, harga, atau stok tidak valid."
      });
    }

    const result = await sql`
      INSERT INTO products (name, price, stock)
      VALUES (${name.trim()}, ${price}, ${stock})
      RETURNING *
    `;

    res.status(201).json(result[0]);

  } catch (error) {
    console.error("POST error:", error.message);

    res.status(500).json({
      error: "Gagal menambahkan produk."
    });
  }
});

// PUT: Mengedit produk
app.put("/api/products/:id", checkDatabase, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, price, stock } = req.body || {};

    if (
      !Number.isSafeInteger(id) ||
      id < 1 ||
      typeof name !== "string" ||
      !name.trim() ||
      !Number.isSafeInteger(price) ||
      !Number.isSafeInteger(stock) ||
      price < 0 ||
      stock < 0
    ) {
      return res.status(400).json({
        error: "Data produk tidak valid."
      });
    }

    const result = await sql`
      UPDATE products
      SET name = ${name.trim()},
          price = ${price},
          stock = ${stock}
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return res.status(404).json({
        error: "Produk tidak ditemukan."
      });
    }

    res.json(result[0]);

  } catch (error) {
    console.error("PUT error:", error.message);

    res.status(500).json({
      error: "Gagal mengubah produk."
    });
  }
});

// DELETE: Menghapus produk
app.delete("/api/products/:id", checkDatabase, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({
        error: "ID produk tidak valid."
      });
    }

    const result = await sql`
      DELETE FROM products
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return res.status(404).json({
        error: "Produk tidak ditemukan."
      });
    }

    res.json({
      message: "Produk berhasil dihapus."
    });

  } catch (error) {
    console.error("DELETE error:", error.message);

    res.status(500).json({
      error: "Gagal menghapus produk."
    });
  }
});

// Menjalankan server
app.listen(PORT, () => {
  console.log(`NEX Database Lab berjalan di port ${PORT}`);
});
