-- ============================================
-- E-Commerce Database Schema
-- 25 Tables with comprehensive sample data
-- ============================================

-- Drop tables if they exist (for clean re-creation)
DROP TABLE IF EXISTS support_ticket_messages CASCADE;
DROP TABLE IF EXISTS support_tickets CASCADE;
DROP TABLE IF EXISTS product_reviews CASCADE;
DROP TABLE IF EXISTS wishlist_items CASCADE;
DROP TABLE IF EXISTS wishlists CASCADE;
DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS shopping_carts CASCADE;
DROP TABLE IF EXISTS order_status_history CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS payment_transactions CASCADE;
DROP TABLE IF EXISTS payment_methods CASCADE;
DROP TABLE IF EXISTS shipping_addresses CASCADE;
DROP TABLE IF EXISTS inventory_movements CASCADE;
DROP TABLE IF EXISTS warehouse_inventory CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS product_images CASCADE;
DROP TABLE IF EXISTS product_tags CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS product_variants CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS subcategories CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS promotions CASCADE;
DROP TABLE IF EXISTS coupon_usage CASCADE;
DROP TABLE IF EXISTS coupons CASCADE;

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(10),
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);

-- ============================================
-- 2. USER PREFERENCES TABLE
-- ============================================
CREATE TABLE user_preferences (
    preference_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    newsletter_subscribed BOOLEAN DEFAULT FALSE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    email_notifications BOOLEAN DEFAULT TRUE,
    preferred_language VARCHAR(10) DEFAULT 'en',
    preferred_currency VARCHAR(3) DEFAULT 'USD',
    dark_mode BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. USER SESSIONS TABLE
-- ============================================
CREATE TABLE user_sessions (
    session_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_type VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

-- ============================================
-- 4. CATEGORIES TABLE
-- ============================================
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 5. SUBCATEGORIES TABLE
-- ============================================
CREATE TABLE subcategories (
    subcategory_id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES categories(category_id) ON DELETE CASCADE,
    subcategory_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 6. SUPPLIERS TABLE
-- ============================================
CREATE TABLE suppliers (
    supplier_id SERIAL PRIMARY KEY,
    company_name VARCHAR(200) NOT NULL,
    contact_name VARCHAR(100),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    rating DECIMAL(3,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 7. PRODUCTS TABLE
-- ============================================
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    subcategory_id INTEGER REFERENCES subcategories(subcategory_id),
    supplier_id INTEGER REFERENCES suppliers(supplier_id),
    base_price DECIMAL(10,2) NOT NULL,
    sale_price DECIMAL(10,2),
    cost_price DECIMAL(10,2),
    weight_kg DECIMAL(8,3),
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 8. PRODUCT VARIANTS TABLE
-- ============================================
CREATE TABLE product_variants (
    variant_id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(product_id) ON DELETE CASCADE,
    variant_name VARCHAR(100) NOT NULL,
    size VARCHAR(20),
    color VARCHAR(50),
    material VARCHAR(100),
    price_modifier DECIMAL(10,2) DEFAULT 0,
    sku_suffix VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 9. TAGS TABLE
-- ============================================
CREATE TABLE tags (
    tag_id SERIAL PRIMARY KEY,
    tag_name VARCHAR(50) UNIQUE NOT NULL,
    tag_type VARCHAR(30),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 10. PRODUCT TAGS TABLE (Junction)
-- ============================================
CREATE TABLE product_tags (
    product_tag_id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(product_id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(tag_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, tag_id)
);

-- ============================================
-- 11. PRODUCT IMAGES TABLE
-- ============================================
CREATE TABLE product_images (
    image_id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(product_id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL,
    alt_text VARCHAR(255),
    is_primary BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 12. WAREHOUSES TABLE
-- ============================================
CREATE TABLE warehouses (
    warehouse_id SERIAL PRIMARY KEY,
    warehouse_name VARCHAR(100) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    capacity INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 13. WAREHOUSE INVENTORY TABLE
-- ============================================
CREATE TABLE warehouse_inventory (
    inventory_id SERIAL PRIMARY KEY,
    warehouse_id INTEGER REFERENCES warehouses(warehouse_id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(product_id) ON DELETE CASCADE,
    variant_id INTEGER REFERENCES product_variants(variant_id),
    quantity INTEGER DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 10,
    last_restocked_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(warehouse_id, product_id, variant_id)
);

-- ============================================
-- 14. INVENTORY MOVEMENTS TABLE
-- ============================================
CREATE TABLE inventory_movements (
    movement_id SERIAL PRIMARY KEY,
    warehouse_id INTEGER REFERENCES warehouses(warehouse_id),
    product_id INTEGER REFERENCES products(product_id),
    variant_id INTEGER REFERENCES product_variants(variant_id),
    movement_type VARCHAR(30) NOT NULL, -- 'in', 'out', 'transfer', 'adjustment'
    quantity INTEGER NOT NULL,
    reference_type VARCHAR(50), -- 'order', 'return', 'restock', 'manual'
    reference_id INTEGER,
    notes TEXT,
    created_by INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 15. SHIPPING ADDRESSES TABLE
-- ============================================
CREATE TABLE shipping_addresses (
    address_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    address_label VARCHAR(50),
    recipient_name VARCHAR(100) NOT NULL,
    street_address TEXT NOT NULL,
    apartment_unit VARCHAR(50),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 16. PAYMENT METHODS TABLE
-- ============================================
CREATE TABLE payment_methods (
    payment_method_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    method_type VARCHAR(30) NOT NULL, -- 'credit_card', 'debit_card', 'paypal', 'bank_transfer'
    card_last_four VARCHAR(4),
    card_brand VARCHAR(20),
    expiry_month INTEGER,
    expiry_year INTEGER,
    billing_address TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 17. SHOPPING CARTS TABLE
-- ============================================
CREATE TABLE shopping_carts (
    cart_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'abandoned', 'converted'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 18. CART ITEMS TABLE
-- ============================================
CREATE TABLE cart_items (
    cart_item_id SERIAL PRIMARY KEY,
    cart_id INTEGER REFERENCES shopping_carts(cart_id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(product_id),
    variant_id INTEGER REFERENCES product_variants(variant_id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 19. COUPONS TABLE
-- ============================================
CREATE TABLE coupons (
    coupon_id SERIAL PRIMARY KEY,
    coupon_code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL, -- 'percentage', 'fixed_amount'
    discount_value DECIMAL(10,2) NOT NULL,
    minimum_order_amount DECIMAL(10,2),
    maximum_discount DECIMAL(10,2),
    usage_limit INTEGER,
    times_used INTEGER DEFAULT 0,
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 20. ORDERS TABLE
-- ============================================
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(30) DEFAULT 'pending', -- 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
    shipping_address_id INTEGER REFERENCES shipping_addresses(address_id),
    payment_method_id INTEGER REFERENCES payment_methods(payment_method_id),
    subtotal DECIMAL(10,2) NOT NULL,
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    coupon_id INTEGER REFERENCES coupons(coupon_id),
    notes TEXT,
    ordered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP
);

-- ============================================
-- 21. ORDER ITEMS TABLE
-- ============================================
CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(order_id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(product_id),
    variant_id INTEGER REFERENCES product_variants(variant_id),
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 22. ORDER STATUS HISTORY TABLE
-- ============================================
CREATE TABLE order_status_history (
    history_id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(order_id) ON DELETE CASCADE,
    old_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    changed_by INTEGER REFERENCES users(user_id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 23. PAYMENT TRANSACTIONS TABLE
-- ============================================
CREATE TABLE payment_transactions (
    transaction_id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(order_id),
    user_id INTEGER REFERENCES users(user_id),
    payment_method_id INTEGER REFERENCES payment_methods(payment_method_id),
    transaction_type VARCHAR(30) NOT NULL, -- 'charge', 'refund', 'chargeback'
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(30) NOT NULL, -- 'pending', 'completed', 'failed', 'cancelled'
    gateway_transaction_id VARCHAR(255),
    gateway_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

-- ============================================
-- 24. COUPON USAGE TABLE
-- ============================================
CREATE TABLE coupon_usage (
    usage_id SERIAL PRIMARY KEY,
    coupon_id INTEGER REFERENCES coupons(coupon_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(user_id),
    order_id INTEGER REFERENCES orders(order_id),
    discount_applied DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 25. PROMOTIONS TABLE
-- ============================================
CREATE TABLE promotions (
    promotion_id SERIAL PRIMARY KEY,
    promotion_name VARCHAR(200) NOT NULL,
    description TEXT,
    promotion_type VARCHAR(30) NOT NULL, -- 'sale', 'bogo', 'bundle', 'flash_sale'
    discount_percentage DECIMAL(5,2),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 26. WISHLISTS TABLE
-- ============================================
CREATE TABLE wishlists (
    wishlist_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    wishlist_name VARCHAR(100) DEFAULT 'My Wishlist',
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 27. WISHLIST ITEMS TABLE
-- ============================================
CREATE TABLE wishlist_items (
    wishlist_item_id SERIAL PRIMARY KEY,
    wishlist_id INTEGER REFERENCES wishlists(wishlist_id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(product_id) ON DELETE CASCADE,
    variant_id INTEGER REFERENCES product_variants(variant_id),
    priority INTEGER DEFAULT 0,
    notes TEXT,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 28. PRODUCT REVIEWS TABLE
-- ============================================
CREATE TABLE product_reviews (
    review_id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(product_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(user_id),
    order_id INTEGER REFERENCES orders(order_id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    review_text TEXT,
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE,
    helpful_votes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 29. SUPPORT TICKETS TABLE
-- ============================================
CREATE TABLE support_tickets (
    ticket_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    order_id INTEGER REFERENCES orders(order_id),
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    subject VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'order_issue', 'product_inquiry', 'refund_request', 'technical', 'other'
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    status VARCHAR(30) DEFAULT 'open', -- 'open', 'in_progress', 'waiting_customer', 'resolved', 'closed'
    assigned_to INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- ============================================
-- 30. SUPPORT TICKET MESSAGES TABLE
-- ============================================
CREATE TABLE support_ticket_messages (
    message_id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES support_tickets(ticket_id) ON DELETE CASCADE,
    sender_id INTEGER REFERENCES users(user_id),
    sender_type VARCHAR(20) NOT NULL, -- 'customer', 'agent', 'system'
    message_text TEXT NOT NULL,
    attachments TEXT[], -- Array of attachment URLs
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_subcategory ON products(subcategory_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date ON orders(ordered_at);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_transactions_order ON payment_transactions(order_id);
CREATE INDEX idx_inventory_product ON warehouse_inventory(product_id);
CREATE INDEX idx_reviews_product ON product_reviews(product_id);
CREATE INDEX idx_tickets_user ON support_tickets(user_id);
CREATE INDEX idx_tickets_status ON support_tickets(status);

-- ============================================
-- INSERT SAMPLE DATA
-- ============================================

-- Insert 30 Users
INSERT INTO users (email, password_hash, first_name, last_name, phone, date_of_birth, gender, is_active, is_verified, last_login_at) VALUES
('john.smith@email.com', '$2b$12$hash1', 'John', 'Smith', '+1-555-0101', '1985-03-15', 'male', true, true, NOW() - INTERVAL '2 hours'),
('sarah.johnson@email.com', '$2b$12$hash2', 'Sarah', 'Johnson', '+1-555-0102', '1990-07-22', 'female', true, true, NOW() - INTERVAL '1 day'),
('michael.williams@email.com', '$2b$12$hash3', 'Michael', 'Williams', '+1-555-0103', '1988-11-08', 'male', true, true, NOW() - INTERVAL '3 hours'),
('emily.brown@email.com', '$2b$12$hash4', 'Emily', 'Brown', '+1-555-0104', '1992-05-30', 'female', true, true, NOW() - INTERVAL '5 hours'),
('david.jones@email.com', '$2b$12$hash5', 'David', 'Jones', '+1-555-0105', '1983-09-12', 'male', true, false, NOW() - INTERVAL '1 week'),
('lisa.garcia@email.com', '$2b$12$hash6', 'Lisa', 'Garcia', '+1-555-0106', '1995-01-25', 'female', true, true, NOW() - INTERVAL '12 hours'),
('james.miller@email.com', '$2b$12$hash7', 'James', 'Miller', '+1-555-0107', '1987-04-18', 'male', true, true, NOW() - INTERVAL '6 hours'),
('jennifer.davis@email.com', '$2b$12$hash8', 'Jennifer', 'Davis', '+1-555-0108', '1991-08-03', 'female', true, true, NOW() - INTERVAL '4 hours'),
('robert.martinez@email.com', '$2b$12$hash9', 'Robert', 'Martinez', '+1-555-0109', '1984-12-20', 'male', true, true, NOW() - INTERVAL '2 days'),
('amanda.rodriguez@email.com', '$2b$12$hash10', 'Amanda', 'Rodriguez', '+1-555-0110', '1993-06-14', 'female', true, true, NOW() - INTERVAL '8 hours'),
('william.anderson@email.com', '$2b$12$hash11', 'William', 'Anderson', '+1-555-0111', '1986-02-28', 'male', true, true, NOW() - INTERVAL '1 day'),
('jessica.taylor@email.com', '$2b$12$hash12', 'Jessica', 'Taylor', '+1-555-0112', '1994-10-07', 'female', true, false, NOW() - INTERVAL '3 days'),
('christopher.thomas@email.com', '$2b$12$hash13', 'Christopher', 'Thomas', '+1-555-0113', '1989-07-11', 'male', true, true, NOW() - INTERVAL '5 hours'),
('ashley.hernandez@email.com', '$2b$12$hash14', 'Ashley', 'Hernandez', '+1-555-0114', '1996-03-19', 'female', true, true, NOW() - INTERVAL '10 hours'),
('matthew.moore@email.com', '$2b$12$hash15', 'Matthew', 'Moore', '+1-555-0115', '1982-11-24', 'male', true, true, NOW() - INTERVAL '7 hours'),
('stephanie.martin@email.com', '$2b$12$hash16', 'Stephanie', 'Martin', '+1-555-0116', '1990-09-05', 'female', true, true, NOW() - INTERVAL '9 hours'),
('daniel.jackson@email.com', '$2b$12$hash17', 'Daniel', 'Jackson', '+1-555-0117', '1988-01-30', 'male', true, true, NOW() - INTERVAL '4 days'),
('nicole.lee@email.com', '$2b$12$hash18', 'Nicole', 'Lee', '+1-555-0118', '1992-04-22', 'female', true, true, NOW() - INTERVAL '2 hours'),
('andrew.white@email.com', '$2b$12$hash19', 'Andrew', 'White', '+1-555-0119', '1985-08-16', 'male', true, true, NOW() - INTERVAL '6 hours'),
('megan.harris@email.com', '$2b$12$hash20', 'Megan', 'Harris', '+1-555-0120', '1997-12-03', 'female', true, false, NOW() - INTERVAL '5 days'),
('joshua.clark@email.com', '$2b$12$hash21', 'Joshua', 'Clark', '+1-555-0121', '1981-05-09', 'male', true, true, NOW() - INTERVAL '3 hours'),
('rachel.lewis@email.com', '$2b$12$hash22', 'Rachel', 'Lewis', '+1-555-0122', '1993-02-14', 'female', true, true, NOW() - INTERVAL '11 hours'),
('kevin.robinson@email.com', '$2b$12$hash23', 'Kevin', 'Robinson', '+1-555-0123', '1986-10-27', 'male', true, true, NOW() - INTERVAL '1 day'),
('laura.walker@email.com', '$2b$12$hash24', 'Laura', 'Walker', '+1-555-0124', '1991-07-08', 'female', true, true, NOW() - INTERVAL '8 hours'),
('brian.hall@email.com', '$2b$12$hash25', 'Brian', 'Hall', '+1-555-0125', '1984-03-21', 'male', true, true, NOW() - INTERVAL '2 days'),
('michelle.allen@email.com', '$2b$12$hash26', 'Michelle', 'Allen', '+1-555-0126', '1995-11-15', 'female', true, true, NOW() - INTERVAL '4 hours'),
('steven.young@email.com', '$2b$12$hash27', 'Steven', 'Young', '+1-555-0127', '1987-06-29', 'male', true, true, NOW() - INTERVAL '7 hours'),
('kimberly.king@email.com', '$2b$12$hash28', 'Kimberly', 'King', '+1-555-0128', '1989-09-18', 'female', true, true, NOW() - INTERVAL '3 days'),
('jason.wright@email.com', '$2b$12$hash29', 'Jason', 'Wright', '+1-555-0129', '1983-01-04', 'male', true, true, NOW() - INTERVAL '5 hours'),
('heather.scott@email.com', '$2b$12$hash30', 'Heather', 'Scott', '+1-555-0130', '1994-08-11', 'female', true, true, NOW() - INTERVAL '6 hours');

-- Insert User Preferences (30 rows)
INSERT INTO user_preferences (user_id, newsletter_subscribed, sms_notifications, email_notifications, preferred_language, preferred_currency, dark_mode)
SELECT user_id,
       (RANDOM() > 0.5),
       (RANDOM() > 0.7),
       (RANDOM() > 0.2),
       CASE WHEN RANDOM() > 0.8 THEN 'es' WHEN RANDOM() > 0.9 THEN 'fr' ELSE 'en' END,
       CASE WHEN RANDOM() > 0.85 THEN 'EUR' WHEN RANDOM() > 0.9 THEN 'GBP' ELSE 'USD' END,
       (RANDOM() > 0.6)
FROM users;

-- Insert User Sessions (100 rows)
INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, device_type, is_active, expires_at)
SELECT
    (RANDOM() * 29 + 1)::INTEGER,
    md5(random()::text || clock_timestamp()::text),
    '192.168.' || (RANDOM() * 255)::INTEGER || '.' || (RANDOM() * 255)::INTEGER,
    CASE (RANDOM() * 3)::INTEGER
        WHEN 0 THEN 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0'
        WHEN 1 THEN 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1'
        WHEN 2 THEN 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile/15E148'
        ELSE 'Mozilla/5.0 (Android 14; Mobile) Chrome/120.0'
    END,
    CASE (RANDOM() * 3)::INTEGER WHEN 0 THEN 'desktop' WHEN 1 THEN 'mobile' WHEN 2 THEN 'tablet' ELSE 'desktop' END,
    (RANDOM() > 0.3),
    NOW() + INTERVAL '1 day' * (RANDOM() * 7)::INTEGER
FROM generate_series(1, 100);

-- Insert Categories (10 rows)
INSERT INTO categories (category_name, description, is_active, display_order) VALUES
('Electronics', 'Computers, phones, tablets, and electronic accessories', true, 1),
('Clothing', 'Men''s, women''s, and children''s apparel', true, 2),
('Home & Garden', 'Furniture, decor, and gardening supplies', true, 3),
('Sports & Outdoors', 'Athletic equipment and outdoor gear', true, 4),
('Books & Media', 'Books, music, movies, and games', true, 5),
('Health & Beauty', 'Personal care, cosmetics, and wellness products', true, 6),
('Toys & Games', 'Toys, board games, and puzzles for all ages', true, 7),
('Automotive', 'Car accessories, parts, and maintenance supplies', true, 8),
('Food & Grocery', 'Pantry staples, snacks, and beverages', true, 9),
('Office Supplies', 'Stationery, organization, and office equipment', true, 10);

-- Insert Subcategories (30 rows)
INSERT INTO subcategories (category_id, subcategory_name, description, is_active, display_order) VALUES
(1, 'Laptops', 'Portable computers for work and gaming', true, 1),
(1, 'Smartphones', 'Mobile phones and accessories', true, 2),
(1, 'Tablets', 'Tablet computers and e-readers', true, 3),
(2, 'Men''s Shirts', 'Casual and formal shirts for men', true, 1),
(2, 'Women''s Dresses', 'Casual, formal, and party dresses', true, 2),
(2, 'Footwear', 'Shoes, sneakers, and boots', true, 3),
(3, 'Living Room Furniture', 'Sofas, coffee tables, and entertainment units', true, 1),
(3, 'Kitchen Appliances', 'Small and large kitchen appliances', true, 2),
(3, 'Garden Tools', 'Gardening equipment and supplies', true, 3),
(4, 'Fitness Equipment', 'Exercise machines and accessories', true, 1),
(4, 'Camping Gear', 'Tents, sleeping bags, and outdoor cooking', true, 2),
(4, 'Team Sports', 'Equipment for soccer, basketball, and more', true, 3),
(5, 'Fiction Books', 'Novels and short story collections', true, 1),
(5, 'Video Games', 'Console and PC games', true, 2),
(5, 'Music', 'CDs, vinyl records, and digital music', true, 3),
(6, 'Skincare', 'Face cleansers, moisturizers, and treatments', true, 1),
(6, 'Makeup', 'Cosmetics and beauty tools', true, 2),
(6, 'Vitamins & Supplements', 'Health supplements and vitamins', true, 3),
(7, 'Action Figures', 'Collectible action figures and playsets', true, 1),
(7, 'Board Games', 'Strategy and family board games', true, 2),
(7, 'Building Sets', 'LEGO and construction toys', true, 3),
(8, 'Car Electronics', 'Car audio, GPS, and dash cams', true, 1),
(8, 'Maintenance', 'Oil, filters, and car care products', true, 2),
(8, 'Interior Accessories', 'Seat covers, mats, and organizers', true, 3),
(9, 'Snacks', 'Chips, cookies, and candy', true, 1),
(9, 'Beverages', 'Coffee, tea, and soft drinks', true, 2),
(9, 'Pantry Staples', 'Rice, pasta, and canned goods', true, 3),
(10, 'Writing Supplies', 'Pens, pencils, and markers', true, 1),
(10, 'Paper Products', 'Notebooks, printer paper, and sticky notes', true, 2),
(10, 'Desk Organization', 'File folders, trays, and storage', true, 3);

-- Insert Suppliers (15 rows)
INSERT INTO suppliers (company_name, contact_name, contact_email, contact_phone, address, city, country, rating, is_active) VALUES
('TechWorld Distribution', 'Mike Chen', 'mike@techworld.com', '+1-555-1001', '123 Tech Park Drive', 'San Jose', 'USA', 4.8, true),
('Fashion Forward Inc', 'Anna Martinez', 'anna@fashionforward.com', '+1-555-1002', '456 Style Avenue', 'New York', 'USA', 4.6, true),
('Home Essentials Co', 'Tom Wilson', 'tom@homeessentials.com', '+1-555-1003', '789 Living Way', 'Chicago', 'USA', 4.5, true),
('SportMax Supplies', 'Chris Johnson', 'chris@sportmax.com', '+1-555-1004', '321 Athletic Blvd', 'Denver', 'USA', 4.7, true),
('BookHaven Publishers', 'Sarah Lee', 'sarah@bookhaven.com', '+1-555-1005', '654 Library Lane', 'Boston', 'USA', 4.4, true),
('Beauty Plus Wholesale', 'Linda Brown', 'linda@beautyplus.com', '+1-555-1006', '987 Glamour Street', 'Los Angeles', 'USA', 4.3, true),
('ToyLand Distributors', 'Mark Davis', 'mark@toyland.com', '+1-555-1007', '147 Fun Road', 'Orlando', 'USA', 4.6, true),
('AutoParts Direct', 'James Wilson', 'james@autoparts.com', '+1-555-1008', '258 Motor Way', 'Detroit', 'USA', 4.5, true),
('Fresh Foods Supply', 'Maria Garcia', 'maria@freshfoods.com', '+1-555-1009', '369 Harvest Lane', 'Seattle', 'USA', 4.7, true),
('Office Pro Wholesale', 'David Kim', 'david@officepro.com', '+1-555-1010', '741 Business Park', 'Austin', 'USA', 4.4, true),
('Global Electronics Ltd', 'Wei Zhang', 'wei@globalelec.com', '+86-555-2001', '100 Tech Center', 'Shenzhen', 'China', 4.2, true),
('Euro Fashion Group', 'Sophie Martin', 'sophie@eurofashion.com', '+33-555-3001', '50 Rue de Mode', 'Paris', 'France', 4.5, true),
('Nordic Home Designs', 'Erik Johansson', 'erik@nordichome.com', '+46-555-4001', '25 Design Street', 'Stockholm', 'Sweden', 4.6, true),
('Pacific Sports Gear', 'Kenji Tanaka', 'kenji@pacificsports.com', '+81-555-5001', '88 Sports Plaza', 'Tokyo', 'Japan', 4.4, true),
('Mediterranean Foods', 'Marco Rossi', 'marco@medfoods.com', '+39-555-6001', '12 Via Gustoso', 'Milan', 'Italy', 4.3, true);

-- Insert Products (100 rows)
INSERT INTO products (sku, product_name, description, subcategory_id, supplier_id, base_price, sale_price, cost_price, weight_kg, is_active, is_featured) VALUES
('ELEC-LAP-001', 'ProBook Elite 15', 'High-performance laptop with 15.6" display, Intel i7, 16GB RAM', 1, 1, 1299.99, 1199.99, 850.00, 2.1, true, true),
('ELEC-LAP-002', 'UltraSlim Air 13', 'Lightweight laptop perfect for travelers, M2 chip, 8GB RAM', 1, 1, 999.99, NULL, 650.00, 1.2, true, false),
('ELEC-LAP-003', 'GameMaster Pro', 'Gaming laptop with RTX 4070, 32GB RAM, 1TB SSD', 1, 11, 1899.99, 1799.99, 1200.00, 2.8, true, true),
('ELEC-PHN-001', 'SmartPhone X Pro', 'Flagship smartphone with 6.7" OLED, 256GB storage', 2, 1, 1099.99, 999.99, 700.00, 0.22, true, true),
('ELEC-PHN-002', 'BudgetPhone SE', 'Affordable smartphone with great camera and battery', 2, 11, 399.99, 349.99, 200.00, 0.18, true, false),
('ELEC-PHN-003', 'SmartPhone Mini', 'Compact smartphone with premium features', 2, 1, 799.99, NULL, 500.00, 0.15, true, false),
('ELEC-TAB-001', 'ProTab 12.9', 'Professional tablet with stylus support, 256GB', 3, 1, 1099.99, 999.99, 700.00, 0.68, true, true),
('ELEC-TAB-002', 'MediaTab 10', 'Entertainment tablet with vivid display', 3, 11, 449.99, NULL, 280.00, 0.48, true, false),
('CLTH-MSH-001', 'Classic Oxford Shirt', 'Timeless cotton oxford shirt for men', 4, 2, 59.99, NULL, 25.00, 0.35, true, false),
('CLTH-MSH-002', 'Slim Fit Dress Shirt', 'Modern slim fit shirt for formal occasions', 4, 2, 79.99, 69.99, 32.00, 0.32, true, false),
('CLTH-MSH-003', 'Casual Linen Shirt', 'Breathable linen shirt for summer', 4, 12, 69.99, NULL, 28.00, 0.28, true, false),
('CLTH-WDR-001', 'Elegant Evening Dress', 'Stunning evening dress for special occasions', 5, 2, 199.99, 179.99, 80.00, 0.45, true, true),
('CLTH-WDR-002', 'Summer Floral Dress', 'Light and breezy floral print dress', 5, 12, 89.99, NULL, 35.00, 0.30, true, false),
('CLTH-WDR-003', 'Professional Midi Dress', 'Office-appropriate midi dress', 5, 2, 129.99, 119.99, 52.00, 0.40, true, false),
('CLTH-FTW-001', 'Classic Leather Sneakers', 'Premium leather casual sneakers', 6, 2, 149.99, NULL, 60.00, 0.85, true, false),
('CLTH-FTW-002', 'Running Performance Shoes', 'Lightweight running shoes with cushioning', 6, 4, 129.99, 109.99, 52.00, 0.65, true, true),
('CLTH-FTW-003', 'Formal Oxford Shoes', 'Classic oxford shoes for business attire', 6, 12, 189.99, NULL, 75.00, 0.95, true, false),
('HOME-LRF-001', 'Modern Sectional Sofa', 'L-shaped sectional sofa with chaise lounge', 7, 3, 1499.99, 1299.99, 600.00, 85.0, true, true),
('HOME-LRF-002', 'Minimalist Coffee Table', 'Sleek wooden coffee table with storage', 7, 13, 299.99, NULL, 120.00, 25.0, true, false),
('HOME-LRF-003', 'Entertainment Center', 'TV stand with shelving and cable management', 7, 3, 449.99, 399.99, 180.00, 45.0, true, false),
('HOME-KIT-001', 'Smart Blender Pro', 'High-speed blender with smart presets', 8, 3, 199.99, 179.99, 80.00, 4.5, true, false),
('HOME-KIT-002', 'Espresso Machine Deluxe', 'Professional-grade espresso machine', 8, 15, 599.99, NULL, 240.00, 8.2, true, true),
('HOME-KIT-003', 'Air Fryer XL', 'Large capacity air fryer with digital controls', 8, 3, 149.99, 129.99, 60.00, 5.8, true, true),
('HOME-GAR-001', 'Electric Lawn Mower', 'Cordless electric mower with mulching', 9, 3, 399.99, 349.99, 160.00, 18.0, true, false),
('HOME-GAR-002', 'Garden Tool Set', '10-piece stainless steel garden tool set', 9, 3, 79.99, NULL, 32.00, 3.5, true, false),
('SPRT-FIT-001', 'Smart Treadmill', 'Foldable treadmill with touchscreen display', 10, 4, 999.99, 899.99, 400.00, 65.0, true, true),
('SPRT-FIT-002', 'Adjustable Dumbbell Set', 'Space-saving adjustable dumbbells 5-50 lbs', 10, 4, 349.99, NULL, 140.00, 25.0, true, false),
('SPRT-FIT-003', 'Yoga Mat Premium', 'Extra thick non-slip yoga mat', 10, 14, 49.99, 39.99, 20.00, 1.2, true, false),
('SPRT-CMP-001', '4-Person Camping Tent', 'Waterproof dome tent with easy setup', 11, 4, 199.99, 179.99, 80.00, 4.5, true, false),
('SPRT-CMP-002', 'Sleeping Bag -20F', 'Cold weather mummy sleeping bag', 11, 14, 149.99, NULL, 60.00, 2.8, true, false),
('SPRT-CMP-003', 'Portable Camp Stove', 'Dual burner propane camp stove', 11, 4, 89.99, NULL, 36.00, 3.2, true, false),
('SPRT-TMS-001', 'Professional Soccer Ball', 'FIFA-approved match soccer ball', 12, 4, 49.99, NULL, 20.00, 0.45, true, false),
('SPRT-TMS-002', 'Basketball Official Size', 'Indoor/outdoor composite basketball', 12, 14, 39.99, 34.99, 16.00, 0.62, true, false),
('BOOK-FIC-001', 'The Silent Echo', 'Bestselling mystery thriller novel', 13, 5, 24.99, NULL, 8.00, 0.45, true, false),
('BOOK-FIC-002', 'Echoes of Tomorrow', 'Award-winning science fiction saga', 13, 5, 19.99, 16.99, 6.00, 0.38, true, true),
('BOOK-FIC-003', 'The Last Garden', 'Heartwarming literary fiction', 13, 5, 22.99, NULL, 7.00, 0.42, true, false),
('BOOK-GAM-001', 'Space Warriors Deluxe', 'Epic space adventure video game', 14, 5, 69.99, 59.99, 28.00, 0.15, true, true),
('BOOK-GAM-002', 'Racing Champions 2024', 'Realistic racing simulation game', 14, 5, 59.99, NULL, 24.00, 0.15, true, false),
('BOOK-GAM-003', 'Fantasy Quest Online', 'Massive multiplayer online RPG', 14, 5, 49.99, 39.99, 20.00, 0.15, true, false),
('BOOK-MUS-001', 'Classical Collection Box Set', '10-disc classical music compilation', 15, 5, 79.99, NULL, 32.00, 0.65, true, false),
('HLTH-SKN-001', 'Anti-Aging Serum', 'Advanced retinol anti-aging serum', 16, 6, 89.99, 79.99, 36.00, 0.08, true, true),
('HLTH-SKN-002', 'Hydrating Face Cream', 'Deep moisture face cream with hyaluronic acid', 16, 6, 49.99, NULL, 20.00, 0.12, true, false),
('HLTH-SKN-003', 'Vitamin C Cleanser', 'Brightening vitamin C facial cleanser', 16, 6, 34.99, 29.99, 14.00, 0.25, true, false),
('HLTH-MKP-001', 'Professional Palette', '24-shade eyeshadow palette', 17, 6, 59.99, NULL, 24.00, 0.18, true, false),
('HLTH-MKP-002', 'Long-Wear Foundation', 'Full coverage liquid foundation', 17, 6, 44.99, 39.99, 18.00, 0.08, true, true),
('HLTH-MKP-003', 'Luxury Lipstick Set', '6-piece matte lipstick collection', 17, 6, 79.99, 69.99, 32.00, 0.15, true, false),
('HLTH-VIT-001', 'Daily Multivitamin', 'Complete daily multivitamin for adults', 18, 6, 29.99, NULL, 12.00, 0.25, true, false),
('HLTH-VIT-002', 'Omega-3 Fish Oil', 'High-potency omega-3 supplements', 18, 6, 39.99, 34.99, 16.00, 0.35, true, false),
('HLTH-VIT-003', 'Probiotic Complex', 'Advanced probiotic with 50 billion CFU', 18, 6, 44.99, NULL, 18.00, 0.18, true, false),
('TOYS-ACT-001', 'Superhero Action Figure Set', 'Collectible superhero figures 6-pack', 19, 7, 49.99, 44.99, 20.00, 0.85, true, false),
('TOYS-ACT-002', 'Robot Transformer', 'Transforming robot action figure', 19, 7, 34.99, NULL, 14.00, 0.45, true, false),
('TOYS-BRD-001', 'Strategy Empire', 'Epic strategy board game for 2-6 players', 20, 7, 59.99, NULL, 24.00, 1.8, true, true),
('TOYS-BRD-002', 'Family Trivia Night', 'Fun trivia game for the whole family', 20, 7, 29.99, 24.99, 12.00, 0.95, true, false),
('TOYS-BRD-003', 'Mystery Detective Game', 'Cooperative mystery solving game', 20, 7, 44.99, NULL, 18.00, 1.2, true, false),
('TOYS-BLD-001', 'Castle Building Set', '1500-piece medieval castle set', 21, 7, 129.99, 119.99, 52.00, 2.5, true, true),
('TOYS-BLD-002', 'Space Station Kit', 'Build your own space station', 21, 7, 89.99, NULL, 36.00, 1.8, true, false),
('TOYS-BLD-003', 'City Builder Set', 'Create your own city block', 21, 7, 69.99, 59.99, 28.00, 1.5, true, false),
('AUTO-ELC-001', 'HD Dash Camera', '4K dash cam with night vision', 22, 8, 149.99, 129.99, 60.00, 0.35, true, true),
('AUTO-ELC-002', 'GPS Navigation System', 'Portable GPS with lifetime maps', 22, 8, 199.99, NULL, 80.00, 0.45, true, false),
('AUTO-ELC-003', 'Bluetooth Car Adapter', 'Wireless audio adapter for car stereo', 22, 8, 39.99, 34.99, 16.00, 0.08, true, false),
('AUTO-MNT-001', 'Synthetic Motor Oil 5W-30', 'Premium full synthetic motor oil - 5 quart', 23, 8, 34.99, NULL, 14.00, 4.8, true, false),
('AUTO-MNT-002', 'Car Care Kit', 'Complete car cleaning and detailing kit', 23, 8, 49.99, 44.99, 20.00, 2.5, true, false),
('AUTO-MNT-003', 'Tire Inflator Portable', 'Digital tire inflator with gauge', 23, 8, 59.99, NULL, 24.00, 1.2, true, false),
('AUTO-INT-001', 'Premium Seat Covers', 'Universal fit leather seat covers - pair', 24, 8, 89.99, 79.99, 36.00, 2.8, true, false),
('AUTO-INT-002', 'All-Weather Floor Mats', 'Heavy duty rubber floor mats - 4 piece', 24, 8, 69.99, NULL, 28.00, 3.5, true, false),
('AUTO-INT-003', 'Trunk Organizer', 'Collapsible trunk storage organizer', 24, 8, 34.99, 29.99, 14.00, 1.2, true, false),
('FOOD-SNK-001', 'Gourmet Trail Mix', 'Premium nuts and dried fruit mix - 2 lb', 25, 9, 24.99, NULL, 10.00, 0.95, true, false),
('FOOD-SNK-002', 'Artisan Chocolate Box', 'Assorted dark chocolate truffles - 24 pc', 25, 15, 39.99, 34.99, 16.00, 0.55, true, true),
('FOOD-SNK-003', 'Organic Protein Bars', 'Plant-based protein bars - 12 pack', 25, 9, 29.99, NULL, 12.00, 0.72, true, false),
('FOOD-BEV-001', 'Premium Coffee Beans', 'Single origin arabica coffee - 2 lb', 26, 9, 29.99, NULL, 12.00, 0.95, true, false),
('FOOD-BEV-002', 'Organic Green Tea', 'Japanese matcha green tea - 100 bags', 26, 15, 24.99, 21.99, 10.00, 0.35, true, false),
('FOOD-BEV-003', 'Sparkling Water Variety', 'Flavored sparkling water - 24 pack', 26, 9, 19.99, NULL, 8.00, 9.5, true, false),
('FOOD-PAN-001', 'Italian Pasta Collection', 'Artisan pasta variety pack - 6 types', 27, 15, 34.99, 29.99, 14.00, 2.4, true, false),
('FOOD-PAN-002', 'Extra Virgin Olive Oil', 'Premium EVOO from Tuscany - 1 liter', 27, 15, 29.99, NULL, 12.00, 1.2, true, false),
('FOOD-PAN-003', 'Organic Rice Collection', 'Brown, jasmine, basmati - 3 pack', 27, 9, 24.99, 21.99, 10.00, 2.7, true, false),
('OFFC-WRT-001', 'Executive Pen Set', 'Luxury ballpoint pen gift set', 28, 10, 79.99, NULL, 32.00, 0.25, true, false),
('OFFC-WRT-002', 'Colored Marker Set', 'Professional markers - 48 colors', 28, 10, 34.99, 29.99, 14.00, 0.65, true, false),
('OFFC-WRT-003', 'Mechanical Pencil Pack', 'Precision drafting pencils - 6 pack', 28, 10, 19.99, NULL, 8.00, 0.15, true, false),
('OFFC-PPR-001', 'Premium Notebook Set', 'Leather-bound notebooks - 3 pack', 29, 10, 44.99, 39.99, 18.00, 0.85, true, false),
('OFFC-PPR-002', 'Recycled Printer Paper', 'Eco-friendly copy paper - 5 ream', 29, 10, 34.99, NULL, 14.00, 12.5, true, false),
('OFFC-PPR-003', 'Sticky Notes Variety', 'Colorful sticky notes - mega pack', 29, 10, 14.99, 12.99, 6.00, 0.45, true, false),
('OFFC-DSK-001', 'Desktop Organizer Deluxe', 'All-in-one desk organization system', 30, 10, 59.99, NULL, 24.00, 2.5, true, true),
('OFFC-DSK-002', 'File Cabinet Mobile', '3-drawer mobile filing cabinet', 30, 10, 149.99, 129.99, 60.00, 18.0, true, false),
('OFFC-DSK-003', 'Monitor Stand Riser', 'Ergonomic monitor stand with storage', 30, 10, 39.99, 34.99, 16.00, 1.8, true, false),
('ELEC-ACC-001', 'Wireless Charging Pad', 'Fast wireless charger for phones', 2, 1, 39.99, 34.99, 16.00, 0.15, true, false),
('ELEC-ACC-002', 'USB-C Hub 7-in-1', 'Multi-port USB-C adapter hub', 1, 11, 59.99, NULL, 24.00, 0.12, true, false),
('ELEC-ACC-003', 'Noise Canceling Headphones', 'Premium wireless ANC headphones', 2, 1, 299.99, 269.99, 120.00, 0.28, true, true),
('ELEC-ACC-004', 'Portable Power Bank', '20000mAh portable charger', 2, 11, 49.99, 44.99, 20.00, 0.38, true, false),
('ELEC-ACC-005', 'Smart Watch Pro', 'Fitness smartwatch with GPS', 2, 1, 249.99, 229.99, 100.00, 0.05, true, true),
('HOME-DEC-001', 'Decorative Throw Pillows', 'Velvet throw pillow set - 4 pack', 7, 13, 59.99, NULL, 24.00, 1.5, true, false),
('HOME-DEC-002', 'Wall Art Canvas Set', 'Modern abstract canvas prints - 3 piece', 7, 3, 89.99, 79.99, 36.00, 2.8, true, false),
('HOME-DEC-003', 'LED Floor Lamp', 'Dimmable LED floor lamp modern design', 7, 13, 129.99, NULL, 52.00, 4.5, true, false),
('SPRT-ACC-001', 'Fitness Tracker Band', 'Water-resistant activity tracker', 10, 4, 79.99, 69.99, 32.00, 0.03, true, false),
('SPRT-ACC-002', 'Sports Water Bottle', 'Insulated stainless steel bottle - 32oz', 10, 14, 29.99, NULL, 12.00, 0.35, true, false),
('SPRT-ACC-003', 'Gym Bag Deluxe', 'Large capacity gym duffel bag', 10, 4, 59.99, 49.99, 24.00, 0.85, true, false);

-- Insert Product Variants (100 rows)
INSERT INTO product_variants (product_id, variant_name, size, color, material, price_modifier, sku_suffix, is_active) VALUES
(1, 'Silver 256GB', NULL, 'Silver', NULL, 0, '-SLV256', true),
(1, 'Space Gray 512GB', NULL, 'Space Gray', NULL, 200, '-GRY512', true),
(1, 'Silver 1TB', NULL, 'Silver', NULL, 400, '-SLV1TB', true),
(2, 'Gold 256GB', NULL, 'Gold', NULL, 0, '-GLD256', true),
(2, 'Silver 256GB', NULL, 'Silver', NULL, 0, '-SLV256', true),
(4, 'Midnight 128GB', NULL, 'Midnight', NULL, -100, '-MID128', true),
(4, 'Midnight 256GB', NULL, 'Midnight', NULL, 0, '-MID256', true),
(4, 'Silver 256GB', NULL, 'Silver', NULL, 0, '-SLV256', true),
(4, 'Gold 512GB', NULL, 'Gold', NULL, 200, '-GLD512', true),
(9, 'White Small', 'S', 'White', 'Cotton', 0, '-WHT-S', true),
(9, 'White Medium', 'M', 'White', 'Cotton', 0, '-WHT-M', true),
(9, 'White Large', 'L', 'White', 'Cotton', 0, '-WHT-L', true),
(9, 'Blue Small', 'S', 'Blue', 'Cotton', 0, '-BLU-S', true),
(9, 'Blue Medium', 'M', 'Blue', 'Cotton', 0, '-BLU-M', true),
(9, 'Blue Large', 'L', 'Blue', 'Cotton', 0, '-BLU-L', true),
(10, 'White Slim S', 'S', 'White', 'Cotton Blend', 0, '-WHT-S', true),
(10, 'White Slim M', 'M', 'White', 'Cotton Blend', 0, '-WHT-M', true),
(10, 'White Slim L', 'L', 'White', 'Cotton Blend', 0, '-WHT-L', true),
(10, 'Light Blue Slim M', 'M', 'Light Blue', 'Cotton Blend', 0, '-LBL-M', true),
(12, 'Black Size 4', '4', 'Black', 'Silk Blend', 0, '-BLK-4', true),
(12, 'Black Size 6', '6', 'Black', 'Silk Blend', 0, '-BLK-6', true),
(12, 'Black Size 8', '8', 'Black', 'Silk Blend', 0, '-BLK-8', true),
(12, 'Navy Size 6', '6', 'Navy', 'Silk Blend', 0, '-NVY-6', true),
(12, 'Burgundy Size 8', '8', 'Burgundy', 'Silk Blend', 0, '-BRG-8', true),
(15, 'White Size 8', '8', 'White', 'Leather', 0, '-WHT-8', true),
(15, 'White Size 9', '9', 'White', 'Leather', 0, '-WHT-9', true),
(15, 'White Size 10', '10', 'White', 'Leather', 0, '-WHT-10', true),
(15, 'Black Size 9', '9', 'Black', 'Leather', 0, '-BLK-9', true),
(15, 'Black Size 10', '10', 'Black', 'Leather', 0, '-BLK-10', true),
(16, 'Black Size 7', '7', 'Black', 'Mesh', 0, '-BLK-7', true),
(16, 'Black Size 8', '8', 'Black', 'Mesh', 0, '-BLK-8', true),
(16, 'Black Size 9', '9', 'Black', 'Mesh', 0, '-BLK-9', true),
(16, 'Blue Size 8', '8', 'Blue', 'Mesh', 0, '-BLU-8', true),
(16, 'Red Size 9', '9', 'Red', 'Mesh', 0, '-RED-9', true),
(18, 'Gray Left Chaise', NULL, 'Gray', 'Fabric', 0, '-GRY-L', true),
(18, 'Gray Right Chaise', NULL, 'Gray', 'Fabric', 0, '-GRY-R', true),
(18, 'Beige Left Chaise', NULL, 'Beige', 'Fabric', 100, '-BEG-L', true),
(18, 'Navy Left Chaise', NULL, 'Navy', 'Fabric', 100, '-NVY-L', true),
(19, 'Walnut Finish', NULL, 'Walnut', 'Wood', 0, '-WAL', true),
(19, 'Oak Finish', NULL, 'Oak', 'Wood', 0, '-OAK', true),
(19, 'White Finish', NULL, 'White', 'Wood', -20, '-WHT', true),
(21, 'Black', NULL, 'Black', 'Plastic', 0, '-BLK', true),
(21, 'White', NULL, 'White', 'Plastic', 0, '-WHT', true),
(21, 'Red', NULL, 'Red', 'Plastic', 10, '-RED', true),
(22, 'Silver', NULL, 'Silver', 'Stainless Steel', 0, '-SLV', true),
(22, 'Black', NULL, 'Black', 'Stainless Steel', 0, '-BLK', true),
(23, 'Black 5.5L', NULL, 'Black', 'Plastic', 0, '-BLK-L', true),
(23, 'White 5.5L', NULL, 'White', 'Plastic', 0, '-WHT-L', true),
(23, 'Black 3.5L', NULL, 'Black', 'Plastic', -30, '-BLK-S', true),
(26, 'Black', NULL, 'Black', 'Metal/Plastic', 0, '-BLK', true),
(26, 'Silver', NULL, 'Silver', 'Metal/Plastic', 50, '-SLV', true),
(27, '5-50 lbs Set', NULL, 'Black', 'Metal', 0, '-50LB', true),
(27, '5-25 lbs Set', NULL, 'Black', 'Metal', -100, '-25LB', true),
(28, 'Purple 6mm', '6mm', 'Purple', 'TPE', 0, '-PUR-6', true),
(28, 'Blue 6mm', '6mm', 'Blue', 'TPE', 0, '-BLU-6', true),
(28, 'Black 8mm', '8mm', 'Black', 'TPE', 10, '-BLK-8', true),
(29, 'Green', NULL, 'Green', 'Polyester', 0, '-GRN', true),
(29, 'Blue', NULL, 'Blue', 'Polyester', 0, '-BLU', true),
(29, 'Orange', NULL, 'Orange', 'Polyester', 0, '-ORG', true),
(30, 'Blue Regular', NULL, 'Blue', 'Nylon', 0, '-BLU-R', true),
(30, 'Green Regular', NULL, 'Green', 'Nylon', 0, '-GRN-R', true),
(30, 'Blue XL', NULL, 'Blue', 'Nylon', 30, '-BLU-XL', true),
(41, '30ml', NULL, NULL, NULL, 0, '-30ML', true),
(41, '50ml', NULL, NULL, NULL, 30, '-50ML', true),
(42, 'Normal Skin', NULL, NULL, NULL, 0, '-NRM', true),
(42, 'Dry Skin', NULL, NULL, NULL, 0, '-DRY', true),
(42, 'Oily Skin', NULL, NULL, NULL, 0, '-OIL', true),
(45, 'Fair', NULL, 'Fair', NULL, 0, '-FAIR', true),
(45, 'Light', NULL, 'Light', NULL, 0, '-LGHT', true),
(45, 'Medium', NULL, 'Medium', NULL, 0, '-MED', true),
(45, 'Tan', NULL, 'Tan', NULL, 0, '-TAN', true),
(45, 'Deep', NULL, 'Deep', NULL, 0, '-DEEP', true),
(55, 'Standard', NULL, 'Multi', 'Plastic', 0, '-STD', true),
(56, 'Standard', NULL, 'Multi', 'Plastic', 0, '-STD', true),
(57, 'Standard', NULL, 'Multi', 'Plastic', 0, '-STD', true),
(58, 'Black', NULL, 'Black', 'Plastic', 0, '-BLK', true),
(58, 'Silver', NULL, 'Silver', 'Metal', 20, '-SLV', true),
(64, 'Black Universal', NULL, 'Black', 'Leather', 0, '-BLK', true),
(64, 'Tan Universal', NULL, 'Tan', 'Leather', 0, '-TAN', true),
(64, 'Gray Universal', NULL, 'Gray', 'Leather', 0, '-GRY', true),
(65, 'Black', NULL, 'Black', 'Rubber', 0, '-BLK', true),
(65, 'Gray', NULL, 'Gray', 'Rubber', 0, '-GRY', true),
(65, 'Tan', NULL, 'Tan', 'Rubber', 0, '-TAN', true),
(77, 'Black Premium', NULL, 'Black', 'Leather', 0, '-BLK', true),
(77, 'Brown Premium', NULL, 'Brown', 'Leather', 0, '-BRN', true),
(80, 'Dark Roast', NULL, NULL, NULL, 0, '-DRK', true),
(80, 'Medium Roast', NULL, NULL, NULL, 0, '-MED', true),
(80, 'Light Roast', NULL, NULL, NULL, 0, '-LGT', true),
(89, 'Black', NULL, 'Black', 'Plastic', 0, '-BLK', true),
(89, 'Silver', NULL, 'Silver', 'Aluminum', 10, '-SLV', true),
(90, 'Black 41mm', '41mm', 'Black', NULL, 0, '-BLK-41', true),
(90, 'Black 45mm', '45mm', 'Black', NULL, 30, '-BLK-45', true),
(90, 'Silver 41mm', '41mm', 'Silver', NULL, 0, '-SLV-41', true),
(90, 'Silver 45mm', '45mm', 'Silver', NULL, 30, '-SLV-45', true),
(93, 'Black', NULL, 'Black', 'Metal/Plastic', 0, '-BLK', true),
(93, 'White', NULL, 'White', 'Metal/Plastic', 0, '-WHT', true),
(96, 'Black', NULL, 'Black', 'Nylon', 0, '-BLK', true),
(96, 'Navy', NULL, 'Navy', 'Nylon', 0, '-NVY', true),
(96, 'Gray', NULL, 'Gray', 'Nylon', 0, '-GRY', true);

-- Insert Tags (30 rows)
INSERT INTO tags (tag_name, tag_type) VALUES
('Bestseller', 'popularity'),
('New Arrival', 'status'),
('Limited Edition', 'status'),
('Sale', 'promotion'),
('Clearance', 'promotion'),
('Eco-Friendly', 'feature'),
('Premium', 'quality'),
('Budget-Friendly', 'price'),
('Gift Idea', 'occasion'),
('Holiday Special', 'occasion'),
('Summer Collection', 'season'),
('Winter Collection', 'season'),
('Work From Home', 'lifestyle'),
('Outdoor', 'lifestyle'),
('Indoor', 'lifestyle'),
('Compact', 'feature'),
('Wireless', 'feature'),
('Waterproof', 'feature'),
('Portable', 'feature'),
('Professional', 'usage'),
('Beginner', 'usage'),
('Family', 'audience'),
('Kids', 'audience'),
('Men', 'audience'),
('Women', 'audience'),
('Unisex', 'audience'),
('Organic', 'feature'),
('Handmade', 'feature'),
('Imported', 'origin'),
('Local', 'origin');

-- Insert Product Tags (200 rows - random associations)
INSERT INTO product_tags (product_id, tag_id)
SELECT DISTINCT
    (RANDOM() * 99 + 1)::INTEGER,
    (RANDOM() * 29 + 1)::INTEGER
FROM generate_series(1, 300)
ON CONFLICT (product_id, tag_id) DO NOTHING;

-- Insert Product Images (200 rows)
INSERT INTO product_images (product_id, image_url, alt_text, is_primary, display_order)
SELECT
    p.product_id,
    'https://images.example.com/products/' || p.sku || '-' || i || '.jpg',
    p.product_name || ' - Image ' || i,
    (i = 1),
    i
FROM products p
CROSS JOIN generate_series(1, 2) AS i;

-- Insert Warehouses (5 rows)
INSERT INTO warehouses (warehouse_name, address, city, state, country, postal_code, capacity, is_active) VALUES
('East Coast Hub', '100 Distribution Way', 'Newark', 'NJ', 'USA', '07102', 50000, true),
('West Coast Center', '200 Logistics Blvd', 'Los Angeles', 'CA', 'USA', '90001', 75000, true),
('Central Distribution', '300 Midwest Drive', 'Chicago', 'IL', 'USA', '60601', 60000, true),
('Southern Fulfillment', '400 Commerce Street', 'Dallas', 'TX', 'USA', '75201', 45000, true),
('Pacific Northwest Hub', '500 Shipping Lane', 'Seattle', 'WA', 'USA', '98101', 35000, true);

-- Insert Warehouse Inventory (500 rows - multiple products per warehouse)
INSERT INTO warehouse_inventory (warehouse_id, product_id, variant_id, quantity, reserved_quantity, reorder_level, last_restocked_at)
SELECT
    w.warehouse_id,
    p.product_id,
    NULL,
    (RANDOM() * 200 + 10)::INTEGER,
    (RANDOM() * 20)::INTEGER,
    (RANDOM() * 20 + 5)::INTEGER,
    NOW() - INTERVAL '1 day' * (RANDOM() * 30)::INTEGER
FROM warehouses w
CROSS JOIN products p
WHERE RANDOM() > 0.0;

-- Insert Inventory Movements (100 rows)
INSERT INTO inventory_movements (warehouse_id, product_id, variant_id, movement_type, quantity, reference_type, notes, created_at)
SELECT
    (RANDOM() * 4 + 1)::INTEGER,
    (RANDOM() * 99 + 1)::INTEGER,
    NULL,
    CASE (RANDOM() * 3)::INTEGER
        WHEN 0 THEN 'in'
        WHEN 1 THEN 'out'
        WHEN 2 THEN 'adjustment'
        ELSE 'transfer'
    END,
    (RANDOM() * 50 + 1)::INTEGER,
    CASE (RANDOM() * 3)::INTEGER
        WHEN 0 THEN 'order'
        WHEN 1 THEN 'restock'
        WHEN 2 THEN 'return'
        ELSE 'manual'
    END,
    'Inventory movement record',
    NOW() - INTERVAL '1 day' * (RANDOM() * 60)::INTEGER
FROM generate_series(1, 100);

-- Insert Shipping Addresses (60 rows - 2 per user)
INSERT INTO shipping_addresses (user_id, address_label, recipient_name, street_address, apartment_unit, city, state, postal_code, country, phone, is_default)
SELECT
    u.user_id,
    CASE WHEN i = 1 THEN 'Home' ELSE 'Work' END,
    u.first_name || ' ' || u.last_name,
    (100 + u.user_id * 10 + i)::TEXT || ' ' ||
    CASE (u.user_id % 5) WHEN 0 THEN 'Main Street' WHEN 1 THEN 'Oak Avenue' WHEN 2 THEN 'Park Boulevard' WHEN 3 THEN 'Cedar Lane' ELSE 'Elm Drive' END,
    CASE WHEN RANDOM() > 0.6 THEN 'Apt ' || (RANDOM() * 500 + 1)::INTEGER::TEXT ELSE NULL END,
    CASE (u.user_id % 10)
        WHEN 0 THEN 'New York' WHEN 1 THEN 'Los Angeles' WHEN 2 THEN 'Chicago' WHEN 3 THEN 'Houston'
        WHEN 4 THEN 'Phoenix' WHEN 5 THEN 'Philadelphia' WHEN 6 THEN 'San Antonio' WHEN 7 THEN 'San Diego'
        WHEN 8 THEN 'Dallas' ELSE 'San Jose'
    END,
    CASE (u.user_id % 10)
        WHEN 0 THEN 'NY' WHEN 1 THEN 'CA' WHEN 2 THEN 'IL' WHEN 3 THEN 'TX'
        WHEN 4 THEN 'AZ' WHEN 5 THEN 'PA' WHEN 6 THEN 'TX' WHEN 7 THEN 'CA'
        WHEN 8 THEN 'TX' ELSE 'CA'
    END,
    LPAD((10000 + u.user_id * 100 + i)::TEXT, 5, '0'),
    'USA',
    u.phone,
    (i = 1)
FROM users u
CROSS JOIN generate_series(1, 2) AS i;

-- Insert Payment Methods (45 rows - 1-2 per user)
INSERT INTO payment_methods (user_id, method_type, card_last_four, card_brand, expiry_month, expiry_year, is_default, is_active)
SELECT
    u.user_id,
    CASE (RANDOM() * 3)::INTEGER WHEN 0 THEN 'credit_card' WHEN 1 THEN 'debit_card' ELSE 'credit_card' END,
    LPAD((RANDOM() * 9999)::INTEGER::TEXT, 4, '0'),
    CASE (RANDOM() * 3)::INTEGER WHEN 0 THEN 'Visa' WHEN 1 THEN 'Mastercard' WHEN 2 THEN 'Amex' ELSE 'Discover' END,
    (RANDOM() * 11 + 1)::INTEGER,
    2025 + (RANDOM() * 4)::INTEGER,
    (i = 1),
    true
FROM users u
CROSS JOIN generate_series(1, CASE WHEN RANDOM() > 0.5 THEN 2 ELSE 1 END) AS i
WHERE u.user_id <= 30;

-- Insert Shopping Carts (40 rows)
INSERT INTO shopping_carts (user_id, session_id, status, created_at, updated_at)
SELECT
    CASE WHEN RANDOM() > 0.3 THEN (RANDOM() * 29 + 1)::INTEGER ELSE NULL END,
    md5(random()::text),
    CASE (RANDOM() * 2)::INTEGER WHEN 0 THEN 'active' WHEN 1 THEN 'abandoned' ELSE 'converted' END,
    NOW() - INTERVAL '1 day' * (RANDOM() * 30)::INTEGER,
    NOW() - INTERVAL '1 hour' * (RANDOM() * 72)::INTEGER
FROM generate_series(1, 40);

-- Insert Cart Items (100 rows)
INSERT INTO cart_items (cart_id, product_id, variant_id, quantity, unit_price, added_at)
SELECT
    (RANDOM() * 39 + 1)::INTEGER,
    p.product_id,
    NULL,
    (RANDOM() * 3 + 1)::INTEGER,
    COALESCE(p.sale_price, p.base_price),
    NOW() - INTERVAL '1 hour' * (RANDOM() * 168)::INTEGER
FROM generate_series(1, 100) g
JOIN products p ON p.product_id = (RANDOM() * 99 + 1)::INTEGER;

-- Insert Coupons (15 rows)
INSERT INTO coupons (coupon_code, description, discount_type, discount_value, minimum_order_amount, maximum_discount, usage_limit, times_used, valid_from, valid_until, is_active) VALUES
('WELCOME10', 'Welcome discount for new customers', 'percentage', 10, 50, 25, 1000, 234, NOW() - INTERVAL '30 days', NOW() + INTERVAL '60 days', true),
('SUMMER25', 'Summer sale 25% off', 'percentage', 25, 100, 75, 500, 189, NOW() - INTERVAL '15 days', NOW() + INTERVAL '45 days', true),
('FLAT20', 'Flat $20 off orders over $150', 'fixed_amount', 20, 150, NULL, 300, 98, NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days', true),
('FREESHIP', 'Free shipping on orders $75+', 'fixed_amount', 9.99, 75, NULL, NULL, 456, NOW() - INTERVAL '60 days', NOW() + INTERVAL '30 days', true),
('VIP30', 'VIP member exclusive 30% off', 'percentage', 30, 200, 100, 100, 45, NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days', true),
('FLASH50', 'Flash sale 50% off select items', 'percentage', 50, 0, 150, 200, 178, NOW() - INTERVAL '2 days', NOW() + INTERVAL '5 days', true),
('SAVE15', 'Save 15% on your order', 'percentage', 15, 75, 50, 750, 312, NOW() - INTERVAL '20 days', NOW() + INTERVAL '40 days', true),
('HOLIDAY2024', 'Holiday special discount', 'percentage', 20, 100, 60, 1000, 0, NOW() + INTERVAL '30 days', NOW() + INTERVAL '60 days', false),
('FIRSTORDER', 'First order 10% discount', 'percentage', 10, 30, 30, NULL, 567, NOW() - INTERVAL '90 days', NOW() + INTERVAL '90 days', true),
('BUNDLE10', 'Bundle discount $10 off', 'fixed_amount', 10, 80, NULL, 400, 123, NOW() - INTERVAL '7 days', NOW() + INTERVAL '23 days', true),
('CYBER40', 'Cyber Monday 40% off', 'percentage', 40, 150, 120, 300, 0, NOW() + INTERVAL '60 days', NOW() + INTERVAL '61 days', false),
('CLEARANCE', 'Clearance extra 15% off', 'percentage', 15, 25, 40, NULL, 234, NOW() - INTERVAL '14 days', NOW() + INTERVAL '16 days', true),
('REFER25', 'Referral bonus $25 off', 'fixed_amount', 25, 100, NULL, NULL, 89, NOW() - INTERVAL '30 days', NOW() + INTERVAL '60 days', true),
('LOYALTY20', 'Loyalty member 20% off', 'percentage', 20, 50, 80, 500, 156, NOW() - INTERVAL '45 days', NOW() + INTERVAL '45 days', true),
('WEEKEND15', 'Weekend special 15% off', 'percentage', 15, 60, 45, 200, 78, NOW() - INTERVAL '3 days', NOW() + INTERVAL '4 days', true);

-- Insert Orders (150 rows)
INSERT INTO orders (user_id, order_number, status, shipping_address_id, payment_method_id, subtotal, shipping_cost, tax_amount, discount_amount, total_amount, coupon_id, ordered_at, shipped_at, delivered_at)
SELECT
    u.user_id,
    'ORD-' || TO_CHAR(NOW() - INTERVAL '1 day' * (RANDOM() * 90)::INTEGER, 'YYYYMMDD') || '-' || LPAD((ROW_NUMBER() OVER())::TEXT, 5, '0'),
    CASE (RANDOM() * 5)::INTEGER
        WHEN 0 THEN 'pending'
        WHEN 1 THEN 'confirmed'
        WHEN 2 THEN 'processing'
        WHEN 3 THEN 'shipped'
        WHEN 4 THEN 'delivered'
        ELSE 'delivered'
    END,
    (SELECT address_id FROM shipping_addresses WHERE user_id = u.user_id ORDER BY RANDOM() LIMIT 1),
    (SELECT payment_method_id FROM payment_methods WHERE user_id = u.user_id ORDER BY RANDOM() LIMIT 1),
    (RANDOM() * 500 + 50)::DECIMAL(10,2),
    CASE WHEN RANDOM() > 0.3 THEN (RANDOM() * 15 + 5)::DECIMAL(10,2) ELSE 0 END,
    (RANDOM() * 50 + 5)::DECIMAL(10,2),
    CASE WHEN RANDOM() > 0.7 THEN (RANDOM() * 30)::DECIMAL(10,2) ELSE 0 END,
    0, -- Will be calculated
    CASE WHEN RANDOM() > 0.7 THEN (RANDOM() * 14 + 1)::INTEGER ELSE NULL END,
    NOW() - INTERVAL '1 day' * (RANDOM() * 90)::INTEGER,
    CASE WHEN RANDOM() > 0.3 THEN NOW() - INTERVAL '1 day' * (RANDOM() * 80)::INTEGER ELSE NULL END,
    CASE WHEN RANDOM() > 0.5 THEN NOW() - INTERVAL '1 day' * (RANDOM() * 70)::INTEGER ELSE NULL END
FROM users u
CROSS JOIN generate_series(1, 5);

-- Update order totals
UPDATE orders SET total_amount = subtotal + shipping_cost + tax_amount - discount_amount;

-- Insert Order Items (450 rows - 3 items per order average)
INSERT INTO order_items (order_id, product_id, variant_id, product_name, quantity, unit_price, total_price)
SELECT
    o.order_id,
    p.product_id,
    NULL,
    p.product_name,
    (RANDOM() * 3 + 1)::INTEGER,
    COALESCE(p.sale_price, p.base_price),
    0 -- Will be calculated
FROM orders o
CROSS JOIN LATERAL (
    SELECT product_id, product_name, sale_price, base_price
    FROM products
    ORDER BY RANDOM()
    LIMIT (RANDOM() * 3 + 1)::INTEGER
) p;

-- Update order item totals
UPDATE order_items SET total_price = quantity * unit_price;

-- Insert Order Status History (300 rows)
INSERT INTO order_status_history (order_id, old_status, new_status, notes, created_at)
SELECT
    o.order_id,
    CASE i
        WHEN 1 THEN NULL
        WHEN 2 THEN 'pending'
        WHEN 3 THEN 'confirmed'
        ELSE 'processing'
    END,
    CASE i
        WHEN 1 THEN 'pending'
        WHEN 2 THEN 'confirmed'
        WHEN 3 THEN 'processing'
        ELSE 'shipped'
    END,
    CASE i
        WHEN 1 THEN 'Order placed'
        WHEN 2 THEN 'Payment confirmed'
        WHEN 3 THEN 'Order processing started'
        ELSE 'Shipped via carrier'
    END,
    o.ordered_at + INTERVAL '1 hour' * i
FROM orders o
CROSS JOIN generate_series(1, 2) AS i;

-- Insert Payment Transactions (150 rows)
INSERT INTO payment_transactions (order_id, user_id, payment_method_id, transaction_type, amount, currency, status, gateway_transaction_id, created_at, processed_at)
SELECT
    o.order_id,
    o.user_id,
    o.payment_method_id,
    'charge',
    o.total_amount,
    'USD',
    CASE WHEN RANDOM() > 0.05 THEN 'completed' ELSE 'failed' END,
    'TXN-' || md5(random()::text)::VARCHAR(20),
    o.ordered_at,
    o.ordered_at + INTERVAL '1 minute' * (RANDOM() * 5)::INTEGER
FROM orders o;

-- Insert Coupon Usage (50 rows)
INSERT INTO coupon_usage (coupon_id, user_id, order_id, discount_applied, used_at)
SELECT
    o.coupon_id,
    o.user_id,
    o.order_id,
    o.discount_amount,
    o.ordered_at
FROM orders o
WHERE o.coupon_id IS NOT NULL;

-- Insert Promotions (10 rows)
INSERT INTO promotions (promotion_name, description, promotion_type, discount_percentage, start_date, end_date, is_active) VALUES
('Summer Blowout Sale', 'Massive discounts on summer items', 'sale', 30, NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days', true),
('Buy One Get One Free', 'BOGO on select electronics', 'bogo', NULL, NOW() - INTERVAL '5 days', NOW() + INTERVAL '10 days', true),
('Bundle & Save', 'Save 20% when you bundle 3+ items', 'bundle', 20, NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days', true),
('Flash Sale Friday', 'One day only flash sale', 'flash_sale', 50, NOW() + INTERVAL '3 days', NOW() + INTERVAL '4 days', false),
('New Year Clearance', 'Clearance on last years inventory', 'sale', 40, NOW() + INTERVAL '30 days', NOW() + INTERVAL '45 days', false),
('Holiday Gift Sets', 'Special holiday bundle offers', 'bundle', 25, NOW() + INTERVAL '60 days', NOW() + INTERVAL '75 days', false),
('Members Only Sale', 'Exclusive sale for members', 'sale', 35, NOW() - INTERVAL '2 days', NOW() + INTERVAL '5 days', true),
('Back to School', 'Discounts on school supplies and electronics', 'sale', 20, NOW() + INTERVAL '90 days', NOW() + INTERVAL '120 days', false),
('Spring Collection Launch', 'New arrivals special pricing', 'sale', 15, NOW() + INTERVAL '45 days', NOW() + INTERVAL '60 days', false),
('Weekend Warriors', 'Weekend only sports gear deals', 'flash_sale', 25, NOW(), NOW() + INTERVAL '2 days', true);

-- Insert Wishlists (35 rows)
INSERT INTO wishlists (user_id, wishlist_name, is_public, created_at)
SELECT
    user_id,
    CASE (RANDOM() * 2)::INTEGER
        WHEN 0 THEN 'My Wishlist'
        WHEN 1 THEN 'Birthday Ideas'
        ELSE 'Saved for Later'
    END,
    (RANDOM() > 0.7),
    NOW() - INTERVAL '1 day' * (RANDOM() * 60)::INTEGER
FROM users
WHERE RANDOM() > 0.15;

-- Insert Wishlist Items (100 rows)
INSERT INTO wishlist_items (wishlist_id, product_id, variant_id, priority, notes, added_at)
SELECT
    (RANDOM() * 34 + 1)::INTEGER,
    (RANDOM() * 99 + 1)::INTEGER,
    NULL,
    (RANDOM() * 5)::INTEGER,
    CASE WHEN RANDOM() > 0.7 THEN 'Really want this!' ELSE NULL END,
    NOW() - INTERVAL '1 day' * (RANDOM() * 30)::INTEGER
FROM generate_series(1, 100);

-- Insert Product Reviews (150 rows)
INSERT INTO product_reviews (product_id, user_id, order_id, rating, title, review_text, is_verified_purchase, is_approved, helpful_votes, created_at)
SELECT
    oi.product_id,
    o.user_id,
    o.order_id,
    (RANDOM() * 2 + 3)::INTEGER, -- Rating 3-5
    CASE (RANDOM() * 4)::INTEGER
        WHEN 0 THEN 'Great product!'
        WHEN 1 THEN 'Exactly what I needed'
        WHEN 2 THEN 'Good value for money'
        WHEN 3 THEN 'Highly recommend'
        ELSE 'Satisfied with purchase'
    END,
    CASE (RANDOM() * 4)::INTEGER
        WHEN 0 THEN 'This product exceeded my expectations. The quality is excellent and it arrived quickly.'
        WHEN 1 THEN 'Very happy with this purchase. Works exactly as described and the price was right.'
        WHEN 2 THEN 'Good product overall. A few minor issues but nothing major. Would buy again.'
        WHEN 3 THEN 'Fantastic! I have been looking for something like this for a while. Highly recommend to anyone.'
        ELSE 'Solid product. Does what it says. Shipping was fast and packaging was good.'
    END,
    true,
    (RANDOM() > 0.1),
    (RANDOM() * 50)::INTEGER,
    o.delivered_at + INTERVAL '1 day' * (RANDOM() * 14)::INTEGER
FROM order_items oi
JOIN orders o ON oi.order_id = o.order_id
WHERE o.status = 'delivered' AND RANDOM() > 0.3
LIMIT 150;

-- Insert Support Tickets (80 rows)
INSERT INTO support_tickets (user_id, order_id, ticket_number, subject, category, priority, status, created_at, resolved_at)
SELECT
    (RANDOM() * 29 + 1)::INTEGER,
    CASE WHEN RANDOM() > 0.4 THEN (RANDOM() * 149 + 1)::INTEGER ELSE NULL END,
    'TKT-' || TO_CHAR(NOW() - INTERVAL '1 day' * (RANDOM() * 60)::INTEGER, 'YYYYMMDD') || '-' || LPAD((ROW_NUMBER() OVER())::TEXT, 4, '0'),
    CASE (RANDOM() * 7)::INTEGER
        WHEN 0 THEN 'Order not received'
        WHEN 1 THEN 'Wrong item delivered'
        WHEN 2 THEN 'Request for refund'
        WHEN 3 THEN 'Product damaged during shipping'
        WHEN 4 THEN 'Question about product specifications'
        WHEN 5 THEN 'How to return an item'
        WHEN 6 THEN 'Billing inquiry'
        ELSE 'General question'
    END,
    CASE (RANDOM() * 4)::INTEGER
        WHEN 0 THEN 'order_issue'
        WHEN 1 THEN 'product_inquiry'
        WHEN 2 THEN 'refund_request'
        WHEN 3 THEN 'technical'
        ELSE 'other'
    END,
    CASE (RANDOM() * 3)::INTEGER
        WHEN 0 THEN 'low'
        WHEN 1 THEN 'medium'
        WHEN 2 THEN 'high'
        ELSE 'medium'
    END,
    CASE (RANDOM() * 4)::INTEGER
        WHEN 0 THEN 'open'
        WHEN 1 THEN 'in_progress'
        WHEN 2 THEN 'waiting_customer'
        WHEN 3 THEN 'resolved'
        ELSE 'closed'
    END,
    NOW() - INTERVAL '1 day' * (RANDOM() * 60)::INTEGER,
    CASE WHEN RANDOM() > 0.4 THEN NOW() - INTERVAL '1 day' * (RANDOM() * 30)::INTEGER ELSE NULL END
FROM generate_series(1, 80);

-- Insert Support Ticket Messages (200 rows)
INSERT INTO support_ticket_messages (ticket_id, sender_id, sender_type, message_text, is_internal, created_at)
SELECT
    t.ticket_id,
    CASE WHEN i % 2 = 1 THEN t.user_id ELSE NULL END,
    CASE WHEN i % 2 = 1 THEN 'customer' ELSE 'agent' END,
    CASE
        WHEN i = 1 THEN 'Hello, I need help with my order. ' || t.subject
        WHEN i = 2 THEN 'Thank you for contacting us. We are looking into this issue and will get back to you shortly.'
        WHEN i = 3 THEN 'Any update on this? I am still waiting for a resolution.'
        ELSE 'We have resolved this issue. Please let us know if you need any further assistance.'
    END,
    false,
    t.created_at + INTERVAL '1 hour' * i
FROM support_tickets t
CROSS JOIN generate_series(1, 3) AS i
WHERE RANDOM() > 0.2;

-- Final summary
SELECT 'Database initialization complete!' as status;
SELECT table_name,
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as columns
FROM information_schema.tables t
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
