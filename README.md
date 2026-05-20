# barbar-app Backend

A Node.js backend application with authentication, real-time Socket.IO functionality, and payment webhook support.

## Features

- **Authentication**: User registration, login, OTP verification
- **Real-time Communication**: Socket.IO integration for live features
- **Payment Integration**: Webhook support for payment processing
- **File Uploads**: Static file serving for uploads
- **Email Service**: OTP functionality via email
- **RESTful API**: Structured API endpoints with versioning

## Prerequisites

- Node.js (v16 or higher)
- MongoDB database
- npm or yarn

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd barbar-app
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

4. Configure your `.env` file with your actual values:
   - MongoDB connection string
   - JWT secrets (generate strong random strings)
   - Email configuration for OTP

## Environment Variables

Create a `.env` file based on `.env.example` and configure:

- `MONGO_URI`: Your MongoDB connection string
- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment (development/production)
- `PRV_TOKEN`: Private JWT token (minimum 32 characters)
- `RESET_TOKEN_SECRET`: Secret for password reset tokens
- `ACCESS_TOKEN_SECRET`: Secret for access tokens
- `EMAIL_SERVICE`: Email service provider (e.g., gmail)
- `OTP_EMAIL`: Email address for sending OTP
- `EMAIL_PASSWORD`: Email password or app password

## Running the Application

### Development

Start the server with nodemon:

```bash
npm run dev
```

### Production

Start the server:

```bash
npm start
```

## API Endpoints

The application uses versioned API endpoints under `/api/v1/`.

### Authentication

- User registration and login
- OTP verification
- Password reset functionality

### Payment Webhooks

- Webhook endpoint: `/api/v1/payment/webhook`

### File Uploads

- Static files served from: `/uploads`

## Project Structure

```
src/
├── api/                 # API routes
├── auth/               # Authentication modules
├── Transactions/       # Transaction handling
├── admin/              # Admin functionality
├── config/             # Configuration files
├── helper/             # Helper utilities
├── socket/             # Socket.IO configuration
└── index.js           # Application entry point
```

## Socket.IO

The application includes real-time functionality using Socket.IO. The server automatically initializes Socket.IO on startup.

## Security Notes

- Never commit your `.env` file to version control
- Use strong, randomly generated JWT secrets
- For Gmail, use App Passwords instead of your regular password
- Enable CORS appropriately for your production environment

## License

This project is licensed under the MIT License.
