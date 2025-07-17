var express = require('express');
var router = express.Router();
var CategoryModel = require('../models/CategoryModel');
var ProductModel = require('../models/ProductModel');
var CartModel = require('../models/CartModel');

//utils format time
var { formatDate, numberFormat } = require('../utils/Utility');

//middleware admin (Phân quyền)
const { admin } = require('../middleware/authorize');

//dung chung
var User = require('../models/UserModel');
require('dotenv').config();
const jwt = require('jsonwebtoken');



/* GET home page. */
router.get('/', admin, async (req, res) => {
  var products = await ProductModel.find({ deleted: 0 }).populate('category').sort({ updated_at: 'desc' }).exec();
  //token user
  var decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
  var user = await User.findById(decoded.userId);
  //session alert
  const message = req.session ? req.session.message : null;
  delete req.session.message; // Xóa thông báo khỏi session
  res.render('admin/show_product', { title: 'Show Product', products, message, formatDate, numberFormat, user});
});

router.post('/search', admin, async (req, res) => {
  var search = req.body.search
  var products = await ProductModel.find({
    $or: [
      { title: new RegExp(search, "i") },
      { 'category.name': new RegExp(search, "i") },
    ]
  }).populate('category');
  //token user
  var decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
  var user = await User.findById(decoded.userId);
  //session alert
  const message = req.session ? req.session.message : null;
  delete req.session.message; // Xóa thông báo khỏi session
  res.render('admin/show_product', { title: 'Show Product', products, message, formatDate, numberFormat, user});
});

// create product
router.get('/add', admin, async (req, res) => {
  //token user
  var decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
  var user = await User.findById(decoded.userId);
  var categories = await CategoryModel.find({});
  //session alert
  const message = req.session ? req.session.message : null;
  delete req.session.message; // Xóa thông báo khỏi session
  var product = { _id: '', title: '', category: '', description: '', image: '', quantity: '', price: '', discount_price: '' };
  res.render('admin/product', { title: "Add Product", categories, product, user, message});
})

router.post('/add', async (req, res) => {
  var product = req.body;
  try {
    if(req.body.discount_price >= req.body.price) {
      req.session.message = {
        type: 'danger',
        content: 'Discount price cannot be greater than price'
      };
      return res.redirect('/product/add');
    }

    if(req.body.category == "-- Select Category --"){
      req.session.message = {
        type: 'danger',
        content: 'Please select category for product!'
      };
      return res.redirect('/product/add');
    }

    await ProductModel.create(product);
    req.session.message = {
      type: 'success',
      content: 'Product added successfully'
    };
  } catch (err) {
    console.error('Error adding product: ', err);
    req.session.message = {
      type: 'danger',
      content: 'Failed to add product'
    };
  }
  res.redirect('/product');
})

// //update product
router.get('/edit/:id', admin, async (req, res) => {
  //token user
  var decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
  var user = await User.findById(decoded.userId);
  //session alert
  const message = req.session ? req.session.message : null;
  delete req.session.message; // Xóa thông báo khỏi session
  const id = req.params.id;
  var categories = await CategoryModel.find({});
  var product = await ProductModel.findById(id).populate('category');
  res.render('admin/product', { title: 'Update Product', categories, product, user});
});

router.post('/edit/:id', async (req, res) => {
  const id = req.params.id;
  var product = req.body;
  // Thêm trường updated_at vào đối tượng product
  product.updated_at = Date.now();
  try {
    if(req.body.discount_price >= req.body.price) {
      req.session.message = {
        type: 'danger',
        content: 'Discount price cannot be greater than price'
      };
      return res.redirect('/product/edit/'+id);
    }

    if(req.body.category == "-- Select Category --"){
      req.session.message = {
        type: 'danger',
        content: 'Please select category for product!'
      };
      return res.redirect('/product/add');
    }

    await ProductModel.findByIdAndUpdate(id, product);
    // Đặt thông báo thành công
    req.session.message = {
      type: 'success',
      content: 'Update product succeed'
    };

    //update product xong phải update lại sản phẩm trong giỏ hàng
    var cart = await CartModel.findOne({ product_id: id });
    if (cart) {
      cart.price = (req.body.discount_price > 0) ? req.body.discount_price : req.body.price;
      cart.total_price = cart.price * cart.quantity;
      await cart.save();
    }

  } catch (err) {
    console.error(err)
    // Đặt thông báo lỗi
    req.session.message = {
      type: 'danger',
      content: 'Update failed'
    };
  }
  res.redirect('/product');
})

//delete category
router.get('/delete/:id', admin, async (req, res) => {
  var id = req.params.id;
  try {
    await ProductModel.findByIdAndUpdate(id, { deleted: 1 });
    req.session.message = {
      type: 'success',
      content: 'Product deleted successfully'
    };

    //xoá sản phẩm thì giỏ hàng cũng mất
    var cart = await CartModel.findOne({ product_id: id });
    if (cart) {
      await cart.remove();
    }

  } catch (err) {
    console.error('Delete product failed. Error: ', err);
    req.session.message = {
      type: 'danger',
      content: 'Failed to delete product'
    };
  }
  res.redirect('/product');
})


module.exports = router;
