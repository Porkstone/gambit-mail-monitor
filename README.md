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
## ToDo List
```
[] Create record in users table after sign-in
[] Allow user to connect to mailbox
[] Monitor mailbox for booking.com emails
[] Analyse emails to see if they are reservations and extract data
[] Create watcher to monitor for better price
[] Send notificaiton email when better price is found

```

