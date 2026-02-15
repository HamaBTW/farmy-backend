import { AppDataSource } from '../config/db.config.js';
import { AnimalCategory } from '../models/AnimalCategory.js';
import { ProductType } from '../models/ProductType.js';
import { ResourceConsumption } from '../models/ResourceConsumption.js';
import { AnimalType } from '../models/AnimalType.js';

export async function seedGameData() {
  try {
    console.log('🌱 Starting game data seeding...');

    const animalCategoryRepo = AppDataSource.getRepository(AnimalCategory);
    const productTypeRepo = AppDataSource.getRepository(ProductType);
    const resourceConsumptionRepo = AppDataSource.getRepository(ResourceConsumption);
    const animalTypeRepo = AppDataSource.getRepository(AnimalType);

    // 1. Create Animal Categories
    console.log('Creating animal categories...');

    let herbivoreCategory = await animalCategoryRepo.findOne({ where: { name: 'Herbivore' } });
    if (!herbivoreCategory) {
      herbivoreCategory = animalCategoryRepo.create({
        name: 'Herbivore',
        description: 'Plant-eating animals like cows, sheep, and horses',
        is_active: true
      });
      herbivoreCategory = await animalCategoryRepo.save(herbivoreCategory);
      console.log('✅ Created Herbivore category');
    }

    let poultryCategory = await animalCategoryRepo.findOne({ where: { name: 'Poultry' } });
    if (!poultryCategory) {
      poultryCategory = animalCategoryRepo.create({
        name: 'Poultry',
        description: 'Birds like chickens, ducks, and turkeys',
        is_active: true
      });
      poultryCategory = await animalCategoryRepo.save(poultryCategory);
      console.log('✅ Created Poultry category');
    }

    let omnivoreCategory = await animalCategoryRepo.findOne({ where: { name: 'Omnivore' } });
    if (!omnivoreCategory) {
      omnivoreCategory = animalCategoryRepo.create({
        name: 'Omnivore',
        description: 'Animals that eat both plants and meat like pigs',
        is_active: true
      });
      omnivoreCategory = await animalCategoryRepo.save(omnivoreCategory);
      console.log('✅ Created Omnivore category');
    }

    // 2. Create Resource Types (using ProductType)
    console.log('Creating resource types...');

    let hayResource = await productTypeRepo.findOne({ where: { name: 'Hay' } });
    if (!hayResource) {
      hayResource = productTypeRepo.create({
        name: 'Hay',
        unit: 'bales',
        description: 'Dried grass used to feed herbivores',
        is_active: true
      });
      hayResource = await productTypeRepo.save(hayResource);
      console.log('✅ Created Hay resource type');
    }

    let grainResource = await productTypeRepo.findOne({ where: { name: 'Grain' } });
    if (!grainResource) {
      grainResource = productTypeRepo.create({
        name: 'Grain',
        unit: 'kg',
        description: 'Seeds and cereals for feeding poultry',
        is_active: true
      });
      grainResource = await productTypeRepo.save(grainResource);
      console.log('✅ Created Grain resource type');
    }

    let mixedFeedResource = await productTypeRepo.findOne({ where: { name: 'Mixed Feed' } });
    if (!mixedFeedResource) {
      mixedFeedResource = productTypeRepo.create({
        name: 'Mixed Feed',
        unit: 'kg',
        description: 'Balanced feed for omnivores',
        is_active: true
      });
      mixedFeedResource = await productTypeRepo.save(mixedFeedResource);
      console.log('✅ Created Mixed Feed resource type');
    }

    let waterResource = await productTypeRepo.findOne({ where: { name: 'Water' } });
    if (!waterResource) {
      waterResource = productTypeRepo.create({
        name: 'Water',
        unit: 'liters',
        description: 'Fresh water for all animals',
        is_active: true
      });
      waterResource = await productTypeRepo.save(waterResource);
      console.log('✅ Created Water resource type');
    }

    // 3. Create Resource Consumption Rules
    console.log('Creating resource consumption rules...');

    // Herbivores eat hay
    const herbivoreHay = await resourceConsumptionRepo.findOne({
      where: {
        animal_category_id: herbivoreCategory.id,
        resource_type_id: hayResource.id
      }
    });
    if (!herbivoreHay) {
      await resourceConsumptionRepo.save(resourceConsumptionRepo.create({
        animal_category_id: herbivoreCategory.id,
        resource_type_id: hayResource.id,
        consumption_rate: 5.0,
        is_required: true
      }));
      console.log('✅ Herbivores consume Hay (5 units/day)');
    }

    // Poultry eat grain
    const poultryGrain = await resourceConsumptionRepo.findOne({
      where: {
        animal_category_id: poultryCategory.id,
        resource_type_id: grainResource.id
      }
    });
    if (!poultryGrain) {
      await resourceConsumptionRepo.save(resourceConsumptionRepo.create({
        animal_category_id: poultryCategory.id,
        resource_type_id: grainResource.id,
        consumption_rate: 2.0,
        is_required: true
      }));
      console.log('✅ Poultry consume Grain (2 units/day)');
    }

    // Omnivores eat mixed feed
    const omnivoreFeed = await resourceConsumptionRepo.findOne({
      where: {
        animal_category_id: omnivoreCategory.id,
        resource_type_id: mixedFeedResource.id
      }
    });
    if (!omnivoreFeed) {
      await resourceConsumptionRepo.save(resourceConsumptionRepo.create({
        animal_category_id: omnivoreCategory.id,
        resource_type_id: mixedFeedResource.id,
        consumption_rate: 4.0,
        is_required: true
      }));
      console.log('✅ Omnivores consume Mixed Feed (4 units/day)');
    }

    // All animals drink water
    for (const category of [herbivoreCategory, poultryCategory, omnivoreCategory]) {
      const waterConsumption = await resourceConsumptionRepo.findOne({
        where: {
          animal_category_id: category.id,
          resource_type_id: waterResource.id
        }
      });
      if (!waterConsumption) {
        await resourceConsumptionRepo.save(resourceConsumptionRepo.create({
          animal_category_id: category.id,
          resource_type_id: waterResource.id,
          consumption_rate: 10.0,
          is_required: true
        }));
        console.log(`✅ ${category.name} consume Water (10 units/day)`);
      }
    }

    // 4. Update existing animal types with categories (if any exist)
    console.log('Updating existing animal types with categories...');

    const cow = await animalTypeRepo.findOne({ where: { name: 'Cow' } });
    if (cow && !cow.category_id) {
      cow.category_id = herbivoreCategory.id;
      await animalTypeRepo.save(cow);
      console.log('✅ Assigned Cow to Herbivore category');
    }

    const sheep = await animalTypeRepo.findOne({ where: { name: 'Sheep' } });
    if (sheep && !sheep.category_id) {
      sheep.category_id = herbivoreCategory.id;
      await animalTypeRepo.save(sheep);
      console.log('✅ Assigned Sheep to Herbivore category');
    }

    const horse = await animalTypeRepo.findOne({ where: { name: 'Horse' } });
    if (horse && !horse.category_id) {
      horse.category_id = herbivoreCategory.id;
      await animalTypeRepo.save(horse);
      console.log('✅ Assigned Horse to Herbivore category');
    }

    const chicken = await animalTypeRepo.findOne({ where: { name: 'Chicken' } });
    if (chicken && !chicken.category_id) {
      chicken.category_id = poultryCategory.id;
      await animalTypeRepo.save(chicken);
      console.log('✅ Assigned Chicken to Poultry category');
    }

    const pig = await animalTypeRepo.findOne({ where: { name: 'Pig' } });
    if (pig && !pig.category_id) {
      pig.category_id = omnivoreCategory.id;
      await animalTypeRepo.save(pig);
      console.log('✅ Assigned Pig to Omnivore category');
    }

    console.log('🎉 Game data seeding completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error seeding game data:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  import('../config/db.config.js').then(async ({ AppDataSource, createDatabaseIfNotExists }) => {
    try {
      await createDatabaseIfNotExists();
      await AppDataSource.initialize();
      console.log('✅ Database connected');

      await seedGameData();

      await AppDataSource.destroy();
      console.log('✅ Database connection closed');
      process.exit(0);
    } catch (error) {
      console.error('Fatal error:', error);
      process.exit(1);
    }
  });
}
