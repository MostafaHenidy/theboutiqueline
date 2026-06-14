const sequelize = require('../config/database');
const User = require('./User');
const Role = require('./Role');
const Category = require('./Category');
const Subcategory = require('./Subcategory');
const Product = require('./Product');
const ProductImage = require('./ProductImage');
const ProductVariant = require('./ProductVariant');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const Payment = require('./Payment');
const Coupon = require('./Coupon');
const Review = require('./Review');
const Address = require('./Address');
const Wishlist = require('./Wishlist');
const Cart = require('./Cart');
const CartItem = require('./CartItem');
const Notification = require('./Notification');
const Setting = require('./Setting');
const Banner = require('./Banner');
const NavLink = require('./NavLink');
const LandingPage = require('./LandingPage');
const LandingPageSection = require('./LandingPageSection');
const LandingPageView = require('./LandingPageView');
const LandingPageOrder = require('./LandingPageOrder');
const MarketingIntegration = require('./MarketingIntegration');
const MarketingIntegrationSetting = require('./MarketingIntegrationSetting');
const MarketingEventLog = require('./MarketingEventLog');
const MarketingFailedEvent = require('./MarketingFailedEvent');
const MarketingRetryQueue = require('./MarketingRetryQueue');
const MarketingBulkJob = require('./MarketingBulkJob');
const WhatsAppIntegration = require('./WhatsAppIntegration');
const StoreSession = require('./StoreSession');
const StoreEvent = require('./StoreEvent');

// User - Role
User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
Role.hasMany(User, { foreignKey: 'role_id', as: 'users' });

// Category - Subcategory
Category.hasMany(Subcategory, { foreignKey: 'category_id', as: 'subcategories' });
Subcategory.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });
Subcategory.belongsTo(Subcategory, { foreignKey: 'parent_id', as: 'parent' });
Subcategory.hasMany(Subcategory, { foreignKey: 'parent_id', as: 'children' });

// Category/Subcategory - Product
Category.hasMany(Product, { foreignKey: 'category_id', as: 'products' });
Product.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });
Subcategory.hasMany(Product, { foreignKey: 'subcategory_id', as: 'products' });
Product.belongsTo(Subcategory, { foreignKey: 'subcategory_id', as: 'subcategory' });

// Product - ProductImage
Product.hasMany(ProductImage, { foreignKey: 'product_id', as: 'images' });
ProductImage.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Product - ProductVariant
Product.hasMany(ProductVariant, { foreignKey: 'product_id', as: 'variants' });
ProductVariant.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// User - Order
User.hasMany(Order, { foreignKey: 'user_id', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Order - OrderItem
Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
Product.hasMany(OrderItem, { foreignKey: 'product_id', as: 'order_items' });
OrderItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Order - Payment
Order.hasOne(Payment, { foreignKey: 'order_id', as: 'payment' });
Payment.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// User - Review
User.hasMany(Review, { foreignKey: 'user_id', as: 'reviews' });
Review.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Product.hasMany(Review, { foreignKey: 'product_id', as: 'reviews' });
Review.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// User - Address
User.hasMany(Address, { foreignKey: 'user_id', as: 'addresses' });
Address.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User - Wishlist
User.hasMany(Wishlist, { foreignKey: 'user_id', as: 'wishlists' });
Wishlist.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Product.hasMany(Wishlist, { foreignKey: 'product_id', as: 'wishlists' });
Wishlist.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// User - Cart
User.hasOne(Cart, { foreignKey: 'user_id', as: 'cart' });
Cart.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Cart.hasMany(CartItem, { foreignKey: 'cart_id', as: 'items' });
CartItem.belongsTo(Cart, { foreignKey: 'cart_id', as: 'cart' });
Product.hasMany(CartItem, { foreignKey: 'product_id', as: 'cart_items' });
CartItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// User - Notification
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Order - Coupon
Coupon.hasMany(Order, { foreignKey: 'coupon_id', as: 'orders' });
Order.belongsTo(Coupon, { foreignKey: 'coupon_id', as: 'coupon' });

// LandingPage - Product
LandingPage.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
Product.hasMany(LandingPage, { foreignKey: 'product_id', as: 'landing_pages' });

// LandingPage - LandingPageSection
LandingPage.hasMany(LandingPageSection, { foreignKey: 'landing_page_id', as: 'sections' });
LandingPageSection.belongsTo(LandingPage, { foreignKey: 'landing_page_id', as: 'page' });

// LandingPage - LandingPageView
LandingPage.hasMany(LandingPageView, { foreignKey: 'landing_page_id', as: 'views' });
LandingPageView.belongsTo(LandingPage, { foreignKey: 'landing_page_id', as: 'page' });

// LandingPage - LandingPageOrder
LandingPage.hasMany(LandingPageOrder, { foreignKey: 'landing_page_id', as: 'conversions' });
LandingPageOrder.belongsTo(LandingPage, { foreignKey: 'landing_page_id', as: 'page' });

// Store analytics
User.hasMany(StoreSession, { foreignKey: 'user_id', as: 'store_sessions' });
StoreSession.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
StoreSession.hasMany(StoreEvent, { foreignKey: 'session_id', sourceKey: 'session_id', as: 'events' });
StoreEvent.belongsTo(StoreSession, { foreignKey: 'session_id', targetKey: 'session_id', as: 'session' });

// Marketing integrations module
MarketingIntegration.hasMany(MarketingIntegrationSetting, { foreignKey: 'marketing_integration_id', as: 'settings' });
MarketingIntegrationSetting.belongsTo(MarketingIntegration, { foreignKey: 'marketing_integration_id', as: 'integration' });
MarketingIntegration.hasMany(MarketingEventLog, { foreignKey: 'marketing_integration_id', as: 'event_logs' });
MarketingEventLog.belongsTo(MarketingIntegration, { foreignKey: 'marketing_integration_id', as: 'integration' });

module.exports = {
  sequelize,
  User, Role, Category, Subcategory, Product, ProductImage, ProductVariant,
  Order, OrderItem, Payment, Coupon, Review, Address, Wishlist,
  Cart, CartItem, Notification, Setting, Banner, NavLink,
  LandingPage, LandingPageSection, LandingPageView, LandingPageOrder,
  StoreSession, StoreEvent,
  MarketingIntegration, MarketingIntegrationSetting, MarketingEventLog,
  MarketingFailedEvent, MarketingRetryQueue, MarketingBulkJob,
  WhatsAppIntegration,
};
