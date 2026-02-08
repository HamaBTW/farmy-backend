-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 08, 2026 at 02:03 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.1.25

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `farmy`
--

--
-- Dumping data for table `animal_types`
--

INSERT INTO `animal_types` (`id`, `createdAt`, `updatedAt`, `name`, `description`, `icon_url`, `is_active`) VALUES
('22222222-2222-2222-2222-222222222001', '2026-02-06 02:04:27.000000', '2026-02-07 23:45:14.946189', 'Cow', 'Dairy and beef cattle', '/icons/animals/cow.png', 1),
('22222222-2222-2222-2222-222222222002', '2026-02-06 02:04:27.000000', '2026-02-07 23:45:26.376038', 'Chicken', 'Poultry for eggs and meat', '/icons/animals/chicken.png', 1),
('22222222-2222-2222-2222-222222222003', '2026-02-06 02:04:27.000000', '2026-02-07 23:45:32.460031', 'Sheep', 'Wool and meat production', '/icons/animals/sheep.png', 1),
('22222222-2222-2222-2222-222222222004', '2026-02-06 02:04:27.000000', '2026-02-07 23:45:36.573272', 'Goat', 'Milk and meat', '/icons/animals/goat.png', 1);

--
-- Dumping data for table `animal_variants`
--

INSERT INTO `animal_variants` (`id`, `createdAt`, `updatedAt`, `type_id`, `base_price`, `image_url`, `is_available`, `variant_code`, `attributes`) VALUES
('33333333-3333-3333-3333-333333333001', '2026-02-06 02:04:27.000000', '2026-02-07 23:45:47.052420', '22222222-2222-2222-2222-222222222001', 1500.00, '/images/animals/cow_jersey.png', 1, 'cow_dairy_jersey', '{\"lifespan_days\": 3650, \"feed_consumption\": 5, \"mature_age_days\": 365, \"size_width\": 2, \"size_height\": 2, \"habitat\": \"pasture\"}'),
('33333333-3333-3333-3333-333333333002', '2026-02-06 02:04:27.000000', '2026-02-07 23:45:51.074291', '22222222-2222-2222-2222-222222222001', 2000.00, '/images/animals/cow_holstein.png', 1, 'cow_dairy_holstein', '{\"lifespan_days\": 4000, \"feed_consumption\": 6, \"mature_age_days\": 400, \"size_width\": 2, \"size_height\": 2, \"habitat\": \"pasture\"}'),
('33333333-3333-3333-3333-333333333003', '2026-02-06 02:04:27.000000', '2026-02-07 23:45:58.969337', '22222222-2222-2222-2222-222222222002', 50.00, '/images/animals/chicken_layer.png', 1, 'chicken_layer', '{\"lifespan_days\": 730, \"feed_consumption\": 0.2, \"mature_age_days\": 120, \"size_width\": 1, \"size_height\": 1, \"habitat\": \"coop\"}'),
('33333333-3333-3333-3333-333333333005', '2026-02-06 02:04:27.000000', '2026-02-07 23:46:03.593050', '22222222-2222-2222-2222-222222222003', 800.00, '/images/animals/sheep_merino.png', 1, 'sheep_merino', '{\"lifespan_days\": 3650, \"feed_consumption\": 2, \"mature_age_days\": 365, \"size_width\": 2, \"size_height\": 1, \"habitat\": \"pasture\"}');

--
-- Dumping data for table `asset_productions`
--

INSERT INTO `asset_productions` (`id`, `createdAt`, `updatedAt`, `variant_id`, `asset_category`, `product_id`, `rate_per_cycle`, `cycle_days`, `on_harvest_only`, `min_level`, `conditions`) VALUES
('cccccccc-cccc-cccc-cccc-ccccccccc001', '2026-02-07 23:24:09.000000', '2026-02-07 23:24:09.000000', '33333333-3333-3333-3333-333333333001', 'animal', '11111111-1111-1111-1111-111111111001', 15.00, 1, 0, 0, NULL),
('cccccccc-cccc-cccc-cccc-ccccccccc003', '2026-02-07 23:24:09.000000', '2026-02-07 23:24:09.000000', '33333333-3333-3333-3333-333333333001', 'animal', '11111111-1111-1111-1111-111111111005', 200.00, 1, 1, 0, NULL),
('cccccccc-cccc-cccc-cccc-ccccccccc004', '2026-02-07 23:24:09.000000', '2026-02-07 23:24:09.000000', '33333333-3333-3333-3333-333333333002', 'animal', '11111111-1111-1111-1111-111111111001', 25.00, 1, 0, 0, NULL),
('cccccccc-cccc-cccc-cccc-ccccccccc005', '2026-02-07 23:24:09.000000', '2026-02-07 23:24:09.000000', '33333333-3333-3333-3333-333333333002', 'animal', '11111111-1111-1111-1111-111111111005', 250.00, 1, 1, 0, NULL),
('cccccccc-cccc-cccc-cccc-ccccccccc006', '2026-02-07 23:24:09.000000', '2026-02-07 23:24:09.000000', '33333333-3333-3333-3333-333333333003', 'animal', '11111111-1111-1111-1111-111111111002', 1.00, 1, 0, 0, NULL),
('cccccccc-cccc-cccc-cccc-ccccccccc007', '2026-02-07 23:24:09.000000', '2026-02-07 23:24:09.000000', '33333333-3333-3333-3333-333333333004', 'animal', '11111111-1111-1111-1111-111111111005', 2.00, 1, 1, 0, NULL),
('cccccccc-cccc-cccc-cccc-ccccccccc008', '2026-02-07 23:24:09.000000', '2026-02-07 23:24:09.000000', '33333333-3333-3333-3333-333333333005', 'animal', '11111111-1111-1111-1111-111111111004', 5.00, 90, 0, 0, NULL),
('cccccccc-cccc-cccc-cccc-ccccccccc009', '2026-02-07 23:24:09.000000', '2026-02-07 23:24:09.000000', '33333333-3333-3333-3333-333333333005', 'animal', '11111111-1111-1111-1111-111111111005', 40.00, 1, 1, 0, NULL),
('cccccccc-cccc-cccc-cccc-ccccccccc010', '2026-02-07 23:24:09.000000', '2026-02-07 23:24:09.000000', '33333333-3333-3333-3333-333333333006', 'animal', '11111111-1111-1111-1111-111111111003', 2.00, 30, 0, 0, NULL),
('cccccccc-cccc-cccc-cccc-ccccccccc011', '2026-02-07 23:24:09.000000', '2026-02-07 23:24:09.000000', '55555555-5555-5555-5555-555555555001', 'vegetation', '11111111-1111-1111-1111-111111111006', 50.00, 90, 1, 0, NULL),
('cccccccc-cccc-cccc-cccc-ccccccccc012', '2026-02-07 23:24:09.000000', '2026-02-07 23:24:09.000000', '55555555-5555-5555-5555-555555555002', 'vegetation', '11111111-1111-1111-1111-111111111006', 40.00, 75, 1, 0, NULL),
('cccccccc-cccc-cccc-cccc-ccccccccc013', '2026-02-07 23:24:09.000000', '2026-02-07 23:24:09.000000', '55555555-5555-5555-5555-555555555003', 'vegetation', '11111111-1111-1111-1111-111111111007', 30.00, 80, 1, 0, NULL),
('cccccccc-cccc-cccc-cccc-ccccccccc014', '2026-02-07 23:24:09.000000', '2026-02-07 23:24:09.000000', '55555555-5555-5555-5555-555555555004', 'vegetation', '11111111-1111-1111-1111-111111111008', 10.00, 7, 0, 0, NULL),
('cccccccc-cccc-cccc-cccc-ccccccccc015', '2026-02-07 23:24:09.000000', '2026-02-07 23:24:09.000000', '77777777-7777-7777-7777-777777777001', 'tree', '11111111-1111-1111-1111-111111111009', 100.00, 365, 1, 0, NULL),
('cccccccc-cccc-cccc-cccc-ccccccccc016', '2026-02-07 23:24:09.000000', '2026-02-07 23:24:09.000000', '77777777-7777-7777-7777-777777777002', 'tree', '11111111-1111-1111-1111-111111111009', 80.00, 365, 1, 0, NULL),
('cccccccc-cccc-cccc-cccc-ccccccccc017', '2026-02-07 23:24:09.000000', '2026-02-07 23:24:09.000000', '77777777-7777-7777-7777-777777777003', 'tree', '11111111-1111-1111-1111-111111111010', 50.00, 365, 1, 0, NULL),
('cccccccc-cccc-cccc-cccc-ccccccccc018', '2026-02-07 23:24:09.000000', '2026-02-07 23:24:09.000000', '77777777-7777-7777-7777-777777777004', 'tree', '11111111-1111-1111-1111-111111111011', 20.00, 365, 1, 0, NULL);

--
-- Dumping data for table `machine_types`
--

INSERT INTO `machine_types` (`id`, `createdAt`, `updatedAt`, `name`, `description`, `icon_url`, `is_active`) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', '2026-02-06 02:04:27.000000', '2026-02-07 23:47:15.096177', 'Tractor', 'Multi-purpose farm vehicle', '/icons/machins/tractor.png', 1),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002', '2026-02-06 02:04:27.000000', '2026-02-07 23:47:19.702354', 'Harvester', 'Crop harvesting machine', '/icons/machins/harvester.png', 1),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa004', '2026-02-06 02:04:27.000000', '2026-02-07 23:47:28.756504', 'Plow', 'Soil preparation', '/icons/machins/plow.png', 1);

--
-- Dumping data for table `machine_variants`
--

INSERT INTO `machine_variants` (`id`, `createdAt`, `updatedAt`, `type_id`, `base_price`, `image_url`, `is_available`, `variant_code`, `attributes`) VALUES
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb001', '2026-02-07 23:25:13.000000', '2026-02-08 01:50:41.834883', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 25000.00, '/images/machins/tractor_basic.png', 1, 'tractor_basic', '{\"speed\": 1.0, \"efficiency\": 70, \"fuel_type\": \"diesel\", \"fuel_consumption\": 5, \"size_width\": 3, \"size_height\": 2, \"durability\": 100}'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb002', '2026-02-07 23:25:13.000000', '2026-02-08 01:50:45.592777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 50000.00, '/images/machins/tractor_adv.png', 1, 'tractor_advanced', '{\"speed\": 1.5, \"efficiency\": 90, \"fuel_type\": \"diesel\", \"fuel_consumption\": 7, \"size_width\": 3, \"size_height\": 2, \"durability\": 150}'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb003', '2026-02-07 23:25:13.000000', '2026-02-08 01:50:49.097625', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002', 80000.00, '/images/machins/harvester.png', 1, 'harvester_wheat', '{\"speed\": 0.8, \"efficiency\": 95, \"fuel_type\": \"diesel\", \"fuel_consumption\": 10, \"size_width\": 4, \"size_height\": 2, \"durability\": 120}');

--
-- Dumping data for table `product_types`
--

INSERT INTO `product_types` (`id`, `createdAt`, `updatedAt`, `name`, `unit`, `description`, `icon_url`, `is_active`) VALUES
('11111111-1111-1111-1111-111111111001', '2026-02-06 02:04:27.000000', '2026-02-08 00:12:49.411373', 'Milk', 'liters', 'Fresh dairy milk', '/icons/products/milk.png', 1),
('11111111-1111-1111-1111-111111111002', '2026-02-06 02:04:27.000000', '2026-02-08 00:12:58.568711', 'Eggs', 'units', 'Farm fresh eggs', '/icons/products/eggs.png', 1),
('11111111-1111-1111-1111-111111111003', '2026-02-06 02:04:27.000000', '2026-02-08 00:13:08.996629', 'Honey', 'kg', 'Natural honey', '/icons/products/honey.png', 1),
('11111111-1111-1111-1111-111111111004', '2026-02-06 02:04:27.000000', '2026-02-08 00:13:16.092036', 'Wool', 'kg', 'Sheep wool', '/icons/products/wool.png', 1),
('11111111-1111-1111-1111-111111111005', '2026-02-06 02:04:27.000000', '2026-02-08 00:13:24.686232', 'Meat', 'kg', 'Animal meat', '/icons/products/meat.png', 1),
('11111111-1111-1111-1111-111111111006', '2026-02-06 02:04:27.000000', '2026-02-08 00:13:35.801282', 'Wheat', 'kg', 'Harvested wheat grain', '/icons/products/wheat.png', 1),
('11111111-1111-1111-1111-111111111007', '2026-02-06 02:04:27.000000', '2026-02-08 00:13:43.244693', 'Corn', 'kg', 'Sweet corn', '/icons/products/corn.png', 1),
('11111111-1111-1111-1111-111111111008', '2026-02-06 02:04:27.000000', '2026-02-08 00:13:55.334680', 'Tomatoes', 'kg', 'Fresh tomatoes', '/icons/products/tomatoes.png', 1),
('11111111-1111-1111-1111-111111111009', '2026-02-06 02:04:27.000000', '2026-02-08 00:14:05.336535', 'Apples', 'units', 'Fresh apples', '/icons/products/apples.png', 1),
('11111111-1111-1111-1111-111111111010', '2026-02-06 02:04:27.000000', '2026-02-08 00:14:12.837689', 'Olives', 'kg', 'Olive fruit', '/icons/products/olives.png', 1),
('11111111-1111-1111-1111-111111111011', '2026-02-06 02:04:27.000000', '2026-02-08 00:14:21.872741', 'Wood', 'logs', 'Timber logs', '/icons/products/wood.png', 1);

--
-- Dumping data for table `structure_types`
--

INSERT INTO `structure_types` (`id`, `createdAt`, `updatedAt`, `name`, `description`, `icon_url`, `is_active`) VALUES
('88888888-8888-8888-8888-888888888001', '2026-02-06 02:04:27.000000', '2026-02-08 00:42:46.068672', 'Barn', 'Animal housing', '/icons/structure/barn.png', 1),
('88888888-8888-8888-8888-888888888002', '2026-02-06 02:04:27.000000', '2026-02-08 00:42:50.637035', 'Silo', 'Grain storage', '/icons/structure/silo.png', 1),
('88888888-8888-8888-8888-888888888003', '2026-02-06 02:04:27.000000', '2026-02-08 00:42:54.828226', 'Greenhouse', 'Protected growing area', '/icons/structure/greenhouse.png', 1),
('88888888-8888-8888-8888-888888888004', '2026-02-06 02:04:27.000000', '2026-02-08 00:42:59.471028', 'Well', 'Water source', '/icons/structure/well.png', 1);

--
-- Dumping data for table `structure_variants`
--

INSERT INTO `structure_variants` (`id`, `createdAt`, `updatedAt`, `type_id`, `base_price`, `image_url`, `is_available`, `variant_code`, `attributes`) VALUES
('99999999-9999-9999-9999-999999999001', '2026-02-07 23:26:38.000000', '2026-02-08 01:21:33.328768', '88888888-8888-8888-8888-888888888001', 5000.00, '/images/structure/barn_small.png', 1, 'barn_small', '{\"capacity\": 10, \"durability\": 100, \"size_width\": 4, \"size_height\": 4, \"upgrade_level\": 1, \"max_upgrade\": 3}'),
('99999999-9999-9999-9999-999999999002', '2026-02-07 23:26:38.000000', '2026-02-08 01:21:37.464973', '88888888-8888-8888-8888-888888888001', 15000.00, '/images/structure/barn_large.png', 1, 'barn_large', '{\"capacity\": 30, \"durability\": 150, \"size_width\": 6, \"size_height\": 6, \"upgrade_level\": 1, \"max_upgrade\": 3}'),
('99999999-9999-9999-9999-999999999003', '2026-02-07 23:26:38.000000', '2026-02-08 01:21:40.836463', '88888888-8888-8888-8888-888888888002', 3000.00, '/images/structure/silo.png', 1, 'silo_grain', '{\"capacity\": 1000, \"durability\": 100, \"size_width\": 2, \"size_height\": 2, \"upgrade_level\": 1, \"max_upgrade\": 5}'),
('99999999-9999-9999-9999-999999999004', '2026-02-07 23:26:38.000000', '2026-02-08 01:21:44.552964', '88888888-8888-8888-8888-888888888003', 8000.00, '/images/structure/greenhouse.png', 1, 'greenhouse_basic', '{\"capacity\": 20, \"durability\": 80, \"size_width\": 5, \"size_height\": 3, \"upgrade_level\": 1, \"max_upgrade\": 3}');

--
-- Dumping data for table `tree_types`
--

INSERT INTO `tree_types` (`id`, `createdAt`, `updatedAt`, `name`, `description`, `icon_url`, `is_active`) VALUES
('66666666-6666-6666-6666-666666666001', '2026-02-06 02:04:27.000000', '2026-02-08 01:25:31.092862', 'Apple Tree', 'Fruit tree for apples', '/icons/trees/apple-tree.png', 1),
('66666666-6666-6666-6666-666666666003', '2026-02-06 02:04:27.000000', '2026-02-08 01:25:35.928094', 'Oak Tree', 'Hardwood timber tree', '/icons/trees/oak-tree.png', 1),
('66666666-6666-6666-6666-666666666004', '2026-02-06 02:04:27.000000', '2026-02-08 01:25:39.858607', 'Pine Tree', 'Softwood timber tree', '/icons/trees/pine-tree.png', 1);

--
-- Dumping data for table `tree_variants`
--

INSERT INTO `tree_variants` (`id`, `createdAt`, `updatedAt`, `type_id`, `variant_code`, `base_price`, `image_url`, `is_available`, `attributes`) VALUES
('77777777-7777-7777-7777-777777777001', '2026-02-07 23:27:14.000000', '2026-02-08 01:31:31.117626', '66666666-6666-6666-6666-666666666001', 'apple_red_delicious', 200.00, '/images/trees/apple_red.png', 1, '{\"growth_years\": 4, \"harvest_season\": \"fall\", \"max_height\": 8, \"water_needs\": 5, \"size_width\": 1, \"size_height\": 1, \"lifespan_years\": 50}'),
('77777777-7777-7777-7777-777777777004', '2026-02-07 23:27:14.000000', '2026-02-08 01:31:23.911872', '66666666-6666-6666-6666-666666666003', 'oak_english', 500.00, '/images/trees/oak.png', 1, '{\"growth_years\": 20, \"harvest_season\": \"winter\", \"max_height\": 25, \"water_needs\": 4, \"size_width\": 1, \"size_height\": 1, \"lifespan_years\": 300}');

--
-- Dumping data for table `vegetation_types`
--

INSERT INTO `vegetation_types` (`id`, `createdAt`, `updatedAt`, `name`, `description`, `icon_url`, `is_active`) VALUES
('44444444-4444-4444-4444-444444444001', '2026-02-06 02:04:27.000000', '2026-02-08 01:32:47.519533', 'Wheat', 'Cereal grain crop', '/icons/vegetation/wheat.png', 1),
('44444444-4444-4444-4444-444444444002', '2026-02-06 02:04:27.000000', '2026-02-08 01:32:51.764642', 'Corn', 'Maize crop', '/icons/vegetation/corn.png', 1),
('44444444-4444-4444-4444-444444444003', '2026-02-06 02:04:27.000000', '2026-02-08 01:32:55.602252', 'Tomato', 'Vegetable crop', '/icons/vegetation/tomato.png', 1),
('44444444-4444-4444-4444-444444444004', '2026-02-06 02:04:27.000000', '2026-02-08 01:32:59.200843', 'Carrot', 'Root vegetable', '/icons/vegetation/carrot.png', 1),
('44444444-4444-4444-4444-444444444005', '2026-02-06 02:04:27.000000', '2026-02-08 01:33:03.029133', 'Potato', 'Starch crop', '/icons/vegetation/potato.png', 1);

--
-- Dumping data for table `vegetation_variants`
--

INSERT INTO `vegetation_variants` (`id`, `createdAt`, `updatedAt`, `type_id`, `base_price`, `image_url`, `is_available`, `variant_code`, `attributes`) VALUES
('55555555-5555-5555-5555-555555555002', '2026-02-07 23:27:56.000000', '2026-02-08 01:38:54.092952', '44444444-4444-4444-4444-444444444001', 12.00, '/images/vegetation/wheat_spring.png', 1, 'wheat_spring', '{\"growth_days\": 75, \"water_needs\": 4, \"soil_type\": \"loam\", \"planting_season\": \"spring\", \"size_width\": 1, \"size_height\": 1, \"is_perennial\": false}'),
('55555555-5555-5555-5555-555555555003', '2026-02-07 23:27:56.000000', '2026-02-08 01:38:57.386703', '44444444-4444-4444-4444-444444444002', 15.00, '/images/vegetation/corn_sweet.png', 1, 'corn_sweet', '{\"growth_days\": 80, \"water_needs\": 5, \"soil_type\": \"loam\", \"planting_season\": \"spring\", \"size_width\": 1, \"size_height\": 1, \"is_perennial\": false}'),
('55555555-5555-5555-5555-555555555004', '2026-02-07 23:27:56.000000', '2026-02-08 01:39:00.566819', '44444444-4444-4444-4444-444444444003', 20.00, '/images/vegetation/tomato_cherry.png', 1, 'tomato_cherry', '{\"growth_days\": 60, \"water_needs\": 6, \"soil_type\": \"sandy\", \"planting_season\": \"spring\", \"size_width\": 1, \"size_height\": 1, \"is_perennial\": false}');
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
