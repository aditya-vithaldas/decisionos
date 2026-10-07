"""Create a comprehensive SQLite e-commerce database for testing."""

import sqlite3
import os
import random
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), "ecommerce.db")

# Sample data
FIRST_NAMES = ['John', 'Sarah', 'Michael', 'Emily', 'David', 'Lisa', 'James', 'Jennifer', 'Robert', 'Amanda',
               'William', 'Jessica', 'Christopher', 'Ashley', 'Matthew', 'Stephanie', 'Daniel', 'Nicole', 'Andrew', 'Megan',
               'Joshua', 'Rachel', 'Kevin', 'Laura', 'Brian', 'Michelle', 'Steven', 'Kimberly', 'Jason', 'Heather']

LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Martinez', 'Rodriguez',
              'Anderson', 'Taylor', 'Thomas', 'Hernandez', 'Moore', 'Martin', 'Jackson', 'Lee', 'White', 'Harris',
              'Clark', 'Lewis', 'Robinson', 'Walker', 'Hall', 'Allen', 'Young', 'King', 'Wright', 'Scott']

CITIES = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose']
STATES = ['NY', 'CA', 'IL', 'TX', 'AZ', 'PA', 'TX', 'CA', 'TX', 'CA']

def create_database():
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # ========== CREATE TABLES ==========

    # 1. Users
    cursor.execute("""
        CREATE TABLE users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            phone TEXT,
            date_of_birth TEXT,
            gender TEXT,
            is_active INTEGER DEFAULT 1,
            is_verified INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            last_login_at TEXT
        )
    """)

    # 2. User Preferences
    cursor.execute("""
        CREATE TABLE user_preferences (
            preference_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES users(user_id),
            newsletter_subscribed INTEGER DEFAULT 0,
            sms_notifications INTEGER DEFAULT 0,
            email_notifications INTEGER DEFAULT 1,
            preferred_language TEXT DEFAULT 'en',
            preferred_currency TEXT DEFAULT 'USD',
            dark_mode INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 3. User Sessions
    cursor.execute("""
        CREATE TABLE user_sessions (
            session_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES users(user_id),
            session_token TEXT UNIQUE NOT NULL,
            ip_address TEXT,
            user_agent TEXT,
            device_type TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            expires_at TEXT NOT NULL
        )
    """)

    # 4. Categories
    cursor.execute("""
        CREATE TABLE categories (
            category_id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_name TEXT NOT NULL,
            description TEXT,
            image_url TEXT,
            is_active INTEGER DEFAULT 1,
            display_order INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 5. Subcategories
    cursor.execute("""
        CREATE TABLE subcategories (
            subcategory_id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER REFERENCES categories(category_id),
            subcategory_name TEXT NOT NULL,
            description TEXT,
            is_active INTEGER DEFAULT 1,
            display_order INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 6. Suppliers
    cursor.execute("""
        CREATE TABLE suppliers (
            supplier_id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_name TEXT NOT NULL,
            contact_name TEXT,
            contact_email TEXT,
            contact_phone TEXT,
            address TEXT,
            city TEXT,
            country TEXT,
            rating REAL DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 7. Products
    cursor.execute("""
        CREATE TABLE products (
            product_id INTEGER PRIMARY KEY AUTOINCREMENT,
            sku TEXT UNIQUE NOT NULL,
            product_name TEXT NOT NULL,
            description TEXT,
            subcategory_id INTEGER REFERENCES subcategories(subcategory_id),
            supplier_id INTEGER REFERENCES suppliers(supplier_id),
            base_price REAL NOT NULL,
            sale_price REAL,
            cost_price REAL,
            weight_kg REAL,
            is_active INTEGER DEFAULT 1,
            is_featured INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 8. Product Variants
    cursor.execute("""
        CREATE TABLE product_variants (
            variant_id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER REFERENCES products(product_id),
            variant_name TEXT NOT NULL,
            size TEXT,
            color TEXT,
            material TEXT,
            price_modifier REAL DEFAULT 0,
            sku_suffix TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 9. Tags
    cursor.execute("""
        CREATE TABLE tags (
            tag_id INTEGER PRIMARY KEY AUTOINCREMENT,
            tag_name TEXT UNIQUE NOT NULL,
            tag_type TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 10. Product Tags
    cursor.execute("""
        CREATE TABLE product_tags (
            product_tag_id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER REFERENCES products(product_id),
            tag_id INTEGER REFERENCES tags(tag_id),
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(product_id, tag_id)
        )
    """)

    # 11. Product Images
    cursor.execute("""
        CREATE TABLE product_images (
            image_id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER REFERENCES products(product_id),
            image_url TEXT NOT NULL,
            alt_text TEXT,
            is_primary INTEGER DEFAULT 0,
            display_order INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 12. Warehouses
    cursor.execute("""
        CREATE TABLE warehouses (
            warehouse_id INTEGER PRIMARY KEY AUTOINCREMENT,
            warehouse_name TEXT NOT NULL,
            address TEXT,
            city TEXT,
            state TEXT,
            country TEXT,
            postal_code TEXT,
            capacity INTEGER,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 13. Warehouse Inventory
    cursor.execute("""
        CREATE TABLE warehouse_inventory (
            inventory_id INTEGER PRIMARY KEY AUTOINCREMENT,
            warehouse_id INTEGER REFERENCES warehouses(warehouse_id),
            product_id INTEGER REFERENCES products(product_id),
            variant_id INTEGER REFERENCES product_variants(variant_id),
            quantity INTEGER DEFAULT 0,
            reserved_quantity INTEGER DEFAULT 0,
            reorder_level INTEGER DEFAULT 10,
            last_restocked_at TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 14. Inventory Movements
    cursor.execute("""
        CREATE TABLE inventory_movements (
            movement_id INTEGER PRIMARY KEY AUTOINCREMENT,
            warehouse_id INTEGER REFERENCES warehouses(warehouse_id),
            product_id INTEGER REFERENCES products(product_id),
            variant_id INTEGER REFERENCES product_variants(variant_id),
            movement_type TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            reference_type TEXT,
            reference_id INTEGER,
            notes TEXT,
            created_by INTEGER REFERENCES users(user_id),
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 15. Shipping Addresses
    cursor.execute("""
        CREATE TABLE shipping_addresses (
            address_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES users(user_id),
            address_label TEXT,
            recipient_name TEXT NOT NULL,
            street_address TEXT NOT NULL,
            apartment_unit TEXT,
            city TEXT NOT NULL,
            state TEXT,
            postal_code TEXT NOT NULL,
            country TEXT NOT NULL,
            phone TEXT,
            is_default INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 16. Payment Methods
    cursor.execute("""
        CREATE TABLE payment_methods (
            payment_method_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES users(user_id),
            method_type TEXT NOT NULL,
            card_last_four TEXT,
            card_brand TEXT,
            expiry_month INTEGER,
            expiry_year INTEGER,
            billing_address TEXT,
            is_default INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 17. Shopping Carts
    cursor.execute("""
        CREATE TABLE shopping_carts (
            cart_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES users(user_id),
            session_id TEXT,
            status TEXT DEFAULT 'active',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 18. Cart Items
    cursor.execute("""
        CREATE TABLE cart_items (
            cart_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
            cart_id INTEGER REFERENCES shopping_carts(cart_id),
            product_id INTEGER REFERENCES products(product_id),
            variant_id INTEGER REFERENCES product_variants(variant_id),
            quantity INTEGER NOT NULL DEFAULT 1,
            unit_price REAL NOT NULL,
            added_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 19. Coupons
    cursor.execute("""
        CREATE TABLE coupons (
            coupon_id INTEGER PRIMARY KEY AUTOINCREMENT,
            coupon_code TEXT UNIQUE NOT NULL,
            description TEXT,
            discount_type TEXT NOT NULL,
            discount_value REAL NOT NULL,
            minimum_order_amount REAL,
            maximum_discount REAL,
            usage_limit INTEGER,
            times_used INTEGER DEFAULT 0,
            valid_from TEXT NOT NULL,
            valid_until TEXT NOT NULL,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 20. Orders
    cursor.execute("""
        CREATE TABLE orders (
            order_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES users(user_id),
            order_number TEXT UNIQUE NOT NULL,
            status TEXT DEFAULT 'pending',
            shipping_address_id INTEGER REFERENCES shipping_addresses(address_id),
            payment_method_id INTEGER REFERENCES payment_methods(payment_method_id),
            subtotal REAL NOT NULL,
            shipping_cost REAL DEFAULT 0,
            tax_amount REAL DEFAULT 0,
            discount_amount REAL DEFAULT 0,
            total_amount REAL NOT NULL,
            coupon_id INTEGER REFERENCES coupons(coupon_id),
            notes TEXT,
            ordered_at TEXT DEFAULT CURRENT_TIMESTAMP,
            shipped_at TEXT,
            delivered_at TEXT
        )
    """)

    # 21. Order Items
    cursor.execute("""
        CREATE TABLE order_items (
            order_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER REFERENCES orders(order_id),
            product_id INTEGER REFERENCES products(product_id),
            variant_id INTEGER REFERENCES product_variants(variant_id),
            product_name TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            unit_price REAL NOT NULL,
            total_price REAL NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 22. Order Status History
    cursor.execute("""
        CREATE TABLE order_status_history (
            history_id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER REFERENCES orders(order_id),
            old_status TEXT,
            new_status TEXT NOT NULL,
            changed_by INTEGER REFERENCES users(user_id),
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 23. Payment Transactions
    cursor.execute("""
        CREATE TABLE payment_transactions (
            transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER REFERENCES orders(order_id),
            user_id INTEGER REFERENCES users(user_id),
            payment_method_id INTEGER REFERENCES payment_methods(payment_method_id),
            transaction_type TEXT NOT NULL,
            amount REAL NOT NULL,
            currency TEXT DEFAULT 'USD',
            status TEXT NOT NULL,
            gateway_transaction_id TEXT,
            gateway_response TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            processed_at TEXT
        )
    """)

    # 24. Coupon Usage
    cursor.execute("""
        CREATE TABLE coupon_usage (
            usage_id INTEGER PRIMARY KEY AUTOINCREMENT,
            coupon_id INTEGER REFERENCES coupons(coupon_id),
            user_id INTEGER REFERENCES users(user_id),
            order_id INTEGER REFERENCES orders(order_id),
            discount_applied REAL NOT NULL,
            used_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 25. Promotions
    cursor.execute("""
        CREATE TABLE promotions (
            promotion_id INTEGER PRIMARY KEY AUTOINCREMENT,
            promotion_name TEXT NOT NULL,
            description TEXT,
            promotion_type TEXT NOT NULL,
            discount_percentage REAL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 26. Wishlists
    cursor.execute("""
        CREATE TABLE wishlists (
            wishlist_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES users(user_id),
            wishlist_name TEXT DEFAULT 'My Wishlist',
            is_public INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 27. Wishlist Items
    cursor.execute("""
        CREATE TABLE wishlist_items (
            wishlist_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
            wishlist_id INTEGER REFERENCES wishlists(wishlist_id),
            product_id INTEGER REFERENCES products(product_id),
            variant_id INTEGER REFERENCES product_variants(variant_id),
            priority INTEGER DEFAULT 0,
            notes TEXT,
            added_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 28. Product Reviews
    cursor.execute("""
        CREATE TABLE product_reviews (
            review_id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER REFERENCES products(product_id),
            user_id INTEGER REFERENCES users(user_id),
            order_id INTEGER REFERENCES orders(order_id),
            rating INTEGER CHECK (rating >= 1 AND rating <= 5),
            title TEXT,
            review_text TEXT,
            is_verified_purchase INTEGER DEFAULT 0,
            is_approved INTEGER DEFAULT 0,
            helpful_votes INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 29. Support Tickets
    cursor.execute("""
        CREATE TABLE support_tickets (
            ticket_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES users(user_id),
            order_id INTEGER REFERENCES orders(order_id),
            ticket_number TEXT UNIQUE NOT NULL,
            subject TEXT NOT NULL,
            category TEXT NOT NULL,
            priority TEXT DEFAULT 'medium',
            status TEXT DEFAULT 'open',
            assigned_to INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            resolved_at TEXT
        )
    """)

    # 30. Support Ticket Messages
    cursor.execute("""
        CREATE TABLE support_ticket_messages (
            message_id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_id INTEGER REFERENCES support_tickets(ticket_id),
            sender_id INTEGER REFERENCES users(user_id),
            sender_type TEXT NOT NULL,
            message_text TEXT NOT NULL,
            is_internal INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ========== INSERT SAMPLE DATA ==========

    # Insert 30 Users
    for i in range(30):
        first = FIRST_NAMES[i]
        last = LAST_NAMES[i]
        email = f"{first.lower()}.{last.lower()}@email.com"
        cursor.execute("""
            INSERT INTO users (email, password_hash, first_name, last_name, phone, date_of_birth, gender, is_active, is_verified)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
        """, (email, f"$2b$12$hash{i}", first, last, f"+1-555-0{100+i}",
              f"{1980 + i % 20}-{(i % 12) + 1:02d}-{(i % 28) + 1:02d}",
              'male' if i % 2 == 0 else 'female', 1 if i % 5 != 0 else 0))

    # User Preferences
    for i in range(1, 31):
        cursor.execute("""
            INSERT INTO user_preferences (user_id, newsletter_subscribed, sms_notifications, email_notifications, preferred_language, preferred_currency, dark_mode)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (i, random.randint(0, 1), random.randint(0, 1), 1, 'en', 'USD', random.randint(0, 1)))

    # User Sessions (100 rows)
    for i in range(100):
        cursor.execute("""
            INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, device_type, is_active, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (random.randint(1, 30), f"token_{i}_{random.randint(1000, 9999)}",
              f"192.168.{random.randint(0, 255)}.{random.randint(0, 255)}",
              "Mozilla/5.0 Chrome/120.0", random.choice(['desktop', 'mobile', 'tablet']),
              random.randint(0, 1), (datetime.now() + timedelta(days=7)).isoformat()))

    # Categories (10)
    categories = [
        ('Electronics', 'Computers, phones, tablets'),
        ('Clothing', 'Apparel for all'),
        ('Home & Garden', 'Furniture and decor'),
        ('Sports & Outdoors', 'Athletic equipment'),
        ('Books & Media', 'Books, music, games'),
        ('Health & Beauty', 'Personal care'),
        ('Toys & Games', 'Toys for all ages'),
        ('Automotive', 'Car accessories'),
        ('Food & Grocery', 'Pantry items'),
        ('Office Supplies', 'Stationery and office')
    ]
    for name, desc in categories:
        cursor.execute("INSERT INTO categories (category_name, description) VALUES (?, ?)", (name, desc))

    # Subcategories (30)
    subcats = [
        (1, 'Laptops'), (1, 'Smartphones'), (1, 'Tablets'),
        (2, "Men's Shirts"), (2, "Women's Dresses"), (2, 'Footwear'),
        (3, 'Living Room'), (3, 'Kitchen Appliances'), (3, 'Garden Tools'),
        (4, 'Fitness Equipment'), (4, 'Camping Gear'), (4, 'Team Sports'),
        (5, 'Fiction Books'), (5, 'Video Games'), (5, 'Music'),
        (6, 'Skincare'), (6, 'Makeup'), (6, 'Vitamins'),
        (7, 'Action Figures'), (7, 'Board Games'), (7, 'Building Sets'),
        (8, 'Car Electronics'), (8, 'Maintenance'), (8, 'Interior'),
        (9, 'Snacks'), (9, 'Beverages'), (9, 'Pantry'),
        (10, 'Writing Supplies'), (10, 'Paper Products'), (10, 'Desk Organization')
    ]
    for cat_id, name in subcats:
        cursor.execute("INSERT INTO subcategories (category_id, subcategory_name) VALUES (?, ?)", (cat_id, name))

    # Suppliers (15)
    suppliers = [
        ('TechWorld Distribution', 'Mike Chen', 'mike@techworld.com', 'San Jose', 'USA', 4.8),
        ('Fashion Forward Inc', 'Anna Martinez', 'anna@fashion.com', 'New York', 'USA', 4.6),
        ('Home Essentials Co', 'Tom Wilson', 'tom@home.com', 'Chicago', 'USA', 4.5),
        ('SportMax Supplies', 'Chris Johnson', 'chris@sport.com', 'Denver', 'USA', 4.7),
        ('BookHaven Publishers', 'Sarah Lee', 'sarah@book.com', 'Boston', 'USA', 4.4),
        ('Beauty Plus Wholesale', 'Linda Brown', 'linda@beauty.com', 'Los Angeles', 'USA', 4.3),
        ('ToyLand Distributors', 'Mark Davis', 'mark@toy.com', 'Orlando', 'USA', 4.6),
        ('AutoParts Direct', 'James Wilson', 'james@auto.com', 'Detroit', 'USA', 4.5),
        ('Fresh Foods Supply', 'Maria Garcia', 'maria@fresh.com', 'Seattle', 'USA', 4.7),
        ('Office Pro Wholesale', 'David Kim', 'david@office.com', 'Austin', 'USA', 4.4),
        ('Global Electronics', 'Wei Zhang', 'wei@global.com', 'Shenzhen', 'China', 4.2),
        ('Euro Fashion Group', 'Sophie Martin', 'sophie@euro.com', 'Paris', 'France', 4.5),
        ('Nordic Home Designs', 'Erik Johansson', 'erik@nordic.com', 'Stockholm', 'Sweden', 4.6),
        ('Pacific Sports', 'Kenji Tanaka', 'kenji@pacific.com', 'Tokyo', 'Japan', 4.4),
        ('Mediterranean Foods', 'Marco Rossi', 'marco@med.com', 'Milan', 'Italy', 4.3)
    ]
    for s in suppliers:
        cursor.execute("""
            INSERT INTO suppliers (company_name, contact_name, contact_email, city, country, rating)
            VALUES (?, ?, ?, ?, ?, ?)
        """, s)

    # Products (100)
    products = [
        ('ELEC-LAP-001', 'ProBook Elite 15', 'High-performance laptop', 1, 1, 1299.99, 1199.99, 850.00),
        ('ELEC-LAP-002', 'UltraSlim Air 13', 'Lightweight laptop', 1, 1, 999.99, None, 650.00),
        ('ELEC-PHN-001', 'SmartPhone X Pro', 'Flagship smartphone', 2, 1, 1099.99, 999.99, 700.00),
        ('ELEC-PHN-002', 'BudgetPhone SE', 'Affordable smartphone', 2, 11, 399.99, 349.99, 200.00),
        ('ELEC-TAB-001', 'ProTab 12.9', 'Professional tablet', 3, 1, 1099.99, 999.99, 700.00),
        ('CLTH-MSH-001', 'Classic Oxford Shirt', 'Cotton oxford shirt', 4, 2, 59.99, None, 25.00),
        ('CLTH-WDR-001', 'Elegant Evening Dress', 'Evening dress', 5, 2, 199.99, 179.99, 80.00),
        ('CLTH-FTW-001', 'Classic Leather Sneakers', 'Premium sneakers', 6, 2, 149.99, None, 60.00),
        ('HOME-LRF-001', 'Modern Sectional Sofa', 'L-shaped sofa', 7, 3, 1499.99, 1299.99, 600.00),
        ('HOME-KIT-001', 'Smart Blender Pro', 'High-speed blender', 8, 3, 199.99, 179.99, 80.00),
    ]

    # Generate more products
    product_templates = [
        ('Gaming Laptop', 1, 1, 1899.99), ('Wireless Mouse', 1, 1, 29.99), ('Mechanical Keyboard', 1, 1, 129.99),
        ('Smartwatch Pro', 2, 1, 299.99), ('Bluetooth Earbuds', 2, 1, 149.99), ('Tablet Stand', 3, 1, 49.99),
        ('Slim Fit Dress Shirt', 4, 2, 79.99), ('Casual Linen Shirt', 4, 12, 69.99), ('Summer Floral Dress', 5, 2, 89.99),
        ('Running Shoes', 6, 4, 129.99), ('Formal Oxford Shoes', 6, 12, 189.99), ('Coffee Table', 7, 13, 299.99),
        ('Air Fryer XL', 8, 3, 149.99), ('Garden Tool Set', 9, 3, 79.99), ('Yoga Mat Premium', 10, 4, 49.99),
        ('Camping Tent 4P', 11, 4, 199.99), ('Soccer Ball Pro', 12, 4, 49.99), ('Mystery Novel', 13, 5, 24.99),
        ('Space Warriors Game', 14, 5, 69.99), ('Anti-Aging Serum', 16, 6, 89.99), ('Face Cream', 16, 6, 49.99),
        ('Eyeshadow Palette', 17, 6, 59.99), ('Multivitamin', 18, 6, 29.99), ('Action Figure Set', 19, 7, 49.99),
        ('Strategy Board Game', 20, 7, 59.99), ('Building Block Set', 21, 7, 89.99), ('Dash Camera HD', 22, 8, 149.99),
        ('Motor Oil 5W-30', 23, 8, 34.99), ('Seat Covers', 24, 8, 89.99), ('Trail Mix Premium', 25, 9, 24.99),
        ('Coffee Beans 2lb', 26, 9, 29.99), ('Pasta Collection', 27, 15, 34.99), ('Executive Pen Set', 28, 10, 79.99),
        ('Notebook Set', 29, 10, 44.99), ('Desk Organizer', 30, 10, 59.99), ('Monitor Stand', 30, 10, 39.99),
        ('USB-C Hub', 1, 11, 59.99), ('Noise Canceling Headphones', 2, 1, 299.99), ('Power Bank 20000mAh', 2, 11, 49.99),
        ('Throw Pillows Set', 7, 13, 59.99), ('LED Floor Lamp', 7, 13, 129.99), ('Fitness Tracker', 10, 4, 79.99),
        ('Sports Water Bottle', 10, 14, 29.99), ('Gym Bag Deluxe', 10, 4, 59.99), ('Protein Bars 12pk', 25, 9, 29.99),
        ('Green Tea 100 bags', 26, 15, 24.99), ('Olive Oil Premium', 27, 15, 29.99), ('Marker Set 48pc', 28, 10, 34.99),
    ]

    for i, p in enumerate(products):
        cursor.execute("""
            INSERT INTO products (sku, product_name, description, subcategory_id, supplier_id, base_price, sale_price, cost_price)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, p)

    for i, (name, subcat, supplier, price) in enumerate(product_templates):
        sku = f"PROD-{i+11:03d}"
        cursor.execute("""
            INSERT INTO products (sku, product_name, description, subcategory_id, supplier_id, base_price, cost_price)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (sku, name, f"Quality {name.lower()}", subcat, supplier, price, price * 0.4))

    # Fill remaining products to reach 100
    for i in range(len(products) + len(product_templates) + 1, 101):
        cursor.execute("""
            INSERT INTO products (sku, product_name, description, subcategory_id, supplier_id, base_price, cost_price)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (f"PROD-{i:03d}", f"Product {i}", f"Description for product {i}",
              random.randint(1, 30), random.randint(1, 15),
              round(random.uniform(19.99, 499.99), 2), round(random.uniform(10, 200), 2)))

    # Product Variants (100)
    colors = ['Black', 'White', 'Blue', 'Red', 'Gray', 'Silver', 'Gold']
    sizes = ['S', 'M', 'L', 'XL', 'XXL']
    for i in range(100):
        cursor.execute("""
            INSERT INTO product_variants (product_id, variant_name, size, color, price_modifier)
            VALUES (?, ?, ?, ?, ?)
        """, (random.randint(1, 100), f"Variant {i+1}",
              random.choice(sizes) if random.random() > 0.5 else None,
              random.choice(colors), round(random.uniform(-20, 50), 2)))

    # Tags (30)
    tags = ['Bestseller', 'New Arrival', 'Limited Edition', 'Sale', 'Clearance', 'Eco-Friendly',
            'Premium', 'Budget-Friendly', 'Gift Idea', 'Holiday Special', 'Summer', 'Winter',
            'Work From Home', 'Outdoor', 'Indoor', 'Compact', 'Wireless', 'Waterproof',
            'Portable', 'Professional', 'Beginner', 'Family', 'Kids', 'Men', 'Women',
            'Unisex', 'Organic', 'Handmade', 'Imported', 'Local']
    for tag in tags:
        cursor.execute("INSERT INTO tags (tag_name, tag_type) VALUES (?, ?)",
                      (tag, random.choice(['popularity', 'status', 'feature', 'audience'])))

    # Product Tags (150)
    for _ in range(150):
        try:
            cursor.execute("INSERT OR IGNORE INTO product_tags (product_id, tag_id) VALUES (?, ?)",
                          (random.randint(1, 100), random.randint(1, 30)))
        except:
            pass

    # Product Images (200)
    for i in range(200):
        cursor.execute("""
            INSERT INTO product_images (product_id, image_url, alt_text, is_primary, display_order)
            VALUES (?, ?, ?, ?, ?)
        """, (random.randint(1, 100), f"https://images.example.com/product_{i}.jpg",
              f"Product image {i}", 1 if i % 2 == 0 else 0, i % 5))

    # Warehouses (5)
    warehouses = [
        ('East Coast Hub', 'Newark', 'NJ', 'USA', 50000),
        ('West Coast Center', 'Los Angeles', 'CA', 'USA', 75000),
        ('Central Distribution', 'Chicago', 'IL', 'USA', 60000),
        ('Southern Fulfillment', 'Dallas', 'TX', 'USA', 45000),
        ('Pacific Northwest', 'Seattle', 'WA', 'USA', 35000)
    ]
    for w in warehouses:
        cursor.execute("""
            INSERT INTO warehouses (warehouse_name, city, state, country, capacity)
            VALUES (?, ?, ?, ?, ?)
        """, w)

    # Warehouse Inventory (200)
    for _ in range(200):
        cursor.execute("""
            INSERT INTO warehouse_inventory (warehouse_id, product_id, quantity, reserved_quantity, reorder_level)
            VALUES (?, ?, ?, ?, ?)
        """, (random.randint(1, 5), random.randint(1, 100),
              random.randint(10, 200), random.randint(0, 20), random.randint(5, 25)))

    # Inventory Movements (100)
    for i in range(100):
        cursor.execute("""
            INSERT INTO inventory_movements (warehouse_id, product_id, movement_type, quantity, reference_type, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (random.randint(1, 5), random.randint(1, 100),
              random.choice(['in', 'out', 'adjustment', 'transfer']),
              random.randint(1, 50), random.choice(['order', 'restock', 'return', 'manual']),
              'Inventory movement'))

    # Shipping Addresses (60)
    for user_id in range(1, 31):
        for j in range(2):
            city_idx = (user_id + j) % len(CITIES)
            cursor.execute("""
                INSERT INTO shipping_addresses (user_id, address_label, recipient_name, street_address, city, state, postal_code, country, is_default)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (user_id, 'Home' if j == 0 else 'Work',
                  f"{FIRST_NAMES[user_id-1]} {LAST_NAMES[user_id-1]}",
                  f"{100 + user_id * 10} Main Street", CITIES[city_idx], STATES[city_idx],
                  f"{10000 + user_id * 100}", 'USA', 1 if j == 0 else 0))

    # Payment Methods (45)
    for user_id in range(1, 31):
        num_cards = 1 if random.random() > 0.5 else 2
        for j in range(num_cards):
            cursor.execute("""
                INSERT INTO payment_methods (user_id, method_type, card_last_four, card_brand, expiry_month, expiry_year, is_default)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (user_id, random.choice(['credit_card', 'debit_card']),
                  f"{random.randint(1000, 9999)}", random.choice(['Visa', 'Mastercard', 'Amex']),
                  random.randint(1, 12), random.randint(2025, 2029), 1 if j == 0 else 0))

    # Shopping Carts (40)
    for i in range(40):
        cursor.execute("""
            INSERT INTO shopping_carts (user_id, session_id, status)
            VALUES (?, ?, ?)
        """, (random.randint(1, 30) if random.random() > 0.3 else None,
              f"session_{i}", random.choice(['active', 'abandoned', 'converted'])))

    # Cart Items (100)
    for i in range(100):
        cursor.execute("""
            INSERT INTO cart_items (cart_id, product_id, quantity, unit_price)
            VALUES (?, ?, ?, ?)
        """, (random.randint(1, 40), random.randint(1, 100),
              random.randint(1, 3), round(random.uniform(20, 200), 2)))

    # Coupons (15)
    coupons = [
        ('WELCOME10', 'Welcome discount', 'percentage', 10, 50, 25),
        ('SUMMER25', 'Summer sale', 'percentage', 25, 100, 75),
        ('FLAT20', 'Flat $20 off', 'fixed_amount', 20, 150, None),
        ('FREESHIP', 'Free shipping', 'fixed_amount', 9.99, 75, None),
        ('VIP30', 'VIP exclusive', 'percentage', 30, 200, 100),
        ('FLASH50', 'Flash sale', 'percentage', 50, 0, 150),
        ('SAVE15', 'Save 15%', 'percentage', 15, 75, 50),
        ('HOLIDAY24', 'Holiday special', 'percentage', 20, 100, 60),
        ('FIRST10', 'First order', 'percentage', 10, 30, 30),
        ('BUNDLE10', 'Bundle discount', 'fixed_amount', 10, 80, None),
        ('CYBER40', 'Cyber Monday', 'percentage', 40, 150, 120),
        ('CLEARANCE', 'Clearance extra', 'percentage', 15, 25, 40),
        ('REFER25', 'Referral bonus', 'fixed_amount', 25, 100, None),
        ('LOYAL20', 'Loyalty member', 'percentage', 20, 50, 80),
        ('WEEKEND15', 'Weekend special', 'percentage', 15, 60, 45)
    ]
    for c in coupons:
        cursor.execute("""
            INSERT INTO coupons (coupon_code, description, discount_type, discount_value, minimum_order_amount, maximum_discount, valid_from, valid_until)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (*c, (datetime.now() - timedelta(days=30)).isoformat(),
              (datetime.now() + timedelta(days=60)).isoformat()))

    # Orders (150)
    statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered']
    for i in range(150):
        user_id = random.randint(1, 30)
        subtotal = round(random.uniform(50, 500), 2)
        shipping = round(random.uniform(0, 15), 2)
        tax = round(subtotal * 0.08, 2)
        discount = round(random.uniform(0, 30), 2) if random.random() > 0.7 else 0
        total = round(subtotal + shipping + tax - discount, 2)
        order_date = (datetime.now() - timedelta(days=random.randint(1, 90))).isoformat()

        cursor.execute("""
            INSERT INTO orders (user_id, order_number, status, subtotal, shipping_cost, tax_amount, discount_amount, total_amount, ordered_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (user_id, f"ORD-{i+1:05d}", random.choice(statuses),
              subtotal, shipping, tax, discount, total, order_date))

    # Order Items (450)
    for order_id in range(1, 151):
        num_items = random.randint(1, 5)
        for _ in range(num_items):
            product_id = random.randint(1, 100)
            quantity = random.randint(1, 3)
            unit_price = round(random.uniform(20, 200), 2)
            cursor.execute("""
                INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (order_id, product_id, f"Product {product_id}",
                  quantity, unit_price, round(quantity * unit_price, 2)))

    # Order Status History (300)
    for order_id in range(1, 151):
        for j, status in enumerate(['pending', 'confirmed']):
            cursor.execute("""
                INSERT INTO order_status_history (order_id, old_status, new_status, notes)
                VALUES (?, ?, ?, ?)
            """, (order_id, None if j == 0 else 'pending', status,
                  'Order placed' if j == 0 else 'Payment confirmed'))

    # Payment Transactions (150)
    for order_id in range(1, 151):
        cursor.execute("""
            INSERT INTO payment_transactions (order_id, user_id, transaction_type, amount, status, gateway_transaction_id)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (order_id, random.randint(1, 30), 'charge',
              round(random.uniform(50, 500), 2),
              'completed' if random.random() > 0.05 else 'failed',
              f"TXN-{order_id:06d}"))

    # Coupon Usage (50)
    for i in range(50):
        cursor.execute("""
            INSERT INTO coupon_usage (coupon_id, user_id, order_id, discount_applied)
            VALUES (?, ?, ?, ?)
        """, (random.randint(1, 15), random.randint(1, 30),
              random.randint(1, 150), round(random.uniform(5, 50), 2)))

    # Promotions (10)
    promos = [
        ('Summer Blowout', 'sale', 30), ('BOGO Electronics', 'bogo', None),
        ('Bundle & Save', 'bundle', 20), ('Flash Friday', 'flash_sale', 50),
        ('New Year Clear', 'sale', 40), ('Holiday Gifts', 'bundle', 25),
        ('Members Only', 'sale', 35), ('Back to School', 'sale', 20),
        ('Spring Launch', 'sale', 15), ('Weekend Warriors', 'flash_sale', 25)
    ]
    for name, ptype, discount in promos:
        cursor.execute("""
            INSERT INTO promotions (promotion_name, promotion_type, discount_percentage, start_date, end_date)
            VALUES (?, ?, ?, ?, ?)
        """, (name, ptype, discount,
              (datetime.now() - timedelta(days=10)).isoformat(),
              (datetime.now() + timedelta(days=30)).isoformat()))

    # Wishlists (35)
    for user_id in range(1, 31):
        if random.random() > 0.15:
            cursor.execute("""
                INSERT INTO wishlists (user_id, wishlist_name, is_public)
                VALUES (?, ?, ?)
            """, (user_id, random.choice(['My Wishlist', 'Birthday Ideas', 'Saved']),
                  1 if random.random() > 0.7 else 0))

    # Wishlist Items (100)
    for i in range(100):
        cursor.execute("""
            INSERT INTO wishlist_items (wishlist_id, product_id, priority)
            VALUES (?, ?, ?)
        """, (random.randint(1, 25), random.randint(1, 100), random.randint(0, 5)))

    # Product Reviews (150)
    review_titles = ['Great product!', 'Exactly what I needed', 'Good value', 'Highly recommend', 'Satisfied']
    review_texts = [
        'This product exceeded my expectations. Excellent quality!',
        'Very happy with this purchase. Works as described.',
        'Good product overall. Would buy again.',
        'Fantastic! Highly recommend to anyone.',
        'Solid product. Fast shipping.'
    ]
    for i in range(150):
        cursor.execute("""
            INSERT INTO product_reviews (product_id, user_id, rating, title, review_text, is_verified_purchase, is_approved, helpful_votes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (random.randint(1, 100), random.randint(1, 30),
              random.randint(3, 5), random.choice(review_titles),
              random.choice(review_texts), 1, 1 if random.random() > 0.1 else 0,
              random.randint(0, 50)))

    # Support Tickets (80)
    subjects = ['Order not received', 'Wrong item', 'Refund request', 'Product damaged',
                'Product question', 'Return help', 'Billing inquiry', 'General question']
    categories = ['order_issue', 'product_inquiry', 'refund_request', 'technical', 'other']
    ticket_statuses = ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed']
    for i in range(80):
        cursor.execute("""
            INSERT INTO support_tickets (user_id, ticket_number, subject, category, priority, status)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (random.randint(1, 30), f"TKT-{i+1:04d}",
              random.choice(subjects), random.choice(categories),
              random.choice(['low', 'medium', 'high']), random.choice(ticket_statuses)))

    # Support Ticket Messages (200)
    messages = [
        'Hello, I need help with my order.',
        'Thank you for contacting us. We are looking into this.',
        'Any update on this issue?',
        'We have resolved this. Let us know if you need help.'
    ]
    for ticket_id in range(1, 81):
        for j in range(random.randint(1, 4)):
            cursor.execute("""
                INSERT INTO support_ticket_messages (ticket_id, sender_id, sender_type, message_text)
                VALUES (?, ?, ?, ?)
            """, (ticket_id, random.randint(1, 30) if j % 2 == 0 else None,
                  'customer' if j % 2 == 0 else 'agent', messages[j % len(messages)]))

    conn.commit()
    conn.close()

    print(f"E-commerce database created at: {DB_PATH}")
    print(f"Connection string: sqlite:///{DB_PATH}")
    return DB_PATH


if __name__ == "__main__":
    create_database()
