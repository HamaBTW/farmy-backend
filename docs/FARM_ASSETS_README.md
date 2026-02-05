# Farmy - Farm Asset System

A comprehensive farm game backend with a unified asset and production system.

## 🌾 Overview

The Farm Asset System provides a flexible architecture for managing farm assets across 5 categories, with a unified production model that allows any asset to produce multiple products.

## 📦 Asset Categories

| Category | Examples | Key Attributes |
|----------|----------|----------------|
| 🐄 **Animal** | Cow, Chicken, Sheep, Bee | lifespan, feed_consumption, habitat |
| 🌱 **Vegetation** | Wheat, Corn, Tomato, Carrot | growth_days, water_needs, soil_type |
| 🌳 **Tree** | Apple Tree, Oak, Olive | growth_years, harvest_season, max_height |
| 🏠 **Structure** | Barn, Silo, Greenhouse | capacity, durability, size |
| 🚜 **Machine** | Tractor, Harvester, Irrigation | speed, efficiency, fuel_type |

## 🔄 Production System

The unified production model connects assets to products:

```
AssetVariant → AssetProduction → ProductType
     (cow)          (10/day)        (milk)
```

**Products include:** Milk, Eggs, Honey, Wool, Meat, Wheat, Apples, Wood, and more.

## 🗄️ Database Schema

```
┌─────────────────┐     ┌─────────────────┐
│   AssetType     │────<│  AssetVariant   │
│  (AnimalType)   │     │ (AnimalVariant) │
└─────────────────┘     └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐      ┌─────────────────┐
                        │ AssetProduction │─────>│   ProductType   │
                        │ (rate, cycle)   │      │ (milk, eggs)    │
                        └─────────────────┘      └─────────────────┘
```

## 🛣️ API Endpoints

### Asset Management
```
GET/POST   /api/v1/assets/:category/types
GET/PUT/DEL /api/v1/assets/:category/types/:id
GET/POST   /api/v1/assets/:category/variants
GET/PUT/DEL /api/v1/assets/:category/variants/:id
```

### Production Management
```
GET/POST   /api/v1/production/products
GET       /api/v1/production/:category/variants/:id/productions
POST      /api/v1/production/:category/variants/:id/productions
```

### Land & Item Requests
```
GET/POST   /api/v1/lands
POST      /api/v1/item-requests (purchase request)
POST      /api/v1/item-requests/:id/approve
POST      /api/v1/item-requests/:id/reject
```

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Run database migrations
npm run migration:run

# Seed initial data
npm run seed

# Start development server
npm run dev
```

## 📁 Project Structure

```
src/
├── models/
│   ├── AssetCategory.ts      # Enums
│   ├── ProductType.ts        # Product definitions
│   ├── AssetProduction.ts    # Variant → Product junction
│   ├── Animal*.ts            # Animal type/variant
│   ├── Vegetation*.ts        # Vegetation type/variant
│   ├── Tree*.ts              # Tree type/variant
│   ├── Structure*.ts         # Structure type/variant
│   ├── Machine*.ts           # Machine type/variant
│   ├── Land.ts               # User land/farm
│   ├── ItemRequest.ts        # Purchase workflow
│   └── PlacedItem.ts         # Items on land
├── services/v1/
├── controllers/v1/
├── routes/v1/
└── validators/v1/
```

## 📄 License

MIT
