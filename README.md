# Mini ERP + CRM Operations Portal

A complete, high-performance, and visually stunning operations portal designed for wholesale/distribution businesses. This project integrates CRM customer profiling, inventory controls, warehouse logistics (stock movement log auditing), and sales checkout workflows (challan confirmation inventory deduction) in a modern single-page dashboard.

## Placement Submission Details
*   **GitHub Repository**: [Satish-devara/Fundsroom](https://github.com/Satish-devara/Fundsroom)
*   **Live Frontend URL**: [Vercel Portal](https://fundsroom-sooty.vercel.app/)
*   **Live Backend API URL**: [Render Web Service (Health Endpoint)](https://mini-erp-backend-w9f9.onrender.com/health)
*   **API Testing Documentation**: Postman Collection JSON included in workspace root as `mini-erp.postman_collection.json`

---

## Technical Stack
*   **Backend**: Node.js with TypeScript and Express.js, utilizing Prisma ORM with PostgreSQL. Includes JWT authentication, validation filters, pagination, transaction-safe inventory adjustments, and REST APIs.
*   **Frontend**: React with TypeScript and Vite, styled using a high-end custom Vanilla CSS Glassmorphism design system. Fully responsive sidebar-navigation, calendar schedules, product dispatch grids, and status controls.
*   **Database**: Isolated PostgreSQL server running locally on port **5433** under trust authentication.

---

## Architectural Highlights
1.  **ERP Transaction Safety**: Challan confirmation and manual stock adjustments are executed within database transactions (`prisma.$transaction`) to prevent concurrent race conditions. Stock levels are strictly checked to prevent negative inventory, throwing descriptive errors (HTTP 400) if a sale exceeds stock.
2.  **Document Snapshots**: When a Sales Challan is created, snapshots of the Customer profile and all Product lines (SKU, name, price, warehouse shelf) are captured in JSON columns. This ensures document integrity so historical invoices remain unaffected by future price adjustments or customer information changes.
3.  **Role-Based Access Control**:
    *   **Admin**: Unrestricted read/write access across all modules.
    *   **Sales**: Access to CRM Customers (add/edit/notes) and Sales Challan creation. No physical stock manipulation.
    *   **Warehouse**: Access to Inventory management (manual adjustments, low-stock checks) and Sales Challan status processing (Confirming dispatches). No customer modifications.
    *   **Accounts**: Access to CRM customer detail audits (post follow-up notes) and general dashboards. No catalog edits.

---

## Directory Structure
```
FundsRoom/
├── backend/
│   ├── prisma/             # Database schemas & seeds
│   ├── src/
│   │   ├── controllers/    # API business logic
│   │   ├── middleware/     # JWT authentication & roles guard
│   │   ├── routes/         # Express endpoint mappings
│   │   └── __tests__/      # Automated Jest suite
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/     # UI Views (CRM, Inventory, Challans, etc.)
│   │   ├── context/        # Session context & API client
│   │   └── index.css       # Premium custom stylesheet
│   └── index.html
└── README.md
```

---

## Setup & Running Guide

### Prerequisites
*   Node.js (v18+)
*   npm (v9+)
*   PostgreSQL (Client tools `psql`, `initdb`, `pg_ctl`, `createdb` available on shell path)

### 1. Database Initialization
This project runs its own isolated PostgreSQL cluster on port `5433` under the local user to bypass global password limitations:
```bash
# Initialize database cluster in workspace
/opt/homebrew/opt/postgresql@14/bin/initdb -D db_data --auth=trust

# Start PostgreSQL server on port 5433
/opt/homebrew/opt/postgresql@14/bin/pg_ctl -D db_data -o "-p 5433" -l db.log start

# Create the mini_erp database
/opt/homebrew/opt/postgresql@14/bin/createdb -p 5433 mini_erp
```

### 2. Backend Installation & Start
```bash
cd backend
npm install

# Run database migrations (creates tables)
npx prisma migrate dev --name init

# Seed database with roles, products, and customers
npm run db:seed

# Run backend test suite (validates stock deduction/insufficient stock errors)
npm run test

# Start Express server in development mode (runs on http://localhost:5001)
npm run dev
```

### 3. Frontend Installation & Start
```bash
cd ../frontend
npm install

# Compile/build verification
npm run build

# Start Vite dev server (runs on http://localhost:5173)
npm run dev
```

---

## Test Login Credentials
Use these pre-seeded accounts to explore the role-based portals:

| Role | Email | Password | Allowed Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@fundsroom.com` | `admin123` | Unrestricted read/write |
| **Sales** | `sales@fundsroom.com` | `sales123` | Create Customers, Issue Draft/Confirmed Challans |
| **Warehouse** | `warehouse@fundsroom.com` | `warehouse123` | Edit Products, Adjust Stock levels, Confirm dispatches |
| **Accounts** | `accounts@fundsroom.com` | `accounts123` | View Inventory, Add CRM follow-up notes |

---

## API Endpoints List

### Authentication
*   `POST /api/auth/login` - User login.
*   `GET /api/auth/me` - Retrieve current token profile.

### Customer CRM
*   `GET /api/customers` - Search & filter customers (Paginated).
*   `GET /api/customers/:id` - Fetch single customer with note logs.
*   `POST /api/customers` - Create client profile (Sales & Admin).
*   `PUT /api/customers/:id` - Edit client profile (Sales & Admin).
*   `POST /api/customers/:id/notes` - Add follow-up logs (Sales, Accounts, Admin).

### Product & Stock Inventory
*   `GET /api/products` - Search products & filter low stock warnings (Paginated).
*   `GET /api/products/:id` - Fetch product details & recent movement log.
*   `POST /api/products` - Create product SKU (Warehouse & Admin).
*   `PUT /api/products/:id` - Edit product specifications (Warehouse & Admin).
*   `POST /api/products/:id/stock` - Physical stock adjustment transaction (Warehouse & Admin).
*   `GET /api/products/movements` - Query global stock movement audit log.

### Sales Challans
*   `GET /api/challans` - List challans (Paginated).
*   `GET /api/challans/:id` - Fetch details with snapshots.
*   `POST /api/challans` - Create Draft or Confirmed Challan. Check stock & decrement if Confirmed (Sales & Admin).
*   `PUT /api/challans/:id/status` - Transition status: Draft -> Confirmed (decrements stock) or Confirmed -> Cancelled (restores stock) (Sales, Warehouse, Admin).

---

## Known Limitations & Future Scope
1. **Cloud Media Storage**: Product images are represented as text metadata / warehouse location labels. For production environments, integrating Amazon S3 or Cloudinary is recommended to host physical product images.
2. **Server-Side PDF Generation**: Challans can be printed directly using browser standard print dialogs styled with customized print-media stylesheets. Utilizing a server-side PDF generator (like PDFKit or Puppeteer) for raw invoice downloads is a future enhancement.
3. **WebSockets for Real-time Alerts**: Low-stock alerts and CRM follow-up timelines update automatically on dashboard load/refresh. Integrating Socket.io would allow server-pushed notifications in real-time.
