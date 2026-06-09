# Tableli Platform Backend

A powerful Node.js backend application designed for a Chef Booking platform. It includes role-based authentication, real-time Socket.IO chat, automated Stripe Escrow payment routing, and real-time notification systems.

## Key Features

- **Authentication & RBAC**: Secure User, Chef, and Admin roles with JWT-based authentication. OTP email verification.
- **Chef Booking System**: Advanced booking algorithms with dynamic pricing, minimum guest validation, and custom quotes.
- **Stripe Escrow & Payouts**: 
  - Customers pay securely via Stripe Checkout.
  - Funds are initially placed on **HOLD** (Escrow).
  - Admins capture and release payments post-service.
  - Automated split routing: 15% to Platform, 85% direct transfer to the Chef's connected Stripe account.
- **Real-time Live Chat**: 1-on-1 private messaging between Users and Chefs using `Socket.IO`. Features include Typing Indicators, Read Receipts (Seen), and Chat History APIs.
- **Notification Engine**: Real-time automated notifications for booking requests, payment holds, status updates, and payouts.
- **Profile & Menu Management**: Dedicated dashboards for chefs to manage their portfolios, dishes, and availability windows.

## Prerequisites

- Node.js (v16 or higher)
- MongoDB database
- Stripe Account (with Stripe Connect configured)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd tableli
```

2. Install dependencies:
```bash
npm install
```

3. Configure your `.env` file:
```bash
cp .env.example .env
```

## Environment Variables

Make sure to configure the following variables in your `.env` file:

- `PORT`: Server port (default: 8005)
- `MONGO_URI`: Your MongoDB connection string
- `FRONTEND_URL`: URL of the frontend app (for CORS and Socket connections)
- `PRV_TOKEN` / `ACCESS_TOKEN_SECRET`: JWT secrets
- `STRIPE_SECRET_KEY`: Stripe backend API key
- `STRIPE_WEBHOOK_KEY`: Stripe Webhook signing secret (`whsec_...`)
- `EMAIL_SERVICE`, `OTP_EMAIL`, `EMAIL_PASSWORD`: Nodemailer configurations

## Running the Application

**Development Mode (Nodemon):**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

## Core API Endpoints

All APIs are versioned under `/api/v1/`.

### Authentication & Users
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `PATCH /api/v1/profile/update`

### Bookings (Chef & User)
- `POST /api/v1/booking/:chefId` - Create a booking
- `GET /api/v1/booking/client` - Get user's bookings
- `GET /api/v1/booking/chef` - Get chef's bookings
- `PATCH /api/v1/booking/:id/status` - Confirm/Cancel booking

### Payments & Escrow
- `POST /api/v1/payment/checkout/:bookingId` - Initiate payment
- `POST /api/v1/payment/stripe-account-onboarding` - Chef Stripe Connect
- `POST /api/v1/payment/capture/:paymentId` - Admin releases funds (15%/85%)
- `POST /api/v1/payment/webhook` - Stripe webhook listener

### Real-time Chat (REST + Socket)
- `GET /api/v1/conversations` - Get Inbox
- `GET /api/v1/conversations/:conversationId/messages` - Get Chat History
- Socket.IO Events: `join-conversation`, `single-chat-send-message`, `mark-messages-read`, `typing`

## Payment Webhook Setup (Local Testing)
To test payments locally, use the Cloudflare tunnel or Stripe CLI:
```bash
stripe listen --forward-to localhost:8005/api/v1/payment/webhook
```
Copy the webhook signing secret and update `STRIPE_WEBHOOK_KEY` in `.env`.

## Project Structure
```
src/
├── api/                 # Global API Router
├── auth/               # Authentication, OTP, JWT
├── booking-chef/       # Booking logic and validations
├── conversition/       # Inbox & Chat REST controllers
├── message/            # Message schema and DB services
├── notification/       # Notification engine
├── payment/            # Stripe integration and Escrow logic
├── profileSetup/       # User & Chef profiles
├── socket/             # Socket.IO handlers and events
└── index.js           # Express App Entry Point
```

## Security
- Stripe Webhooks use raw body parsing for signature validation.
- Endpoints are protected by `authenticateToken`, `requireChefRole`, and `superAdminMiddleware`.

## License
MIT License.
