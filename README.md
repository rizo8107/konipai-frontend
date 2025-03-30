# Konipai CRM Frontend

This is the frontend application for the Konipai CRM system.

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Shadcn UI Components
- React Router
- React Query

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn

### Installation

1. Install dependencies:

```bash
npm install
```

2. Run the development server:

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
```

4. Serve the production build:

```bash
npm run start
```

## Environment Variables

Create a `.env` file with the following variables:

```
VITE_API_URL=http://localhost:3000/api
VITE_EMAIL_API_URL=http://localhost:3000/email-api
VITE_WHATSAPP_API_URL=https://backend-whatsappapi.7za6uc.easypanel.host
VITE_POCKETBASE_URL=https://backend-pocketbase.7za6uc.easypanel.host/
```

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