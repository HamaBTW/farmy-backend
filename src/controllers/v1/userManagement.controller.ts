import { Request, Response } from 'express';
import { AppDataSource } from '../../config/db.config.js';
import { User, UserRole } from '../../models/User.js';
import { Like, In } from 'typeorm';
import bcrypt from 'bcrypt';
import { WorkerProfile, VerificationStatus } from '../../models/WorkerProfile.js';

export class UserManagementController {
    /**
     * Get users with advanced filtering and search
     */
    static async getUsers(req: Request, res: Response) {
        try {
            const { search, role, status, region, joinDate, sortBy, sortOrder = 'DESC', page = 1, limit = 10 } = req.query;
            const userRepo = AppDataSource.getRepository(User);

            const queryBuilder = userRepo.createQueryBuilder('user')
                .leftJoinAndSelect(WorkerProfile, 'wp', 'wp.user_id = user.id')
                .select([
                    'user.id',
                    'user.email',
                    'user.role',
                    'user.is_verified',
                    'user.is_banned',
                    'user.kyc_status',
                    'user.profile',
                    'user.createdAt',
                    'wp.verification_status'
                ]);

            // 1. Search Logic (Email or Name)
            if (search) {
                queryBuilder.andWhere(
                    '(user.email LIKE :search OR user.profile->>"$.name" LIKE :search)',
                    { search: `%${search}%` }
                );
            }

            // 2. Role Filtering
            // Special handling for 'worker' role based on previous logic
            if (role === 'worker') {
                queryBuilder.andWhere('user.role = :role', { role: UserRole.CUSTOMER })
                    .andWhere('wp.verification_status = :vStatus', { vStatus: VerificationStatus.VERIFIED });
            } else if (role === 'customer') {
                queryBuilder.andWhere('user.role = :role', { role: UserRole.CUSTOMER })
                    .andWhere('(wp.id IS NULL OR wp.verification_status != :vStatus)', { vStatus: VerificationStatus.VERIFIED });
            } else if (role && role !== 'all') {
                queryBuilder.andWhere('user.role = :role', { role });
            }

            if (status === 'active') {
                queryBuilder.andWhere('user.is_banned = false');
            } else if (status === 'banned') {
                queryBuilder.andWhere('user.is_banned = true');
            }

            // 4. Region Filtering
            if (region) {
                queryBuilder.andWhere('user.profile->>"$.city" LIKE :region', { region: `%${region}%` });
            }

            // 5. Join Date Filtering
            if (joinDate) {
                queryBuilder.andWhere('DATE(user.createdAt) = :joinDate', { joinDate });
            }

            // 6. Pagination
            const skip = (Number(page) - 1) * Number(limit);
            queryBuilder.skip(skip).take(Number(limit));
            // 6. Sorting logic
            if (sortBy) {
                let sortColumn = 'user.createdAt';
                switch (sortBy) {
                    case 'name':
                    case 'user':
                        sortColumn = 'user.profile->>"$.name"';
                        break;
                    case 'email':
                        sortColumn = 'user.email';
                        break;
                    case 'role':
                        sortColumn = 'user.role';
                        break;
                    case 'region':
                        sortColumn = 'user.profile->>"$.city"';
                        break;
                    case 'joinDate':
                        sortColumn = 'user.createdAt';
                        break;
                    case 'status':
                        sortColumn = 'user.is_banned';
                        break;
                }
                queryBuilder.orderBy(sortColumn, (sortOrder as string).toUpperCase() as 'ASC' | 'DESC');
            } else {
                queryBuilder.orderBy('user.createdAt', 'DESC');
            }

            const [users, total] = await queryBuilder.getManyAndCount();

            // Transform data for frontend consistency
            const transformedUsers = users.map(user => {
                const isWorker = user.role === UserRole.CUSTOMER && (user as any).wp_verification_status === VerificationStatus.VERIFIED;
                
                return {
                    id: user.id,
                    name: user.profile?.name || 'Unknown User',
                    email: user.email,
                    role: isWorker ? 'worker' : user.role,
                    status: user.is_banned ? 'banned' : 'active',
                    joinDate: user.createdAt,
                    region: user.profile?.city || 'N/A',
                    isVerified: user.is_verified,
                    kycStatus: user.kyc_status
                };
            });

            res.status(200).json({
                success: true,
                data: transformedUsers,
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit),
                    totalPages: Math.ceil(total / Number(limit))
                }
            });

        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    /**
     * Update user details or status
     */
    static async updateUser(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { role, status, name } = req.body;
            const userRepo = AppDataSource.getRepository(User);

            const user = await userRepo.findOneBy({ id: id as string });
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            if (role) user.role = role;
            if (status === 'banned') user.is_banned = true;
            if (status === 'active') user.is_banned = false;
            
            if (name) {
                user.profile = {
                    ...(user.profile || {}),
                    name
                };
            }

            await userRepo.save(user);

            res.status(200).json({ success: true, message: 'User updated successfully' });
        } catch (error) {
            console.error('Error updating user:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    /**
     * Create a new Admin user
     */
    static async createAdmin(req: Request, res: Response) {
        try {
            const { email, password, name } = req.body;
            const userRepo = AppDataSource.getRepository(User);

            const existingUser = await userRepo.findOneBy({ email });
            if (existingUser) {
                return res.status(400).json({ success: false, message: 'Email already in use' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            
            const admin = userRepo.create({
                email,
                password_hash: hashedPassword,
                role: UserRole.ADMIN,
                is_verified: true,
                profile: { name },
                auth_provider: 'email'
            });

            await userRepo.save(admin);

            res.status(201).json({ success: true, message: 'Admin created successfully' });
        } catch (error) {
            console.error('Error creating admin:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    /**
     * Export users to CSV (Dynamic)
     */
    static async exportUsers(req: Request, res: Response) {
        try {
            const userRepo = AppDataSource.getRepository(User);
            const users = await userRepo.find({
                select: ['email', 'role', 'createdAt', 'is_verified', 'is_banned'],
                order: { createdAt: 'DESC' }
            });

            let csv = 'Email,Role,Join Date,Verified,Status\n';
            users.forEach(u => {
                csv += `${u.email},${u.role},${u.createdAt},${u.is_verified},${u.is_banned ? 'Banned' : 'Active'}\n`;
            });

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=users_export.csv');
            res.status(200).send(csv);
        } catch (error) {
            console.error('Error exporting users:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }
}
