-- Farm Asset System - Complete Seed Data
-- MySQL Compatible - Run after migrations

-- ============================================
-- PRODUCT TYPES
-- ============================================
INSERT INTO product_types (id, name, unit, description, is_active, createdAt, updatedAt) VALUES
('11111111-1111-1111-1111-111111111001', 'Milk', 'liters', 'Fresh dairy milk', 1, NOW(), NOW()),
('11111111-1111-1111-1111-111111111002', 'Eggs', 'units', 'Farm fresh eggs', 1, NOW(), NOW()),
('11111111-1111-1111-1111-111111111003', 'Honey', 'kg', 'Natural honey', 1, NOW(), NOW()),
('11111111-1111-1111-1111-111111111004', 'Wool', 'kg', 'Sheep wool', 1, NOW(), NOW()),
('11111111-1111-1111-1111-111111111005', 'Meat', 'kg', 'Animal meat', 1, NOW(), NOW()),
('11111111-1111-1111-1111-111111111006', 'Wheat', 'kg', 'Harvested wheat grain', 1, NOW(), NOW()),
('11111111-1111-1111-1111-111111111007', 'Corn', 'kg', 'Sweet corn', 1, NOW(), NOW()),
('11111111-1111-1111-1111-111111111008', 'Tomatoes', 'kg', 'Fresh tomatoes', 1, NOW(), NOW()),
('11111111-1111-1111-1111-111111111009', 'Apples', 'units', 'Fresh apples', 1, NOW(), NOW()),
('11111111-1111-1111-1111-111111111010', 'Olives', 'kg', 'Olive fruit', 1, NOW(), NOW()),
('11111111-1111-1111-1111-111111111011', 'Wood', 'logs', 'Timber logs', 1, NOW(), NOW()),
('11111111-1111-1111-1111-111111111012', 'Manure', 'kg', 'Organic fertilizer', 1, NOW(), NOW());

-- ============================================
-- ANIMAL TYPES & VARIANTS
-- ============================================
INSERT INTO animal_types (id, name, description, icon_url, is_active, createdAt, updatedAt) VALUES
('22222222-2222-2222-2222-222222222001', 'Cow', 'Dairy and beef cattle', '/icons/animals/cow.png', 1, NOW(), NOW()),
('22222222-2222-2222-2222-222222222002', 'Chicken', 'Poultry for eggs and meat', '/icons/animals/chicken.png', 1, NOW(), NOW()),
('22222222-2222-2222-2222-222222222003', 'Sheep', 'Wool and meat production', '/icons/animals/sheep.png', 1, NOW(), NOW()),
('22222222-2222-2222-2222-222222222004', 'Goat', 'Milk and meat', '/icons/animals/goat.png', 1, NOW(), NOW()),
('22222222-2222-2222-2222-222222222005', 'Pig', 'Pork production', '/icons/animals/pig.png', 1, NOW(), NOW()),
('22222222-2222-2222-2222-222222222006', 'Bee', 'Honey production', '/icons/animals/bee.png', 1, NOW(), NOW());

INSERT INTO animal_variants (id, type_id, variant_code, base_price, attributes, image_url, is_available, createdAt, updatedAt) VALUES
('33333333-3333-3333-3333-333333333001', '22222222-2222-2222-2222-222222222001', 'cow_dairy_jersey', 1500.00, '{"lifespan_days": 3650, "feed_consumption": 5, "mature_age_days": 365, "size_width": 2, "size_height": 2, "habitat": "pasture"}', '/images/animals/cow_jersey.png', 1, NOW(), NOW()),
('33333333-3333-3333-3333-333333333002', '22222222-2222-2222-2222-222222222001', 'cow_dairy_holstein', 2000.00, '{"lifespan_days": 4000, "feed_consumption": 6, "mature_age_days": 400, "size_width": 2, "size_height": 2, "habitat": "pasture"}', '/images/animals/cow_holstein.png', 1, NOW(), NOW()),
('33333333-3333-3333-3333-333333333003', '22222222-2222-2222-2222-222222222002', 'chicken_layer', 50.00, '{"lifespan_days": 730, "feed_consumption": 0.2, "mature_age_days": 120, "size_width": 1, "size_height": 1, "habitat": "coop"}', '/images/animals/chicken_layer.png', 1, NOW(), NOW()),
('33333333-3333-3333-3333-333333333004', '22222222-2222-2222-2222-222222222002', 'chicken_broiler', 40.00, '{"lifespan_days": 365, "feed_consumption": 0.3, "mature_age_days": 60, "size_width": 1, "size_height": 1, "habitat": "coop"}', '/images/animals/chicken_broiler.png', 1, NOW(), NOW()),
('33333333-3333-3333-3333-333333333005', '22222222-2222-2222-2222-222222222003', 'sheep_merino', 800.00, '{"lifespan_days": 3650, "feed_consumption": 2, "mature_age_days": 365, "size_width": 2, "size_height": 1, "habitat": "pasture"}', '/images/animals/sheep_merino.png', 1, NOW(), NOW()),
('33333333-3333-3333-3333-333333333006', '22222222-2222-2222-2222-222222222006', 'bee_honeybee', 300.00, '{"lifespan_days": 180, "feed_consumption": 0, "mature_age_days": 21, "size_width": 1, "size_height": 1, "habitat": "hive"}', '/images/animals/bee_hive.png', 1, NOW(), NOW());

-- ============================================
-- VEGETATION TYPES & VARIANTS
-- ============================================
INSERT INTO vegetation_types (id, name, description, icon_url, is_active, createdAt, updatedAt) VALUES
('44444444-4444-4444-4444-444444444001', 'Wheat', 'Cereal grain crop', '/icons/vegetation/wheat.png', 1, NOW(), NOW()),
('44444444-4444-4444-4444-444444444002', 'Corn', 'Maize crop', '/icons/vegetation/corn.png', 1, NOW(), NOW()),
('44444444-4444-4444-4444-444444444003', 'Tomato', 'Vegetable crop', '/icons/vegetation/tomato.png', 1, NOW(), NOW()),
('44444444-4444-4444-4444-444444444004', 'Carrot', 'Root vegetable', '/icons/vegetation/carrot.png', 1, NOW(), NOW()),
('44444444-4444-4444-4444-444444444005', 'Potato', 'Starch crop', '/icons/vegetation/potato.png', 1, NOW(), NOW());

INSERT INTO vegetation_variants (id, type_id, variant_code, base_price, attributes, image_url, is_available, createdAt, updatedAt) VALUES
('55555555-5555-5555-5555-555555555001', '44444444-4444-4444-4444-444444444001', 'wheat_winter', 10.00, '{"growth_days": 90, "water_needs": 3, "soil_type": "loam", "planting_season": "fall", "size_width": 1, "size_height": 1, "is_perennial": false}', '/images/vegetation/wheat_winter.png', 1, NOW(), NOW()),
('55555555-5555-5555-5555-555555555002', '44444444-4444-4444-4444-444444444001', 'wheat_spring', 12.00, '{"growth_days": 75, "water_needs": 4, "soil_type": "loam", "planting_season": "spring", "size_width": 1, "size_height": 1, "is_perennial": false}', '/images/vegetation/wheat_spring.png', 1, NOW(), NOW()),
('55555555-5555-5555-5555-555555555003', '44444444-4444-4444-4444-444444444002', 'corn_sweet', 15.00, '{"growth_days": 80, "water_needs": 5, "soil_type": "loam", "planting_season": "spring", "size_width": 1, "size_height": 1, "is_perennial": false}', '/images/vegetation/corn_sweet.png', 1, NOW(), NOW()),
('55555555-5555-5555-5555-555555555004', '44444444-4444-4444-4444-444444444003', 'tomato_cherry', 20.00, '{"growth_days": 60, "water_needs": 6, "soil_type": "sandy", "planting_season": "spring", "size_width": 1, "size_height": 1, "is_perennial": false}', '/images/vegetation/tomato_cherry.png', 1, NOW(), NOW());

-- ============================================
-- TREE TYPES & VARIANTS
-- ============================================
INSERT INTO tree_types (id, name, description, icon_url, is_active, createdAt, updatedAt) VALUES
('66666666-6666-6666-6666-666666666001', 'Apple Tree', 'Fruit tree for apples', '/icons/trees/apple-tree.png', 1, NOW(), NOW()),
('66666666-6666-6666-6666-666666666002', 'Olive Tree', 'Mediterranean olive tree', '/icons/trees/olive-tree.png', 1, NOW(), NOW()),
('66666666-6666-6666-6666-666666666003', 'Oak Tree', 'Hardwood timber tree', '/icons/trees/oak-tree.png', 1, NOW(), NOW()),
('66666666-6666-6666-6666-666666666004', 'Pine Tree', 'Softwood timber tree', '/icons/trees/pine-tree.png', 1, NOW(), NOW()),
('66666666-6666-6666-6666-666666666005', 'Orange Tree', 'Citrus fruit tree', '/icons/trees/orange-tree.png', 1, NOW(), NOW());

INSERT INTO tree_variants (id, type_id, variant_code, base_price, attributes, image_url, is_available, createdAt, updatedAt) VALUES
('77777777-7777-7777-7777-777777777001', '66666666-6666-6666-6666-666666666001', 'apple_red_delicious', 200.00, '{"growth_years": 4, "harvest_season": "fall", "max_height": 8, "water_needs": 5, "size_width": 1, "size_height": 1, "lifespan_years": 50}', '/images/trees/apple_red.png', 1, NOW(), NOW()),
('77777777-7777-7777-7777-777777777002', '66666666-6666-6666-6666-666666666001', 'apple_granny_smith', 180.00, '{"growth_years": 3, "harvest_season": "fall", "max_height": 6, "water_needs": 4, "size_width": 1, "size_height": 1, "lifespan_years": 40}', '/images/trees/apple_green.png', 1, NOW(), NOW()),
('77777777-7777-7777-7777-777777777003', '66666666-6666-6666-6666-666666666002', 'olive_kalamata', 350.00, '{"growth_years": 5, "harvest_season": "fall", "max_height": 10, "water_needs": 3, "size_width": 1, "size_height": 1, "lifespan_years": 100}', '/images/trees/olive.png', 1, NOW(), NOW()),
('77777777-7777-7777-7777-777777777004', '66666666-6666-6666-6666-666666666003', 'oak_english', 500.00, '{"growth_years": 20, "harvest_season": "winter", "max_height": 25, "water_needs": 4, "size_width": 1, "size_height": 1, "lifespan_years": 300}', '/images/trees/oak.png', 1, NOW(), NOW());

-- ============================================
-- STRUCTURE TYPES & VARIANTS
-- ============================================
INSERT INTO structure_types (id, name, description, icon_url, is_active, createdAt, updatedAt) VALUES
('88888888-8888-8888-8888-888888888001', 'Barn', 'Animal housing', '/icons/structure/barn.png', 1, NOW(), NOW()),
('88888888-8888-8888-8888-888888888002', 'Silo', 'Grain storage', '/icons/structure/silo.png', 1, NOW(), NOW()),
('88888888-8888-8888-8888-888888888003', 'Greenhouse', 'Protected growing area', '/icons/structure/greenhouse.png', 1, NOW(), NOW()),
('88888888-8888-8888-8888-888888888004', 'Well', 'Water source', '/icons/structure/well.png', 1, NOW(), NOW()),
('88888888-8888-8888-8888-888888888005', 'Fence', 'Land boundary', '/icons/structure/fence.png', 1, NOW(), NOW());

INSERT INTO structure_variants (id, type_id, variant_code, base_price, attributes, image_url, is_available, createdAt, updatedAt) VALUES
('99999999-9999-9999-9999-999999999001', '88888888-8888-8888-8888-888888888001', 'barn_small', 5000.00, '{"capacity": 10, "durability": 100, "size_width": 4, "size_height": 4, "upgrade_level": 1, "max_upgrade": 3}', '/images/structure/barn_small.png', 1, NOW(), NOW()),
('99999999-9999-9999-9999-999999999002', '88888888-8888-8888-8888-888888888001', 'barn_large', 15000.00, '{"capacity": 30, "durability": 150, "size_width": 6, "size_height": 6, "upgrade_level": 1, "max_upgrade": 3}', '/images/structure/barn_large.png', 1, NOW(), NOW()),
('99999999-9999-9999-9999-999999999003', '88888888-8888-8888-8888-888888888002', 'silo_grain', 3000.00, '{"capacity": 1000, "durability": 100, "size_width": 2, "size_height": 2, "upgrade_level": 1, "max_upgrade": 5}', '/images/structure/silo.png', 1, NOW(), NOW()),
('99999999-9999-9999-9999-999999999004', '88888888-8888-8888-8888-888888888003', 'greenhouse_basic', 8000.00, '{"capacity": 20, "durability": 80, "size_width": 5, "size_height": 3, "upgrade_level": 1, "max_upgrade": 3}', '/images/structure/greenhouse.png', 1, NOW(), NOW());

-- ============================================
-- MACHINE TYPES & VARIANTS
-- ============================================
INSERT INTO machine_types (id, name, description, icon_url, is_active, createdAt, updatedAt) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'Tractor', 'Multi-purpose farm vehicle', '/icons/machins/tractor.png', 1, NOW(), NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002', 'Harvester', 'Crop harvesting machine', '/icons/machins/harvester.png', 1, NOW(), NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa003', 'Irrigation System', 'Automated watering', '/icons/machins/irrigation.png', 1, NOW(), NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa004', 'Plow', 'Soil preparation', '/icons/machins/plow.png', 1, NOW(), NOW());

INSERT INTO machine_variants (id, type_id, variant_code, base_price, attributes, image_url, is_available, createdAt, updatedAt) VALUES
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'tractor_basic', 25000.00, '{"speed": 1.0, "efficiency": 70, "fuel_type": "diesel", "fuel_consumption": 5, "size_width": 3, "size_height": 2, "durability": 100}', '/images/machins/tractor_basic.png', 1, NOW(), NOW()),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'tractor_advanced', 50000.00, '{"speed": 1.5, "efficiency": 90, "fuel_type": "diesel", "fuel_consumption": 7, "size_width": 3, "size_height": 2, "durability": 150}', '/images/machins/tractor_adv.png', 1, NOW(), NOW()),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002', 'harvester_wheat', 80000.00, '{"speed": 0.8, "efficiency": 95, "fuel_type": "diesel", "fuel_consumption": 10, "size_width": 4, "size_height": 2, "durability": 120}', '/images/machins/harvester_wheat.png', 1, NOW(), NOW()),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa003', 'irrigation_drip', 5000.00, '{"speed": 1.0, "efficiency": 90, "fuel_type": "electric", "fuel_consumption": 2, "size_width": 1, "size_height": 1, "durability": 80}', '/images/machins/irrigation.png', 1, NOW(), NOW());

-- ============================================
-- ASSET PRODUCTIONS (what each variant produces)
-- ============================================
INSERT INTO asset_productions (id, variant_id, asset_category, product_id, rate_per_cycle, cycle_days, on_harvest_only, min_level, createdAt, updatedAt) VALUES
-- Cow Jersey: Milk + Manure daily, Meat on harvest
('cccccccc-cccc-cccc-cccc-ccccccccc001', '33333333-3333-3333-3333-333333333001', 'animal', '11111111-1111-1111-1111-111111111001', 15.00, 1, 0, 0, NOW(), NOW()),
('cccccccc-cccc-cccc-cccc-ccccccccc002', '33333333-3333-3333-3333-333333333001', 'animal', '11111111-1111-1111-1111-111111111012', 5.00, 1, 0, 0, NOW(), NOW()),
('cccccccc-cccc-cccc-cccc-ccccccccc003', '33333333-3333-3333-3333-333333333001', 'animal', '11111111-1111-1111-1111-111111111005', 200.00, 1, 1, 0, NOW(), NOW()),
-- Cow Holstein: More milk
('cccccccc-cccc-cccc-cccc-ccccccccc004', '33333333-3333-3333-3333-333333333002', 'animal', '11111111-1111-1111-1111-111111111001', 25.00, 1, 0, 0, NOW(), NOW()),
('cccccccc-cccc-cccc-cccc-ccccccccc005', '33333333-3333-3333-3333-333333333002', 'animal', '11111111-1111-1111-1111-111111111005', 250.00, 1, 1, 0, NOW(), NOW()),
-- Chicken Layer: Eggs daily
('cccccccc-cccc-cccc-cccc-ccccccccc006', '33333333-3333-3333-3333-333333333003', 'animal', '11111111-1111-1111-1111-111111111002', 1.00, 1, 0, 0, NOW(), NOW()),
-- Chicken Broiler: Meat only
('cccccccc-cccc-cccc-cccc-ccccccccc007', '33333333-3333-3333-3333-333333333004', 'animal', '11111111-1111-1111-1111-111111111005', 2.00, 1, 1, 0, NOW(), NOW()),
-- Sheep Merino: Wool every 90 days, Meat on harvest
('cccccccc-cccc-cccc-cccc-ccccccccc008', '33333333-3333-3333-3333-333333333005', 'animal', '11111111-1111-1111-1111-111111111004', 5.00, 90, 0, 0, NOW(), NOW()),
('cccccccc-cccc-cccc-cccc-ccccccccc009', '33333333-3333-3333-3333-333333333005', 'animal', '11111111-1111-1111-1111-111111111005', 40.00, 1, 1, 0, NOW(), NOW()),
-- Bee: Honey monthly
('cccccccc-cccc-cccc-cccc-ccccccccc010', '33333333-3333-3333-3333-333333333006', 'animal', '11111111-1111-1111-1111-111111111003', 2.00, 30, 0, 0, NOW(), NOW()),
-- Wheat variants
('cccccccc-cccc-cccc-cccc-ccccccccc011', '55555555-5555-5555-5555-555555555001', 'vegetation', '11111111-1111-1111-1111-111111111006', 50.00, 90, 1, 0, NOW(), NOW()),
('cccccccc-cccc-cccc-cccc-ccccccccc012', '55555555-5555-5555-5555-555555555002', 'vegetation', '11111111-1111-1111-1111-111111111006', 40.00, 75, 1, 0, NOW(), NOW()),
-- Corn
('cccccccc-cccc-cccc-cccc-ccccccccc013', '55555555-5555-5555-5555-555555555003', 'vegetation', '11111111-1111-1111-1111-111111111007', 30.00, 80, 1, 0, NOW(), NOW()),
-- Tomato: Produces weekly
('cccccccc-cccc-cccc-cccc-ccccccccc014', '55555555-5555-5555-5555-555555555004', 'vegetation', '11111111-1111-1111-1111-111111111008', 10.00, 7, 0, 0, NOW(), NOW()),
-- Apple trees
('cccccccc-cccc-cccc-cccc-ccccccccc015', '77777777-7777-7777-7777-777777777001', 'tree', '11111111-1111-1111-1111-111111111009', 100.00, 365, 1, 0, NOW(), NOW()),
('cccccccc-cccc-cccc-cccc-ccccccccc016', '77777777-7777-7777-7777-777777777002', 'tree', '11111111-1111-1111-1111-111111111009', 80.00, 365, 1, 0, NOW(), NOW()),
-- Olive tree
('cccccccc-cccc-cccc-cccc-ccccccccc017', '77777777-7777-7777-7777-777777777003', 'tree', '11111111-1111-1111-1111-111111111010', 50.00, 365, 1, 0, NOW(), NOW()),
-- Oak tree: Wood
('cccccccc-cccc-cccc-cccc-ccccccccc018', '77777777-7777-7777-7777-777777777004', 'tree', '11111111-1111-1111-1111-111111111011', 20.00, 365, 1, 0, NOW(), NOW());

-- ============================================
-- USERS (Farmers & Investors)
-- ============================================
INSERT INTO users (id, email, password_hash, role, is_verified, kyc_status, profile, createdAt, updatedAt) VALUES
('00000000-0000-0000-0000-000000000001', 'farmer@farmy.com', '$2b$10$e8p1P8Xv.bB4/wY.j6YJ3uCgWz1R.C6C2M9o1e5Q1u5Z1V1G1B1G1', 'farmer', 1, 'approved', '{"firstName": "John", "lastName": "Doe"}', NOW(), NOW()),
('00000000-0000-0000-0000-000000000002', 'investor@farmy.com', '$2b$10$e8p1P8Xv.bB4/wY.j6YJ3uCgWz1R.C6C2M9o1e5Q1u5Z1V1G1B1G1', 'investor', 1, 'approved', '{"firstName": "Jane", "lastName": "Smith"}', NOW(), NOW());

-- ============================================
-- LANDS
-- ============================================
INSERT INTO lands (id, owner_id, name, description, width_m, height_m, is_active, createdAt, updatedAt) VALUES
('dddddddd-dddd-dddd-dddd-dddddddd0001', '00000000-0000-0000-0000-000000000001', 'Sunny Valley', 'A beautiful lush valley with rich soil.', 20.0, 20.0, 1, NOW(), NOW()),
('dddddddd-dddd-dddd-dddd-dddddddd0002', '00000000-0000-0000-0000-000000000002', 'Green Meadows', 'Expansive meadows ideal for large structures and machine parking.', 50.0, 50.0, 1, NOW(), NOW());

-- ============================================
-- Done! All tables should now be populated.
-- ============================================
