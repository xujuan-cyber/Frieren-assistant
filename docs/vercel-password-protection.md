# Vercel Deployment Password Protection

This document explains how to enable and use the password protection feature for your Vercel deployment. This feature uses Next.js Middleware and Vercel API Functions with an elegant authentication page to restrict access to your deployed application.

## How it Works

When password protection is enabled, users attempting to access your Vercel deployment will be intercepted by middleware:
- If they are not authenticated, they will see an elegant password verification page.
- If they enter the correct password, they will be granted access to the application. A cookie is set in their browser to remember their session, so they won't need to re-enter the password for a certain period (e.g., 7 days) or until they clear their cookies.
- If they enter an incorrect password, they will be shown an error message and prompted to try again.
- The verification page automatically displays in either Chinese or English based on the user's browser language settings.

This protection works entirely through Next.js Middleware and Vercel API without modifying the main web application code.

## Setup Instructions

1. **Set the Access Password Environment Variable:**
   * Go to your project settings in Vercel.
   * Navigate to "Settings" -> "Environment Variables".
   * Create a new environment variable named `ACCESS_PASSWORD`.
   * Set its value to the password you want to use for accessing the site. Choose a strong, unique password.
   * Ensure the variable is available to all environments you wish to protect (Production, Preview, Development).
   * When you add or change environment variables, Vercel will prompt you to redeploy your project. Follow the prompts to complete the redeployment.

2. **Accessing Your Protected Site:**
   * Once the `ACCESS_PASSWORD` is set and the project has redeployed, try accessing your Vercel deployment URL.
   * You should see a password verification page.
   * Enter the password you configured in the `ACCESS_PASSWORD` environment variable.
   * Upon successful authentication, the page will reload and show the main application.

## Technical Details

- **Technology Used:** 
  - Next.js Middleware (`middleware.js`) for intercepting all page requests and serving the verification page
  - Vercel API Functions (`/api/auth.js`) for server-side password verification
  - Language-adaptive verification page (automatically displays in Chinese or English based on browser language)
- **Cookie Name:** `vercel_access_token` (This cookie stores the access password. It's HttpOnly, Secure in production, and SameSite=Strict).
- **Password Storage:** The actual password is only stored as an environment variable in your Vercel project settings. It is not hardcoded in the application.
- **Bypassing Protection:** If the `ACCESS_PASSWORD` environment variable is not set or is empty, the password protection will be bypassed, and the site will be publicly accessible. This allows for easy disabling of the feature if needed.
- **Non-invasive Implementation:** This protection is completely independent of the main web application code. All logic is contained in the `middleware.js` and `api/auth.js` files.
- **Security Note:** This is a presentation-layer protection that can be bypassed by users who disable JavaScript or directly access API endpoints. For stronger security, consider using Vercel's built-in password protection feature.
- **Multi-language Support:** The verification page automatically detects the browser's `accept-language` header to display a Chinese interface for Chinese users and an English interface for users of other languages.

## Troubleshooting

- **Password verification page doesn't appear:**
  * Ensure the `ACCESS_PASSWORD` environment variable is correctly set in Vercel and that the project has finished redeploying.
  * Check the browser console for any errors related to the middleware or authentication API.
  * Verify that the `/api/auth` endpoint is working by accessing it directly.
- **Incorrect password error, even with the correct password:**
  * Double-check the value of the `ACCESS_PASSWORD` environment variable for typos or extra spaces.
  * Try clearing your browser cookies for the site and attempting again.
  * Check the browser network tab to see if the API call is successful.
- **Language display issues:**
  * If the verification page language doesn't match your browser settings, confirm that your browser has the correct preferred language settings.
  * You can switch the display language of the verification page by modifying your browser's language settings.

For further assistance, please check the project's main README or open an issue in the repository.
