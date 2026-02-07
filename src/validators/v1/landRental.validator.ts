import Joi from 'joi';

// Create Land Rental schema
export const createLandRentalSchema = Joi.object({
  land_id: Joi.string().uuid().required(),
  investor_id: Joi.string().uuid().optional(),
  rental_start_date: Joi.date().iso().required(),
  rental_end_date: Joi.date().iso().greater(Joi.ref('rental_start_date')).optional().allow(null),
  monthly_rent: Joi.number().positive().precision(2).required(),
  payment_due_date: Joi.date().iso().required(),
  payment_status: Joi.string().valid('pending', 'paid', 'overdue', 'cancelled').optional(),
  payment_method_id: Joi.string().optional()
});

// Update Land Rental schema
export const updateLandRentalSchema = Joi.object({
  rental_start_date: Joi.date().iso().optional(),
  rental_end_date: Joi.date().iso().optional().allow(null),
  monthly_rent: Joi.number().positive().precision(2).optional(),
  payment_due_date: Joi.date().iso().optional(),
  payment_status: Joi.string().valid('pending', 'paid', 'overdue', 'cancelled').optional(),
  payment_date: Joi.date().iso().optional().allow(null)
});

// Update Payment Status schema
export const updatePaymentStatusSchema = Joi.object({
  payment_status: Joi.string().valid('pending', 'paid', 'overdue', 'cancelled').required(),
  payment_date: Joi.date().iso().optional().allow(null)
});
