var express = require('express');
var router = express.Router();
var Order = require('../models/OrderModel');
var OrderDetail = require('../models/OrderDetailModel');

//dung chung
var User = require('../models/UserModel');
require('dotenv').config();
const jwt = require('jsonwebtoken');

//utils format time
var { formatDate, numberFormat } = require('../utils/Utility');

//middleware admin (Phân quyền)
const { admin } = require('../middleware/authorize');

router.get('/', admin, async (req, res) => {
    //token user
    var decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    var user = await User.findById(decoded.userId);

    var orders = await Order.find({}).sort({ created_at: 'desc' })
    var totalOrder = 0;
    //session alert
    const message = req.session ? req.session.message : null;
    delete req.session.message; // Xóa thông báo khỏi session

    res.render('admin/order', { title: 'Manage Order', user, message, orders, totalOrder })
})

//search
router.post('/search', admin, async (req, res) => {
    //token user
    var decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    var user = await User.findById(decoded.userId);
    var search = req.body.search
    var orders = await Order.find({
        $or: [
            { email: search}
        ]
    });
    var totalOrder = 0;
    for (var order of orders) {
        var details = await OrderDetail.find({order_id: order._id})
        for(var detail of details) {
            totalOrder += detail.total_money;
        }
    }

    console.log(totalOrder);
    //session alert
    const message = req.session ? req.session.message : null;
    delete req.session.message; // Xóa thông báo khỏi session

    res.render('admin/order', { title: 'Manage Order', user, message, orders, totalOrder})
})

router.get('/detail/:id', admin, async (req, res) => {
    //token user
    var decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    var user = await User.findById(decoded.userId);

    var id = req.params.id;
    var order = await Order.findById({ _id: id })
    var details = await OrderDetail.find({ order_id: id }).populate('product_id')
    res.render('admin/order_detail', { title: 'Order Detail', user, order, details, formatDate, numberFormat})
})

router.get('/delivered/:id', admin, async (req, res) => {
    try {
        var id = req.params.id
        await Order.findByIdAndUpdate(id, { delivery_status: "Delivered", payment_status: "Paid" })
        req.session.message = {
            type: 'success',
            content: 'Order delivered successfully'
        };
        res.redirect('/order')
    } catch (error) {
        req.session.message = {
            type: 'danger',
            content: 'Order delivered failed'
        };
        res.redirect('/order')
    }
})

router.get('/delete/:id', admin, async (req, res) => {
    try {
        var id = req.params.id;
        await OrderDetail.deleteMany({ order_id: id });
        await Order.findByIdAndDelete(id)
        req.session.message = {
            type: 'success',
            content: 'Order deleted successfully'
        };
        res.redirect('/order')
    } catch (error) {
        req.session.message = {
            type: 'danger',
            content: 'Order deleted Failed'
        };
        res.redirect('/order')
    }
})

module.exports = router;
