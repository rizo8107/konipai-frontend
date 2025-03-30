# Konipai CRM Frontend

A modern CRM application built with React, TypeScript, and Vite.

## Features

- Dashboard with metrics and analytics
- Order and customer management
- Product catalog management
- WhatsApp and Email templates and activities
- Payment tracking
- Responsive design for mobile and desktop

## Prerequisites

- Node.js 16.x or higher
- npm 8.x or higher

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd konipai-crm-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file in the root directory with the following variables:
```
VITE_POCKETBASE_URL=http://localhost:8090
POCKETBASE_ADMIN_EMAIL=your-admin-email
POCKETBASE_ADMIN_PASSWORD=your-admin-password
```

## Development

Start the development server:

```bash
npm run dev
```

The server will run on http://localhost:8080

## Build

To build for production:

```bash
npm run build
```

To build for development:

```bash
npm run build:dev
```

## Preview

To preview the production build:

```bash
npm run preview
```

## Deployment

To serve the production build:

```bash
npm start
```

## Dependencies Fixed

- Added `lovable-tagger` for component tagging in development
- Added `dotenv` for environment variable handling

## Technology Stack

- React 18
- TypeScript
- Vite
- TailwindCSS
- Radix UI
- React Query
- PocketBase
- React Router

## Docker

To build and run with Docker:

```bash
docker build -t konipai-frontend .
docker run -p 5000:5000 konipai-frontend
```

## Deployment with EasyPanel

Follow these steps to deploy the frontend on EasyPanel:

1. Create a new service
2. Use the repository URL
3. Specify the branch
4. Select the Dockerfile
5. Configure the environment variables from `.env.production`
6. Set the port to 5000 