# MiskWear - Premium Saudi Fashion eCommerce Platform

> منصة تجارة إلكترونية فاخرة للأزياء السعودية — Built with React, Node.js, MySQL

[![Stack](https://img.shields.io/badge/Frontend-React_18_+_Vite-blue)](/)
[![Stack](https://img.shields.io/badge/Backend-Node.js_+_Express-green)](/)
[![Database](https://img.shields.io/badge/Database-MySQL_+_Sequelize-orange)](/)
[![Payments](https://img.shields.io/badge/Payments-Stripe_+_COD_+_Bank-purple)](/)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MySQL 8+
- Cloudinary account
- Stripe account (optional for payments)

### 1. Clone & Setup Backend

```bash
cd backend
cp .env.example .env
# Fill in your .env values
npm install
npm start
```

### 2. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

### 3. Database
The backend auto-creates tables and seeds initial data on first start.

---

## 🏗 Project Structure

```
misk/
├── backend/
│   ├── src/
│   │   ├── config/          # Database, Cloudinary config
│   │   ├── controllers/     # Route handlers
│   │   ├── middleware/      # Auth, error handling
│   │   ├── models/          # Sequelize models (16 models)
│   │   ├── routes/          # Express routes
│   │   └── utils/           # Helpers, email, tokens
│   ├── server.js            # App entry point
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── components/      # Reusable UI components
    │   │   ├── common/      # ProtectedRoute, loaders, etc.
    │   │   ├── layout/      # Header, Footer, AdminLayout
    │   │   ├── cart/        # CartDrawer
    │   │   └── product/     # ProductCard
    │   ├── pages/           # All page components
    │   │   └── admin/       # Admin dashboard pages
    │   ├── store/           # Redux slices
    │   ├── i18n/            # Arabic & English translations
    │   └── utils/           # API client, helpers
    ├── tailwind.config.js
    └── vite.config.js
```

---

## 📦 Features

### 🛍 Customer Features
- Bilingual AR/EN with full RTL support
- Product catalog with advanced filtering
- Product gallery with zoom
- Sizes & colors selection
- Shopping cart with coupon codes
- Wishlist
- Checkout with multiple payment methods
- Order tracking with status timeline
- User dashboard (orders, wishlist, addresses, profile)
- OTP email verification
- Password reset flow

### 💳 Payment Methods
- **Stripe** — Credit/debit cards
- **Cash on Delivery** — COD
- **Bank Transfer** — Manual with reference number

### 🏪 Admin Panel
- Dashboard with analytics & charts
- Orders management with status updates
- Products CRUD with image upload
- Categories & subcategories management
- Coupon system (percentage & fixed)
- Banner/slider management
- Customer management
- Reviews moderation
- Site settings (payments, shipping, tax)
- Dynamic payment method enable/disable

### 🏗 Technical
- JWT authentication with refresh tokens
- Role-based access control
- Cloudinary image uploads
- MySQL with Sequelize ORM (16 models)
- Auto-seeding (categories, admin user, settings)
- Rate limiting & security headers
- SEO-ready with React Helmet

---

## 🎨 Brand Identity

| Property | Value |
|----------|-------|
| Brand | مسك وير / MiskWear |
| Primary Color | #053E4A |
| Accent Color | #F9A703 |
| Arabic Font | Cairo |
| English Font | Poppins |

---

## 🗄 Database Models

| Model | Description |
|-------|-------------|
| User | Customer & admin accounts |
| Role | admin / customer roles |
| Category | 3 main categories |
| Subcategory | 16 subcategories |
| Product | Products with variants |
| ProductImage | Multiple product images |
| ProductVariant | Size/color variants |
| Order | Customer orders |
| OrderItem | Order line items |
| Payment | Payment records |
| Coupon | Discount codes |
| Review | Product reviews |
| Address | Delivery addresses |
| Wishlist | Customer wishlists |
| Cart / CartItem | Shopping cart |
| Notification | User notifications |
| Setting | Site configuration |
| Banner | Homepage banners/sliders |

---

## 🛒 Product Categories

**Women's** (ملابس نسائية)
- Reception Jalabiyat, Outdoor Abayas, Embroidered Abayas
- Open Abayas, Plain Abayas, Dresses, Pajamas, Lingerie, Evening Wear

**Men's** (ملابس رجالي)
- Pants, Shirts, Suits, Tracksuits

**Children's** (ملابس أطفال)
- Outdoor Clothes, Abayas, Pajamas

---

## ⚙️ Environment Variables

See `backend/.env.example` for all required configuration.

---

## 📝 Admin Access

Default admin credentials (change after first login):
- Email: `admin@theboutiqueline.com`
- Password: `Admin@123456`

---

## 🔗 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register |
| POST | /api/auth/login | Login |
| GET | /api/products | List products |
| GET | /api/products/:slug | Product detail |
| GET | /api/categories | All categories |
| POST | /api/cart/add | Add to cart |
| POST | /api/orders | Create order |
| GET | /api/admin/dashboard | Admin stats |

---

Built with ❤️ for the Saudi fashion market.
