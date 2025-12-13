const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
require("dotenv").config();


const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0
});








app.get("/bills", (req, res) => {
  db.query("SELECT * FROM bills ORDER BY id DESC", (err, data) => {
    if (err) return res.status(500).json({ success: false, error: err });
    res.json({ success: true, bills: data });
  });
});

app.get("/", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.send("Backend running & DB connected ✅");
  } catch (err) {
    res.status(500).json({ error: "DB connection failed", details: err.message });
  }
});

// ================= STOCK =================

app.get("/stock", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM stock");
    res.json(rows);
  } catch (err) {
    res.status(500).json(err);
  }
});

app.post("/stock", async (req, res) => {
  const { name, quantity, price } = req.body;
  try {
    await db.query(
      "INSERT INTO stock (name, quantity, price) VALUES (?, ?, ?)",
      [name, quantity, price]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json(err);
  }
});

app.put("/stock/:id", (req, res) => {
  const { quantity, price } = req.body;
  db.query(
    "UPDATE stock SET quantity=?, price=? WHERE id=?",
    [quantity, price, req.params.id],
    (err) => {
      if (err) return res.json(err);
      res.json("Updated");
    }
  );
});

app.delete("/stock/:id", (req, res) => {
  db.query("DELETE FROM stock WHERE id=?", [req.params.id], (err) => {
    if (err) return res.json(err);
    res.json("Deleted");
  });
});

app.post("/update-stock", (req, res) => {
  const cartItems = req.body.cart;

  if (!Array.isArray(cartItems)) {
    console.log("❌ Invalid cart:", req.body);
    return res.status(400).json({ success: false, error: "Invalid cart data" });
  }

  let updateCount = 0;

  cartItems.forEach((item, index) => {
    db.query(
      "UPDATE stock SET quantity = quantity - ? WHERE id = ?",
      [item.quantity, item.id],
      (err) => {
        if (err) {
          console.log("❌ DB update error:", err);
          return res.status(500).json({ success: false, error: err });
        }

        updateCount++;

        if (updateCount === cartItems.length) {
          res.json({ success: true });
        }
      }
    );
  });
});

app.post("/create-bill", (req, res) => {
  const { customerName, cart, total } = req.body;
  

  for (let item of cart) {
    if (item.quantity > item.stock) {
      return res.json({
        success: false,
        message: `Out of stock: ${item.name}, only ${item.stock} left`,
      });
    }
  }
  for (let item of cart) {
    if (item.quantity > item.stock) {
      return res.json({
        success: false,
        message: `Out of stock: ${item.name}, only ${item.stock} left`,
      });
    }
  }

  db.query(
    "INSERT INTO bills (customer_name, cart,  total) VALUES (?, ?, ?)",
    [customerName, JSON.stringify(cart), total],
    (err, result) => {
      if (err) return res.status(500).json({ success: false, error: err });

      const billNumber = result.insertId; // 🔥 auto-generated unique number
      res.json({ success: true, billNumber });

      
    }
  );
});
app.post("/save-bill", (req, res) => {
  const { customer, total, payment } = req.body;

  const pending = total - payment;

  db.query(
    "INSERT INTO bills (customer_name, total, payment_amount, pending_amount) VALUES (?, ?, ?, ?)",
    [customer, total, payment, pending],
    (err) => {
      if (err) return res.status(500).json({ success: false, error: err });
      res.json({ success: true });
    }
  );
});
app.put("/update-payment/:id", (req, res) => {
  const { payment, total, cart } = req.body;

  const pending = total - payment;

  db.query(
    "UPDATE bills SET total=?, payment_amount=?, cart=?, pending_amount=? WHERE id=?",
    [total, payment, JSON.stringify(cart), pending, req.params.id],
    (err, id) => {
       if (err) return res.status(500).json({ success: false, error: err });

      const billNumber = id; // 🔥 auto-generated unique number
      res.json({ success: true, billNumber });
    }
  );
})
app.delete("/update-payment/:id", (req, res) => {
  db.query("DELETE FROM bills WHERE id=?", [req.params.id], (err) => {
    if (err) return res.json(err);
    res.json("Deleted");
  });
});
//save darft

app.post("/save-draft", (req, res) => {
  const { customer, cart, total } = req.body;

  db.query(
    "INSERT INTO draft_bills (customer_name, cart, total) VALUES (?, ?, ?)",
    [customer, JSON.stringify(cart), total],
    (err) => {
      if (err) return res.status(500).json({ success: false, error: err });
      res.json({ success: true });
    }
  );
});

app.get("/drafts", (req, res) => {
  db.query("SELECT * FROM draft_bills ORDER BY id DESC", (err, data) => {
    if (err) return res.status(500).json({ success: false });
    res.json({ success: true, drafts: data });
  });
});

app.delete("/drafts/:id", (req, res) => {
  db.query("DELETE FROM draft_bills WHERE id=?", [req.params.id], (err) => {
    if (err) return res.json({ success: false });
    res.json({ success: true });
  });
});





const PORT = process.env.PORT || 5000;
module.exports = app;

