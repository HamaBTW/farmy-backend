import { AppDataSource } from '../dist/config/db.config.js';
import { User } from '../dist/models/User.js';

async function setUserLocation() {
  try {
    await AppDataSource.initialize();
    const userRepo = AppDataSource.getRepository(User);

    // Find the test user
    const user = await userRepo.findOne({
      where: { email: 'nderouiche28@gmail.com' }
    });

    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }

    // Set location to a test point (lat: 35.7595, lon: 139.2955 - Tokyo area)
    user.location = {
      latitude: 35.7595,
      longitude: 139.2955
    };

    await userRepo.save(user);
    console.log('✅ User location updated:', user.location);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setUserLocation();
