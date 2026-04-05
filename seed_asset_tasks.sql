-- Seed script for asset_tasks
-- Assumes animal_variants and tree_variants table is populated

-- NOTE: Ensure this matches your variant_code in AnimalVariant and TreeVariant

-- Cows - Milk Task
INSERT INTO asset_tasks (id, category, variant_id, action, description, reward, time_required_minutes)
SELECT UUID(), 'animal', id, 'milk', 'Milk the cow', 5.0, 30 
FROM animal_variants WHERE variant_code IN ('cow_holstein', 'cow_jersey');

-- Chickens - Collect Eggs Task
INSERT INTO asset_tasks (id, category, variant_id, action, description, reward, time_required_minutes)
SELECT UUID(), 'animal', id, 'collect_eggs', 'Collect eggs from chickens', 2.0, 15 
FROM animal_variants WHERE variant_code = 'chicken_layer';

-- Sheep - Shear Wool
INSERT INTO asset_tasks (id, category, variant_id, action, description, reward, time_required_minutes)
SELECT UUID(), 'animal', id, 'shear', 'Shear wool from sheep', 10.0, 45 
FROM animal_variants WHERE variant_code = 'sheep_merino';

-- Apple Trees - Harvest Apples
INSERT INTO asset_tasks (id, category, variant_id, action, description, reward, time_required_minutes)
SELECT UUID(), 'tree', id, 'harvest', 'Harvest apples', 15.0, 60 
FROM tree_variants WHERE variant_code = 'apple_red_delicious';

-- General Tasks for all animals
INSERT INTO asset_tasks (id, category, variant_id, action, description, reward, time_required_minutes)
SELECT UUID(), 'animal', id, 'feed', 'Feed the animal', 1.0, 10 
FROM animal_variants;

INSERT INTO asset_tasks (id, category, variant_id, action, description, reward, time_required_minutes)
SELECT UUID(), 'animal', id, 'clean', 'Clean the stall', 2.5, 20 
FROM animal_variants;
