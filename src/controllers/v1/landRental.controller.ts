import { Request, Response, NextFunction } from 'express';
import { landRentalService } from '../../services/v1/landRental.service.js';
import { AuthRequest } from '../../middlewares/auth.middleware.js';
import { PaymentStatus } from '../../models/LandRental.js';

export const createLandRental = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await landRentalService.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Land rental created successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getAllLandRentals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = {
      landId: req.query.landId as string | undefined,
      investorId: req.query.investorId as string | undefined,
      paymentStatus: req.query.paymentStatus as PaymentStatus | undefined
    };

    const result = await landRentalService.findAll(filters);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getLandRentalById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await landRentalService.findById(req.params.id as string);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getMyRentalsAsOwner = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await landRentalService.findByLandOwner(req.user!.id);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getMyRentalsAsInvestor = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const paymentStatus = req.query.payment_status as PaymentStatus | undefined;
    const result = await landRentalService.findByInvestor(req.user!.id, paymentStatus);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getRentalsByLand = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await landRentalService.findByLand(req.params.landId as string);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getActiveRentals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const landId = req.query.landId as string | undefined;
    const result = await landRentalService.getActiveRentals(landId);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getOverduePayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await landRentalService.getOverduePayments();

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const updateLandRental = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await landRentalService.update(req.params.id as string, req.user!.id, req.body);

    res.status(200).json({
      success: true,
      message: 'Land rental updated successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const updatePaymentStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { payment_status, payment_date } = req.body;
    const result = await landRentalService.updatePaymentStatus(
      req.params.id as string,
      req.user!.id,
      payment_status,
      payment_date
    );

    res.status(200).json({
      success: true,
      message: 'Payment status updated successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const deleteLandRental = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await landRentalService.delete(req.params.id as string, req.user!.id);

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};
