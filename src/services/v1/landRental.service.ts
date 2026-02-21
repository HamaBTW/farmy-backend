import { AppDataSource } from '../../config/db.config.js';
import { LandRental, PaymentStatus } from '../../models/LandRental.js';
import { Land } from '../../models/Land.js';
import { User } from '../../models/User.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { LessThanOrEqual, MoreThanOrEqual, IsNull } from 'typeorm';
import { stripeService } from './StripeService.js';
import { hederaService } from './HederaService.js';

interface CreateLandRentalData {
  land_id: string;
  investor_id: string;
  rental_start_date: Date;
  rental_end_date?: Date | null;
  monthly_rent: number;
  payment_due_date: Date;
  payment_status?: PaymentStatus;
}

class LandRentalService {
  private rentalRepo = AppDataSource.getRepository(LandRental);
  private landRepo = AppDataSource.getRepository(Land);
  private userRepo = AppDataSource.getRepository(User);

  async create(data: CreateLandRentalData) {
    // Verify land exists
    const land = await this.landRepo.findOne({
      where: { id: data.land_id },
      relations: ['owner']
    });
    if (!land) {
      throw new AppError(404, 'Land not found');
    }

    // Verify investor exists
    const investor = await this.userRepo.findOne({
      where: { id: data.investor_id }
    });
    if (!investor) {
      throw new AppError(404, 'Investor not found');
    }

    let paymentStatus = data.payment_status || PaymentStatus.PENDING;

    // Handle Payment if payment_method_id is provided
    if ((data as any).payment_method_id) {
      if (!investor.stripe_customer_id) {
        throw new AppError(400, 'Investor has no payment account setup');
      }

      try {
        let amountToCharge = data.monthly_rent;
        if (data.rental_end_date) {
          const start = new Date(data.rental_start_date);
          const end = new Date(data.rental_end_date);
          // Calculate difference in months roughly
          const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
          if (months > 0) {
            amountToCharge = data.monthly_rent * months;
          }
        }

        if ((data as any).payment_method_id === 'WALLET_CREDITS') {
          const currentCredits = Number(investor.credits || 0);
          if (currentCredits < amountToCharge) {
            throw new AppError(402, `Insufficient wallet credits. Required: ${amountToCharge}, Available: ${currentCredits}`);
          }

          // Deduct credits
          investor.credits = currentCredits - amountToCharge;
          await this.userRepo.save(investor);

          paymentStatus = PaymentStatus.PAID;
        } else {
          if (!investor.stripe_customer_id) {
            throw new AppError(400, 'Investor has no payment account setup');
          }

          // Lookup the payment method to get the Stripe provider_id
          const paymentMethod = await AppDataSource.getRepository('PaymentMethod').findOne({
            where: { id: (data as any).payment_method_id, user_id: investor.id }
          });

          if (!paymentMethod) {
            throw new AppError(400, 'Invalid payment method selected');
          }

          await stripeService.chargeSavedCard(
            amountToCharge,
            'usd',
            investor.stripe_customer_id,
            paymentMethod.provider_id
          );
          paymentStatus = PaymentStatus.PAID;
        }
      } catch (error: any) {
        throw new AppError(402, `Payment failed: ${error.message}`);
      }
    }

    // Create rental
    const rental = this.rentalRepo.create({
      ...data,
      payment_status: paymentStatus
    });
    const savedRental = await this.rentalRepo.save(rental);

    // Record on Hedera (non-blocking)
    try {
      const amountPaid = (data as any).amountCharged ?? data.monthly_rent;
      const paymentMethod = (data as any).payment_method_id === 'WALLET_CREDITS' ? 'credits' : 'stripe';
      await hederaService.recordPurchase({
        type: 'land_rental',
        user_id: data.investor_id,
        item_id: savedRental.id,
        item_name: `Land Rental: ${land.name}`,
        land_id: data.land_id,
        amount: amountPaid,
        currency: 'usd',
        payment_method: paymentStatus === PaymentStatus.PAID ? paymentMethod : 'free',
        timestamp: new Date().toISOString(),
        metadata: {
          rental_id: savedRental.id,
          land_name: land.name,
          payment_status: paymentStatus,
          rental_start_date: data.rental_start_date,
          rental_end_date: data.rental_end_date ?? null,
        },
      } as any);
    } catch (hederaError) {
      console.error('[HederaService] Non-fatal error recording land rental on Hedera:', hederaError);
    }

    return savedRental;
  }

  async findAll(filters?: {
    landId?: string;
    investorId?: string;
    paymentStatus?: PaymentStatus;
  }) {
    const where: any = {};
    if (filters?.landId) {
      where.land_id = filters.landId;
    }
    if (filters?.investorId) {
      where.investor_id = filters.investorId;
    }
    if (filters?.paymentStatus) {
      where.payment_status = filters.paymentStatus;
    }

    return this.rentalRepo.find({
      where,
      relations: ['land', 'investor'],
      order: { createdAt: 'DESC' }
    });
  }

  async findById(id: string) {
    const rental = await this.rentalRepo.findOne({
      where: { id },
      relations: ['land', 'land.owner', 'investor']
    });
    if (!rental) {
      throw new AppError(404, 'Land rental not found');
    }
    return rental;
  }

  async findByLand(landId: string) {
    return this.rentalRepo.find({
      where: { land_id: landId },
      relations: ['investor'],
      order: { rental_start_date: 'DESC' }
    });
  }

  async findByInvestor(investorId: string, paymentStatus?: PaymentStatus) {
    const where: any = { investor_id: investorId };
    if (paymentStatus) {
      where.payment_status = paymentStatus;
    }

    return this.rentalRepo.find({
      where,
      relations: ['land', 'land.owner'],
      order: { rental_start_date: 'DESC' }
    });
  }

  async findByLandOwner(ownerId: string) {
    return this.rentalRepo
      .createQueryBuilder('rental')
      .leftJoinAndSelect('rental.land', 'land')
      .leftJoinAndSelect('rental.investor', 'investor')
      .where('land.owner_id = :ownerId', { ownerId })
      .orderBy('rental.rental_start_date', 'DESC')
      .getMany();
  }

  async update(
    id: string,
    userId: string,
    data: Partial<CreateLandRentalData & { payment_date: Date | null }>
  ) {
    const rental = await this.findById(id);

    // Verify user is either the land owner or the investor
    if (rental.land.owner_id !== userId && rental.investor_id !== userId) {
      throw new AppError(403, 'You do not have permission to update this rental');
    }

    Object.assign(rental, data);
    return this.rentalRepo.save(rental);
  }

  async updatePaymentStatus(
    id: string,
    userId: string,
    paymentStatus: PaymentStatus,
    paymentDate?: Date | null
  ) {
    const rental = await this.findById(id);

    // Verify user is either the land owner or the investor
    if (rental.land.owner_id !== userId && rental.investor_id !== userId) {
      throw new AppError(403, 'You do not have permission to update this rental');
    }

    rental.payment_status = paymentStatus;
    if (paymentDate !== undefined) {
      rental.payment_date = paymentDate;
    }

    return this.rentalRepo.save(rental);
  }

  async delete(id: string, userId: string) {
    const rental = await this.findById(id);

    // Only land owner can delete rental agreements
    if (rental.land.owner_id !== userId) {
      throw new AppError(403, 'Only the land owner can delete rental agreements');
    }

    await this.rentalRepo.delete(id);
    return { message: 'Land rental deleted successfully' };
  }

  async getActiveRentals(landId?: string) {
    const where: any = {};
    if (landId) {
      where.land_id = landId;
    }

    const currentDate = new Date();

    return this.rentalRepo.find({
      where: [
        { ...where, rental_end_date: IsNull() },
        { ...where, rental_end_date: MoreThanOrEqual(currentDate) }
      ],
      relations: ['land', 'investor'],
      order: { rental_start_date: 'DESC' }
    });
  }

  async getOverduePayments() {
    const currentDate = new Date();

    return this.rentalRepo.find({
      where: {
        payment_status: PaymentStatus.PENDING,
        payment_due_date: LessThanOrEqual(currentDate)
      },
      relations: ['land', 'land.owner', 'investor'],
      order: { payment_due_date: 'ASC' }
    });
  }
}

export const landRentalService = new LandRentalService();
