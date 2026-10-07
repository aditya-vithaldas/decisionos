# Data Inquirer

A chat-based data enquirer that lets you connect to databases, explore schemas, document your data, and query using natural language.

![Data Inquirer UI](https://img.shields.io/badge/UI-Admin%20Dashboard-blue)
![Python](https://img.shields.io/badge/Python-3.8+-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)

## Features

- **Connect** - Connect to PostgreSQL, MySQL, SQLite, or other SQL databases
- **Explore** - Browse tables, columns, relationships, and sample data
- **Document** - Add descriptions to tables and columns for better query generation
- **Query** - Ask questions in plain English and get SQL queries with results

## Screenshots

The application features a modern admin-style sidebar navigation:
- Dark sidebar with navigation sections
- Connection status indicator
- Stats cards showing database metrics
- Expandable table cards with schema details
- Chat-based query interface

## Quick Start

### Option 1: With PostgreSQL Sample Database (Recommended)

```bash
# Start the PostgreSQL database with sample e-commerce data
cd database
./setup.sh

# In another terminal, start the backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py

# Open frontend/index.html in your browser
# Use connection string: postgresql://datareporter:datareporter123@localhost:5432/ecommerce
```

### Option 2: Quick Start Script

```bash
./start.sh
```

This will:
- Create a Python virtual environment
- Install dependencies
- Create a sample SQLite database
- Start the Flask backend
- Open the frontend in your browser

## Sample PostgreSQL Database

The project includes a comprehensive e-commerce database with **30 tables** including:

| Category | Tables |
|----------|--------|
| **Users** | users, user_preferences, user_sessions, shipping_addresses, payment_methods |
| **Products** | products, product_variants, product_images, product_tags, product_reviews |
| **Categories** | categories, subcategories, tags |
| **Orders** | orders, order_items, order_status_history |
| **Shopping** | shopping_carts, cart_items, wishlists, wishlist_items |
| **Payments** | payment_transactions, coupons, coupon_usage, promotions |
| **Inventory** | warehouses, warehouse_inventory, inventory_movements |
| **Support** | support_tickets, support_ticket_messages |
| **Suppliers** | suppliers |

Sample data includes:
- 30 customers with preferences and multiple addresses
- 100 products across 10 categories and 30 subcategories
- 100 product variants (sizes, colors, materials)
- 150 orders with status history
- 80 support tickets with message threads
- And much more!

## Manual Setup

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

### PostgreSQL Database

```bash
cd database
docker-compose up -d
```

### Frontend

Open `frontend/index.html` in your browser.

## Connection Strings

Example connection strings:

| Database | Connection String |
|----------|-------------------|
| **PostgreSQL (Sample)** | `postgresql://datareporter:datareporter123@localhost:5432/ecommerce` |
| **PostgreSQL** | `postgresql://user:password@localhost:5432/database` |
| **MySQL** | `mysql+pymysql://user:password@localhost:3306/database` |
| **SQLite** | `sqlite:///./path/to/database.db` |

## AI-Powered Queries (Optional)

For better natural language to SQL conversion, set your OpenAI API key:

```bash
export OPENAI_API_KEY=your-api-key
```

Without an API key, the app uses pattern-based query generation.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/connect` | POST | Connect to a database |
| `/api/explore` | GET | Get database schema |
| `/api/documentation` | GET/POST | Get/save documentation |
| `/api/query` | POST | Execute a SQL query |
| `/api/generate-query` | POST | Generate SQL from natural language |
| `/api/status` | GET | Get connection status |

## Project Structure

```
DataInquirer/
├── backend/
│   ├── app.py              # Flask API server
│   ├── requirements.txt    # Python dependencies
│   └── create_sample_db.py # SQLite sample data generator
├── database/
│   ├── docker-compose.yml  # PostgreSQL container config
│   ├── init.sql            # E-commerce schema and data
│   └── setup.sh            # Database setup script
├── frontend/
│   └── index.html          # Single-page admin UI
├── start.sh                # Quick start script
└── README.md
```

## License

MIT License
