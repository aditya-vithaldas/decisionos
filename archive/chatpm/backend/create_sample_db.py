"""Create a sample SQLite database for testing the Data Reporter."""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "sample.db")


def create_sample_database():
    # Remove existing database
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Create tables
    cursor.execute("""
        CREATE TABLE customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            city TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT,
            price REAL NOT NULL,
            stock INTEGER DEFAULT 0
        )
    """)

    cursor.execute("""
        CREATE TABLE orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            order_date TEXT DEFAULT CURRENT_TIMESTAMP,
            total_amount REAL,
            status TEXT DEFAULT 'pending',
            FOREIGN KEY (customer_id) REFERENCES customers(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            unit_price REAL NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        )
    """)

    # Insert sample data
    customers = [
        ("Alice Johnson", "alice@example.com", "New York"),
        ("Bob Smith", "bob@example.com", "Los Angeles"),
        ("Carol White", "carol@example.com", "Chicago"),
        ("David Brown", "david@example.com", "Houston"),
        ("Eve Davis", "eve@example.com", "Phoenix"),
    ]
    cursor.executemany(
        "INSERT INTO customers (name, email, city) VALUES (?, ?, ?)",
        customers
    )

    products = [
        ("Laptop", "Electronics", 999.99, 50),
        ("Wireless Mouse", "Electronics", 29.99, 200),
        ("Keyboard", "Electronics", 79.99, 150),
        ("Monitor", "Electronics", 299.99, 75),
        ("Headphones", "Electronics", 149.99, 100),
        ("Desk Chair", "Furniture", 249.99, 30),
        ("Standing Desk", "Furniture", 449.99, 20),
        ("USB Cable", "Accessories", 9.99, 500),
        ("Webcam", "Electronics", 89.99, 80),
        ("Mouse Pad", "Accessories", 19.99, 300),
    ]
    cursor.executemany(
        "INSERT INTO products (name, category, price, stock) VALUES (?, ?, ?, ?)",
        products
    )

    orders = [
        (1, "2024-01-15", 1079.98, "completed"),
        (1, "2024-02-20", 299.99, "completed"),
        (2, "2024-01-18", 109.98, "completed"),
        (2, "2024-03-01", 449.99, "shipped"),
        (3, "2024-02-10", 1249.98, "completed"),
        (3, "2024-03-05", 29.99, "pending"),
        (4, "2024-01-25", 179.98, "completed"),
        (5, "2024-02-28", 999.99, "shipped"),
    ]
    cursor.executemany(
        "INSERT INTO orders (customer_id, order_date, total_amount, status) VALUES (?, ?, ?, ?)",
        orders
    )

    order_items = [
        (1, 1, 1, 999.99),   # Order 1: 1 Laptop
        (1, 3, 1, 79.99),    # Order 1: 1 Keyboard
        (2, 4, 1, 299.99),   # Order 2: 1 Monitor
        (3, 2, 2, 29.99),    # Order 3: 2 Wireless Mice
        (3, 10, 1, 19.99),   # Order 3: 1 Mouse Pad
        (4, 7, 1, 449.99),   # Order 4: 1 Standing Desk
        (5, 1, 1, 999.99),   # Order 5: 1 Laptop
        (5, 6, 1, 249.99),   # Order 5: 1 Desk Chair
        (6, 2, 1, 29.99),    # Order 6: 1 Wireless Mouse
        (7, 5, 1, 149.99),   # Order 7: 1 Headphones
        (7, 2, 1, 29.99),    # Order 7: 1 Wireless Mouse
        (8, 1, 1, 999.99),   # Order 8: 1 Laptop
    ]
    cursor.executemany(
        "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)",
        order_items
    )

    conn.commit()
    conn.close()

    print(f"Sample database created at: {DB_PATH}")
    print(f"Connection string: sqlite:///{DB_PATH}")


if __name__ == "__main__":
    create_sample_database()
