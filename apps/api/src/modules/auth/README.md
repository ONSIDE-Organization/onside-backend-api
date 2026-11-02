Authentication Flow & **API** Contract This document outlines the authentication architecture for Onside, bridging the React Native frontend and the NestJS backend.

🧠 Core Architecture Firebase Auth handles the heavy lifting for identity (Email/Password, Google, Apple, Password Resets) and issues a short-lived Firebase ID Token.

Onside Backend never handles passwords. It verifies the Firebase ID Token, manages the User database record, and issues a long-lived Onside **JWT** used for all subsequent app requests.

Golden Rule: The frontend talks to Firebase first, gets an idToken, and sends only that token to the Onside backend.

📱 Frontend-Backend Contract
Step	Frontend Action	Backend Endpoint
Typing username	Debounce **API** call (500ms)	**GET** /api/v1/auth/check-username?username=...
Sign up (Email)	Firebase **SDK** -> get token -> Register	**POST** /api/v1/auth/register
Sign up (Google)	Firebase **SDK** -> check profile -> Register	**POST** /api/v1/auth/register
Log in	Firebase **SDK** -> get token -> Login	**POST** /api/v1/auth/login
Forgot Password	Firebase **SDK** directly	(None - handled entirely by Firebase)
Subsequent Requests	Send Onside **JWT** in Header	Authorization: Bearer <onside_jwt>
🔄 Detailed Flows
## Registration (Email)
User types a username. Frontend hits **GET** /auth/check-username to show the green checkmark.

User taps *Create account*.

Frontend calls Firebase createUserWithEmailAndPassword().

Frontend gets the Firebase idToken.

Frontend calls **POST** /auth/register with { idToken, username, displayName }.

Backend returns { accessToken, user }. Frontend saves accessToken and enters the app.

## Registration (Google/Apple)

User taps *Continue with Google*.

Frontend completes OAuth flow and gets Firebase idToken.

Frontend calls **POST** /auth/login first to see if they already have an Onside account.

If login returns **404** USER_NOT_REGISTERED, route user to a *Complete Profile* screen.

User picks a username (checks availability via **GET** /auth/check-username).

Frontend calls **POST** /auth/register with { idToken, username, displayName, avatarUrl }.

Backend returns { accessToken, user }. Frontend saves token and enters app.

3. Login
User enters email/password (or taps Google/Apple).

Frontend calls Firebase signInWithEmailAndPassword().

Frontend gets the Firebase idToken.

Frontend calls **POST** /auth/login with { idToken }.

Backend returns { accessToken, user }. Frontend saves token and enters app.

## Token Management & Logout

Storage: Store the Onside accessToken securely (e.g., expo-secure-store).

Logout: Delete the token from secure storage, call firebase.auth().signOut(), and optionally hit **POST** /auth/logout (for analytics/**PRD** compliance).

Refresh: If the Onside **API** returns **401** Unauthorized, the frontend should call firebase.auth().currentUser.getIdToken(true) to refresh, then either retry the request with a new Onside **JWT** (via /login) or force the user back to the login screen.