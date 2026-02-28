-- Seed File for Farmy Subscription Plans
-- Database: MySQL/PostgreSQL

INSERT INTO subscription_plans (id, name, plan_key, description, role, price_monthly, price_yearly, entitlements, createdAt, updatedAt)
VALUES
(
    UUID(), 
    'Farmy Free (Farmer)', 
    'farmy_free_farmer', 
    'Standard access for emerging farmers. Up to 2 lands and 5 products.', 
    'farmer', 
    0.00, 
    0.00, 
    '{"land_limit": 2, "product_limit": 5, "task_limit_per_land": 10, "contract_negotiations_limit": 2, "premium_assets": false, "support": "community"}', 
    CURRENT_TIMESTAMP, 
    CURRENT_TIMESTAMP
),
(
    UUID(), 
    'Farmy Free (Investor)', 
    'farmy_free_investor', 
    'Standard access for emerging investors. Up to 1 rental and 5 products.', 
    'investor', 
    0.00, 
    0.00, 
    '{"rental_limit": 1, "product_limit": 5, "contract_negotiations_limit": 2, "support": "community"}', 
    CURRENT_TIMESTAMP, 
    CURRENT_TIMESTAMP
),
(
    UUID(), 
    'Farmy Free (Customer)', 
    'farmy_free_customer', 
    'Unlimited marketplace purchases and standard worker profile access.', 
    'customer', 
    0.00, 
    0.00, 
    '{"marketplace_purchases": "unlimited", "farmbox_active": false, "worker_plus_active": false, "support": "community"}', 
    CURRENT_TIMESTAMP, 
    CURRENT_TIMESTAMP
),
(
    UUID(), 
    'Farmer Pro', 
    'farmer_pro', 
    'Unlimited lands, premium assets, and AI crop planning.', 
    'farmer', 
    14.99, 
    119.99, 
    '{"land_limit": -1, "premium_assets": true, "ai_crop_planner": true, "advanced_analytics": true, "unlimited_products": true, "unlimited_tasks": true, "priority_kyc": true, "worker_search_filters": true, "production_analytics": true, "hedera_export": true}', 
    CURRENT_TIMESTAMP, 
    CURRENT_TIMESTAMP
),
(
    UUID(), 
    'Investor Plus', 
    'investor_plus', 
    'Unlimited rentals, early access, and portfolio analytics.', 
    'investor', 
    24.99, 
    199.99, 
    '{"rental_limit": -1, "early_land_access": true, "roi_analytics": true, "portfolio_dashboard": true, "unlimited_contracts": true, "priority_hiring": true, "advanced_contract_templates": true, "ai_investment_advisor": true, "hedera_portfolio_report": true, "priority_kyc": true, "bulk_item_requests": true}', 
    CURRENT_TIMESTAMP, 
    CURRENT_TIMESTAMP
),
(
    UUID(), 
    'FarmBox Small', 
    'farmbox_small', 
    '5-7 items bi-weekly, vegetables only.', 
    'customer', 
    29.99, 
    299.99, 
    '{"farmbox_active": true, "farmbox_tier": "small", "marketplace_discount": 5}', 
    CURRENT_TIMESTAMP, 
    CURRENT_TIMESTAMP
),
(
    UUID(), 
    'FarmBox Medium', 
    'farmbox_medium', 
    '10-14 items weekly, vegetables + fruits.', 
    'customer', 
    49.99, 
    499.99, 
    '{"farmbox_active": true, "farmbox_tier": "medium", "marketplace_discount": 10, "product_origin_trace": true}', 
    CURRENT_TIMESTAMP, 
    CURRENT_TIMESTAMP
),
(
    UUID(), 
    'FarmBox Large', 
    'farmbox_large', 
    '18-22 items weekly, full range + custom picks.', 
    'customer', 
    79.99, 
    799.99, 
    '{"farmbox_active": true, "farmbox_tier": "large", "marketplace_discount": 15, "farmer_direct_chat": true, "product_origin_trace": true, "hedera_verification": true}', 
    CURRENT_TIMESTAMP, 
    CURRENT_TIMESTAMP
),
(
    UUID(), 
    'Worker Plus', 
    'worker_plus', 
    'Boosted profile, featured badge, and instant withdrawals.', 
    'customer', 
    4.99, 
    39.99, 
    '{"worker_plus_active": true, "profile_boost": true, "featured_badge": true, "advanced_task_filters": true, "earnings_analytics": true, "multi_land_dashboard": true, "instant_withdrawal": true, "contract_negotiation_insights": true}', 
    CURRENT_TIMESTAMP, 
    CURRENT_TIMESTAMP
);
