# Social Backend (Express + TypeScript + MongoDB + Socket.IO)

A fully-typed Node.js backend implementing auth (JWT access/refresh + optional TOTP 2FA + backup codes), user profile, posts/comments with freeze vs hard-delete and cascade rules, social (block, friend requests, unfriend), email templating with tags, real-time presence and typing, Zod validation with bilingual error messages (English/Arabic), audit logging, rate limits, and tests.

## Tech
- Express + TypeScript
- MongoDB + Mongoose
- Socket.IO (presence + typing)
- JWT (access + refresh) + TOTP (otplib)
- Nodemailer + Handlebars templates (X-Tags header for email tags)
- Zod validation (messages: `"English | العربية"`)
- Jest + Supertest (+ mongodb-memory-server for tests)

## Env
Copy `.env.example` to `.env` and adjust.

Required environment variables:
- `GOOGLE_CLIENT_ID`: Google OAuth 2.0 Client ID (for Google sign-in)

## NPM Scripts
- dev: ts-node-dev server
- build: TypeScript build to `dist`
- start: run compiled server
- test: jest
- lint, format

## Endpoints
- Auth
  - POST /api/auth/register
  - POST /api/auth/login (rate limited)
  - POST /api/auth/google (Google OAuth sign-in)
  - POST /api/auth/refresh
  - POST /api/auth/logout
  - POST /api/auth/password (auth)
  - POST /api/auth/2fa/setup (auth)
  - POST /api/auth/2fa/enable (auth)
  - POST /api/auth/2fa/disable (auth)
  - POST /api/auth/2fa/regenerate-backup (auth)
  - POST /api/auth/email/update-request (auth)
  - GET  /api/auth/email/verify?token=...
- Users
  - GET  /api/users/me (auth)
  - PATCH /api/users/me (auth)
- Posts
  - POST /api/posts (auth)
  - GET  /api/posts/:id
  - PATCH /api/posts/:id (auth)
  - POST /api/posts/:id/freeze (auth admin)
  - POST /api/posts/:id/unfreeze (auth admin)
  - DELETE /api/posts/:id/hard (auth admin)
- Comments
  - POST /api/comments (auth)
  - GET  /api/comments/:id
  - GET  /api/comments/:id/with-replies
  - PATCH /api/comments/:id (auth)
  - POST /api/comments/:id/freeze (auth admin)
  - POST /api/comments/:id/unfreeze (auth admin)
  - DELETE /api/comments/:id/hard (auth admin)
- Social
  - POST   /api/social/block/:userId (auth)
  - DELETE /api/social/block/:userId (auth)
  - POST   /api/social/friend-requests/:toUserId (auth)
  - POST   /api/social/friend-requests/:id/accept (auth)
  - DELETE /api/social/friend-requests/:id (auth)
  - DELETE /api/social/friends/:userId (auth)
- Email
  - POST /api/email/send (auth, rate limited)

## Validation
- All payloads validated with Zod + bilingual messages (English | العربية)

## Roles
- `admin` can freeze/unfreeze/hard-delete
- `user` limited to own content updates

## Freeze vs Hard Delete + Cascade Rules
- Post hard delete: remove post + comments/replies + likes + saved items + related notifications
- Comment hard delete: remove comment + nested replies + related likes + notifications
- AuditLog records `freeze`, `unfreeze`, `hard_delete` actions (who, when, reason)

## Realtime (Socket.IO)
- Connect with `auth.token` = Access JWT (or `Authorization: Bearer ...`)
- Events:
  - `user:online` { userId }
  - `user:offline` { userId }
  - `typing` { fromUserId, toUserId, typing: boolean }
- Emit:
  - `typing:start` { toUserId }
  - `typing:stop` { toUserId }

## Emails
- Handlebars templates in `src/templates/emails`
- `sendEmail({ to, subject, template, context, tags })`
- Sets header `X-Tags: <comma-separated>`

## Tests
- Automated: `npm test`
- In-memory MongoDB
- Coverage includes auth, posts/comments cascade, realtime typing

## Postman
- See `postman/social-backend.postman_collection.json`

---

# الخلفية الاجتماعية (Express + TypeScript)

نظام خلفي متكامل يدعم تسجيل الدخول بـ JWT (رمز وصول/تحديث) + التحقق بخطوتين TOTP، ملف المستخدم، منشورات وتعليقات مع تجميد (Freeze) وحذف نهائي (Hard Delete) وقواعد حذف متسلسل، ميزات اجتماعية (حظر، طلبات صداقة، إلغاء الصداقة)، قوالب بريد إلكتروني بـ Handlebars وعلامات (Tags)، تواجد لحظي وحالة الكتابة باستخدام Socket.IO، والتحقق من المدخلات بـ Zod برسائل ثنائية اللغة، وسجل تدقيق، وحدود المعدل.

## خطوات القبول (ملخص)
- تسجيل مستخدم وتحديث كلمة المرور وتفعيل 2FA وتوليد رموز احتياطية
- تحديث البريد الإلكتروني واستلام رابط التحقق
- إنشاء منشور وتعليق/رد، تجربة تجميد/إلغاء، ثم حذف نهائي وملاحظة الحذف المتسلسل
- تفعيل Socket.IO لمستخدمين اثنين والملاحظة عند الاتصال/القطع وإشعار الكتابة
- تجربة الحظر وطلبات الصداقة والإلغاء

## تشغيل
1) `npm install`
2) `npm run dev` (أو `npm test` للتشغيل التلقائي للاختبارات)
