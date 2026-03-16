# DisabilityMNE Admin Dashboard

Next.js admin dashboard for Disability Fitness Center.

## Tech stack

- Next.js App Router
- NextAuth (Credentials)
- Axios with token interceptor
- TanStack Query
- Sonner toast
- Socket.io client for chat
- Tailwind + shadcn-style UI components

## Environment

Create `.env.local`:

```env
NEXTPUBLICBASEURL=http://localhost:8000/api/v1
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace_with_secure_secret
```

## Run

```bash
npm install
npm run dev
```

## Auth flow

- Login uses `POST /auth/login`.
- Session stores:
  - `accessToken`
  - `refreshToken`
  - `user.role` (must be `admin`)
  - `user._id`
- Middleware protects dashboard routes and redirects non-admin users to `/login`.

## API integration rules

- All API call functions are in [lib/api.ts](./lib/api.ts).
- Axios interceptor attaches `Authorization: Bearer <accessToken>`.
- TanStack Query is used for all pages with loading skeleton + pagination.

## Routes

- `/login`
- `/forgot-password`
- `/verify-otp`
- `/reset-password`
- `/dashboard`
- `/user-management`
- `/program-management`
- `/exercise-library`
- `/recipes-management`
- `/subscription-management`
- `/revenue`
- `/feedback`
- `/support`
- `/settings`
