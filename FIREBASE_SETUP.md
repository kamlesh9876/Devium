# Firebase Realtime Database Setup Guide

## Your User ID
`tbkOe7gP45WeQnkPGvxLt0wDhjg2`

## Required Database Structure

In your Firebase Realtime Database, you need to create the following structure:

```json
{
  "users": {
    "tbkOe7gP45WeQnkPGvxLt0wDhjg2": {
      "role": "admin",
      "name": "Kamlesh Pawar",
      "email": "kamleshsharadpawar@gmail.com",
      "status": "online",
      "createdAt": "2025-11-15T09:09:56.290Z",
      "lastLogin": "2025-11-26T15:43:18.369Z",
      "lastSeen": 1764171798369,
      "updatedAt": "2025-11-26T15:43:18.654Z"
    }
  }
}
```

## Steps to Add This Data

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click on **Realtime Database** in the left sidebar
4. Click the **+** icon next to your database root
5. Add key: `users`
6. Click the **+** icon next to `users`
7. Add key: `tbkOe7gP45WeQnkPGvxLt0wDhjg2`
8. Click the **+** icon next to your UID
9. Add key: `role`, value: `admin`

## Quick Test
After adding the data, refresh your browser at http://localhost:5173/ and you should see the Admin Dashboard instead of "Access Denied".

## Database URL
Make sure your `.env` file has the correct database URL. It should look like:
```
VITE_FIREBASE_DATABASE_URL=https://YOUR-PROJECT-ID-default-rtdb.firebaseio.com
```

If you're using a different region, the URL might be different (e.g., `asia-southeast1`).
