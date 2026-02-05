-- Farm Asset System Seed Data
-- Run after database migrations

-- ============================================
-- PRODUCT TYPES
-- ============================================
INSERT INTO product_types (id, name, unit, description, is_active, createdAt, updatedAt) VALUES
(UUID(), 'Milk', 'liters', 'Fresh dairy milk', 1, NOW(), NOW()),
(UUID(), 'Eggs', 'units', 'Farm fresh eggs', 1, NOW(), NOW()),
(UUID(), 'Honey', 'kg', 'Natural honey', 1, NOW(), NOW()),
(UUID(), 'Wool', 'kg', 'Sheep wool', 1, NOW(), NOW()),
(UUID(), 'Meat', 'kg', 'Animal meat', 1, NOW(), NOW()),
(UUID(), 'Wheat', 'kg', 'Harvested wheat grain', 1, NOW(), NOW()),
(UUID(), 'Corn', 'kg', 'Sweet corn', 1, NOW(), NOW()),
(UUID(), 'Tomatoes', 'kg', 'Fresh tomatoes', 1, NOW(), NOW()),
(UUID(), 'Apples', 'units', 'Fresh apples', 1, NOW(), NOW()),
(UUID(), 'Olives', 'kg', 'Olive fruit', 1, NOW(), NOW()),
(UUID(), 'Wood', 'logs', 'Timber logs', 1, NOW(), NOW()),
(UUID(), 'Manure', 'kg', 'Organic fertilizer', 1, NOW(), NOW());

-- ============================================
-- ANIMAL TYPES
-- ============================================
INSERT INTO animal_types (id, name, description, icon_url, is_active, createdAt, updatedAt) VALUES
(UUID(), 'Cow', 'Dairy and beef cattle', '/icons/cow.png', 1, NOW(), NOW()),
(UUID(), 'Chicken', 'Poultry for eggs and meat', '/icons/chicken.png', 1, NOW(), NOW()),
(UUID(), 'Sheep', 'Wool and meat production', '/icons/sheep.png', 1, NOW(), NOW()),
(UUID(), 'Goat', 'Milk and meat', '/icons/goat.png', 1, NOW(), NOW()),
(UUID(), 'Pig', 'Pork production', '/icons/pig.png', 1, NOW(), NOW()),
(UUID(), 'Bee', 'Honey production', '/icons/bee.png', 1, NOW(), NOW());

-- ============================================
-- VEGETATION TYPES
-- ============================================
INSERT INTO vegetation_types (id, name, description, icon_url, is_active, createdAt, updatedAt) VALUES
(UUID(), 'Wheat', 'Cereal grain crop', '/icons/wheat.png', 1, NOW(), NOW()),
(UUID(), 'Corn', 'Maize crop', '/icons/corn.png', 1, NOW(), NOW()),
(UUID(), 'Tomato', 'Vegetable crop', '/icons/tomato.png', 1, NOW(), NOW()),
(UUID(), 'Carrot', 'Root vegetable', '/icons/carrot.png', 1, NOW(), NOW()),
(UUID(), 'Potato', 'Starch crop', '/icons/potato.png', 1, NOW(), NOW());

-- ============================================
-- TREE TYPES
-- ============================================
INSERT INTO tree_types (id, name, description, icon_url, is_active, createdAt, updatedAt) VALUES
(UUID(), 'Apple Tree', 'Fruit tree for apples', '/icons/apple-tree.png', 1, NOW(), NOW()),
(UUID(), 'Olive Tree', 'Mediterranean olive tree', '/icons/olive-tree.png', 1, NOW(), NOW()),
(UUID(), 'Oak Tree', 'Hardwood timber tree', '/icons/oak-tree.png', 1, NOW(), NOW()),
(UUID(), 'Pine Tree', 'Softwood timber tree', '/icons/pine-tree.png', 1, NOW(), NOW()),
(UUID(), 'Orange Tree', 'Citrus fruit tree', '/icons/orange-tree.png', 1, NOW(), NOW());

-- ============================================
-- STRUCTURE TYPES
-- ============================================
INSERT INTO structure_types (id, name, description, icon_url, is_active, createdAt, updatedAt) VALUES
(UUID(), 'Barn', 'Animal housing', '/icons/barn.png', 1, NOW(), NOW()),
(UUID(), 'Silo', 'Grain storage', '/icons/silo.png', 1, NOW(), NOW()),
(UUID(), 'Greenhouse', 'Protected growing area', '/icons/greenhouse.png', 1, NOW(), NOW()),
(UUID(), 'Well', 'Water source', '/icons/well.png', 1, NOW(), NOW()),
(UUID(), 'Fence', 'Land boundary', '/icons/fence.png', 1, NOW(), NOW());

-- ============================================
-- MACHINE TYPES
-- ============================================
INSERT INTO machine_types (id, name, description, icon_url, is_active, createdAt, updatedAt) VALUES
(UUID(), 'Tractor', 'Multi-purpose farm vehicle', '/icons/tractor.png', 1, NOW(), NOW()),
(UUID(), 'Harvester', 'Crop harvesting machine', '/icons/harvester.png', 1, NOW(), NOW()),
(UUID(), 'Irrigation System', 'Automated watering', '/icons/irrigation.png', 1, NOW(), NOW()),
(UUID(), 'Plow', 'Soil preparation', '/icons/plow.png', 1, NOW(), NOW());

-- ============================================
-- Note: Variants and Productions need type IDs
-- Use the JSON file for programmatic seeding
-- ============================================
