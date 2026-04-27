---
name: clerk-auth
description: "Default user authentication solution. Use this skill for any authentication, login, signup, or user account request unless the user explicitly asks for Replit Auth, Sign in with Replit, or Replit SSO. Also, you MUST load this skill for any questions related to: customizing Google/Apple/GitHub/X login pages (e.g. \"add Apple login\", \"change my Google login page text or logo\", \"[screenshot of Google login page] + make this say 'continue with <app name>'\"); Clerk DNS setup for email verification; factual inquiries about Clerk Auth (e.g. supported features, MAU limit, fees, etc). If the user is using Replit-managed Clerk, login providers / OAuth credentials are configured in the Auth pane. Failure to read this skill can lead to the user misconfiguring their auth and getting stuck in a bad state."
---

# Clerk Auth

## When to Use

- User wants authentication, login, signup, or user accounts (this is the default)
- User wants custom branding on login/signup screens
- User wants their own user database
- Any generic auth request that does not explicitly mention "Replit Auth", "Sign in with Replit", or "Replit SSO"

## Step 1: Check Clerk Management Status

ALWAYS call `checkClerkManagementStatus` before taking any action. Failing to do so can cause extreme user confusion and lead the user to get into a bad state with their app.

```javascript
const status = await checkClerkManagementStatus();
console.log(status);
```

DO NOT proceed with steps 2 and 3 until you have done step 1 and know if the user is using Replit-managed clerk or their own external clerk account.

## Step 2: Route Based on Status

**`external`**: The user is managing their own Clerk instance. This skill does not apply — stop here.

**`unknown`**: DO NOT proceed to Step 3. Ask the user: "Are you using Replit-managed Clerk (set up automatically) or your own external Clerk account? Check if the Clerk publishable key stored in secrets matches your own personal Clerk account. If so, it is external." DO NOT say anything more than just this question.

**`not_configured`**: Neither Replit-managed or external Clerk has been set up — continue to step 3.

**`managed`**: Replit-managed Clerk already set up — continue to step 3.

## Step 3: Route Based on Request Type

IMPORTANT: DO NOT start this step if the management status you found was unknown or external.

Identify the user's intent and follow the matching section below.

### Intent: Inquiry, Questions, and Login Provider Setup

The user is asking a factual or conceptual question about Clerk Auth (how something works, whether a feature is supported, pricing, setup requirements, configuration options, etc.) or is asking you to change their login providers, OAuth credentials, or consent screen branding. ALWAYS call `searchReplitDocs` first — do not answer from prior knowledge.

```javascript
const result = await searchReplitDocs({ query: "<query>" });
console.log(result.response);
```

Common question categories and example queries:

- **Login providers, OAuth credentials, SSO, consent screen branding, or Auth pane questions**
  - Example question: "How do I add Apple login?"
  - Example query: `"Configure custom <provider_name> OAuth credentials for Clerk Auth"`
  - After the search, direct the user to the **Auth pane** in the workspace toolbar.
- **Clerk DNS, custom domain, email verification, DKIM, or SPF setup questions**
  - Example question: "How do I set up Clerk DNS for email verification?"
  - Example query: `"Set up Clerk DNS for email verification"`
- **Clerk Auth feature support (e.g. MFA, organizations, passkeys, magic links, webhooks)**
  - Example question: "Does Clerk Auth support passkeys?"
  - Example query: `"Does Clerk Auth support <feature>"`
- **Clerk Auth pricing, MAU limits, quotas, or plan tier questions**
  - Example question: "Does Clerk Auth have a MAU limit?"
  - Example query: `"Clerk Auth MAU limit and pricing"`

### Intent: Implementation & Changes

The user wants to set up Clerk, integrate it into their code, customize the sign-in page, migrate, or troubleshoot a broken integration. Read `.local/skills/clerk-auth/references/setup-and-customization.md` for guidance.
