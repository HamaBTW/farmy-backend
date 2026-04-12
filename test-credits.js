import { subscriptionService } from './src/services/v1/subscription.service.js';
import { AppDataSource } from './src/config/db.config.js';
import { User } from './src/models/User.js';

async function run() {
    await AppDataSource.initialize();
    
    // Find a user
    const user = await AppDataSource.getRepository(User).findOne({ where: {} });
    if (!user) {
        console.log('No users found in db');
        process.exit(1);
    }
    
    // get free plan
    const plans = await subscriptionService.getPlans(user.role);
    const freePlan = plans.find(p => p.price_monthly == 0);
    
    if(!freePlan) {
        console.log('No free plan found for role', user.role);
        process.exit(1);
    }
    
    try {
        console.log('Creating free sub for user', user.id, 'with plan', freePlan.plan_key);
        const sub = await subscriptionService.upgradeWithCredits(user.id, freePlan.id, 'monthly');
        console.log('Success!', sub);
    } catch(err) {
        console.error('Failed!', err.message, err.stack);
    }
    process.exit(0);
}
run();
