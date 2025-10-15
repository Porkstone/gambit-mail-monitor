# This application uses:


- Backend: Convex (database, server logic)
- Frontend:
  - Server side: [Next.js](https://nextjs.org/) for optimized web hosting and page routing
  - Browser Side: 
    - [React](https://react.dev/) 
    - [Tailwind](https://tailwindcss.com/) for CSS styling
- [Clerk](https://clerk.com/) for authentication

## Convex Dashboard

https://dashboard.convex.dev/d/animated-fennec-106

```
// Show a link to the convex dashboard for logs, tables & env variables.
pnpm convex dashboard 
```
## Clerk Setup
To ensure users are created in the users table after they sign in a JWT Template was setup in the Clerk dashboard called "convex". You have to know to do this AI will not prompt you.

It contains these claims:
```
{
	"aud": "convex",
	"name": "{{user.full_name}}",
	"email": "{{user.primary_email_address}}",
	"picture": "{{user.image_url}}",
	"nickname": "{{user.username}}",
	"given_name": "{{user.first_name}}",
	"updated_at": "{{user.updated_at}}",
	"family_name": "{{user.last_name}}",
	"phone_number": "{{user.primary_phone_number}}",
	"email_verified": "{{user.email_verified}}",
	"phone_number_verified": "{{user.phone_number_verified}}"
}
```
## Google Cloud Setup

This application relies on the config in in API > Credentials
```
learning-chrome-extension - Web Application - 14590076015-baof...
```
Specifically the Client_ID, Client_Secret and ..
Authorised JavaScript origins
```
http://localhost:3000 - Dev
```
Authorised redirect URIs
```
http://localhost:3000/api/auth/gmail/callback
```

## ToDo List
```
[x] Create record in users table after sign-in
[x] Allow user to connect to mailbox
[x] Monitor mailbox for booking.com emails
[] Analyse emails to see if they are reservations and extract data
    - In progress 
[] Create watcher to monitor for better price
[] Send notificaiton email when better price is found

```

## Chrome Extension JWT handoff

The web app exposes a token endpoint and posts the Clerk convex JWT to the page so an extension can consume it.

- Endpoint: `GET /api/extension/token` → `{ token: string }` (requires user session)
- Bridge: `ExtensionBridge` posts a message: `{ source: "gmm", type: "token", token }`
- Example API for the extension: `GET /api/extension/ping` with `Authorization: Bearer <token>` and permissive CORS.

Content script example:
```js
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const msg = event.data;
  if (!msg || msg.source !== "gmm" || msg.type !== "token") return;
  const token = msg.token;
  // Use the token for API calls
  fetch("https://your-app-host/api/extension/ping", {
    headers: { Authorization: `Bearer ${token}` },
    credentials: "omit",
  }).then(r => r.json()).then(console.log);
});
```

