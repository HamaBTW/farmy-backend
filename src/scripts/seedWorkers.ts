import { AppDataSource } from '../config/db.config.js';
import { User, UserRole } from '../models/User.js';
import { WorkerProfile, VerificationStatus } from '../models/WorkerProfile.js';
import bcrypt from 'bcrypt';

async function seed() {
    try {
        await AppDataSource.initialize();
        console.log('Database initialized');

        const userRepo = AppDataSource.getRepository(User);
        const profileRepo = AppDataSource.getRepository(WorkerProfile);

        const testWorkers = [
            { name: 'Samir Dridi', email: 'samir.worker@gmail.com', skills: ['Pruning', 'Irrigation'], rate: 5.5, status: VerificationStatus.PENDING },
            { name: 'Omar Gabsi', email: 'omar.g@gmail.com', skills: ['Livestock Care'], rate: 6.25, status: VerificationStatus.PENDING },
            { name: 'Hedi Mansour', email: 'hedi.m@gmail.com', skills: ['Harvesting', 'Pesticides'], rate: 5.0, status: VerificationStatus.VERIFIED },
            { name: 'Zied Ayari', email: 'zied.ayari@gmail.com', skills: ['Tractor Driving', 'Maintenance'], rate: 7.5, status: VerificationStatus.VERIFIED },
            { name: 'Faten Riahi', email: 'faten.r@gmail.com', skills: ['Packaging', 'Sorting'], rate: 4.35, status: VerificationStatus.REJECTED },
        ];

        for (const w of testWorkers) {
            let user = await userRepo.findOneBy({ email: w.email });
            if (!user) {
                user = userRepo.create({
                    email: w.email,
                    password_hash: await bcrypt.hash('password123', 10),
                    role: UserRole.CUSTOMER, // Workers are customers with a profile
                    is_verified: true,
                    profile: { name: w.name, city: 'Tunis' },
                    auth_provider: 'email'
                });
                await userRepo.save(user);
            }

            let profile = await profileRepo.findOneBy({ user_id: user.id });
            if (!profile) {
                profile = profileRepo.create({
                    user_id: user.id,
                    skills: w.skills,
                    hourly_rate: w.rate,
                    verification_status: w.status,
                    rating: 4.5 + Math.random() * 0.5,
                    bio: `Professional agricultural worker specialized in ${w.skills.join(', ')}.`
                });
                await profileRepo.save(profile);
            }
        }

        console.log('Seeding completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error during seeding:', error);
        process.exit(1);
    }
}

seed();
