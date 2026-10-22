const db = require('../database/db');

async function listProducts(req, res, next) {
  try {
    const products = await db.getAllProducts();
    res.json({
      success: true,
      data: products
    });
  } catch (err) {
    next(err);
  }
}

async function createProduct(req, res, next) {
  try {
    const { id, name, stock } = req.body;
    if (!id || !name || stock === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: id, name, and stock are mandatory'
      });
    }

    const parsedStock = parseInt(stock, 10);
    if (isNaN(parsedStock) || parsedStock < 0) {
      return res.status(400).json({
        success: false,
        error: 'Stock must be a non-negative integer'
      });
    }

    const created = await db.createProduct({
      id: String(id).trim(),
      name: String(name).trim(),
      stock: parsedStock
    });

    res.status(201).json({
      success: true,
      data: created
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listProducts,
  createProduct
};
