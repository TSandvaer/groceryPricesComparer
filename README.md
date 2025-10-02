# Grocery Price Comparer

A web application to compare grocery prices between Sweden and Denmark. Users can contribute price data by taking photos of price tags, which are processed by AI to extract details, or manually enter data. The app displays average prices to help cross-border shoppers find the best deals.

## Features

- **Authentication**: Email/password authentication via Firebase
- **Price Submission**:
  - Capture price tags with device camera
  - Upload existing photos
  - Google Vision API integration (placeholder - needs setup)
  - Manual form entry with prefilled data from AI
- **Price Comparison**:
  - Search and browse grocery items
  - View average prices in Sweden (SEK) vs Denmark (DKK)
  - See which country is cheaper
  - Percentage difference calculations
- **Responsive Design**: Works on mobile and desktop

## Tech Stack

- React 19 + TypeScript
- Vite (build tool)
- Firebase (Authentication + Firestore)
- Tailwind CSS
- Lucide React (icons)

## Setup Instructions

### 1. Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create/select your `groceryPricesComparer` project
3. Enable **Authentication** > Email/Password provider
4. Enable **Firestore Database**
5. Get your Firebase config from Project Settings
6. Update `src/firebase/config.ts` with your credentials:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "grocerypricescomparer",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};
```

### 2. Firestore Database Rules

Set up Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /priceEntries/{entry} {
      // Anyone authenticated can read
      allow read: if request.auth != null;
      // Only authenticated users can create their own entries
      allow create: if request.auth != null
        && request.resource.data.userId == request.auth.uid;
    }
  }
}
```

### 3. Google Vision API (Optional)

To enable image-to-text extraction:

1. Enable Google Cloud Vision API in your Google Cloud Console
2. Create a Cloud Function or backend endpoint to handle Vision API calls
3. Update the `processImage` function in `src/components/PriceSubmit/PriceSubmitForm.tsx`

**Note**: The Vision API integration is a placeholder. You'll need to implement the actual API call.

### 4. Install Dependencies

```bash
npm install
```

### 5. Run Development Server

```bash
npm run dev
```

### 6. Build for Production

```bash
npm run build
```

## Project Structure

```
src/
├── components/
│   ├── Auth/
│   │   └── AuthComponent.tsx          # Login/Signup
│   ├── Layout/
│   │   └── Header.tsx                 # Navigation header
│   ├── PriceComparison/
│   │   └── PriceComparisonView.tsx    # Price comparison table
│   └── PriceSubmit/
│       └── PriceSubmitForm.tsx        # Photo capture & form
├── firebase/
│   ├── auth.ts                        # Auth functions
│   ├── config.ts                      # Firebase config
│   └── firestore.ts                   # Database functions
├── hooks/
│   └── useAuth.ts                     # Auth state hook
├── types/
│   └── index.ts                       # TypeScript types
├── App.tsx                            # Main app component
└── main.tsx                           # App entry point
```

## Usage

### For Data Contributors

1. Sign up/Login
2. Click "Submit" in the header
3. Take a photo of a price tag or upload one
4. Confirm/edit the extracted data
5. Submit to the database

### For Price Viewers

1. Sign up/Login
2. View the comparison table (default view)
3. Search for specific grocery items
4. See average prices and which country is cheaper

## Database Schema

### PriceEntry Collection

```typescript
{
  id: string;
  groceryType: string;      // e.g., "Milk"
  price: number;            // e.g., 15.90
  currency: string;         // "SEK" or "DKK"
  store: string;            // e.g., "ICA", "Føtex"
  country: "SE" | "DK";     // Sweden or Denmark
  date: string;             // YYYY-MM-DD
  userId: string;           // Firebase user ID
  createdAt: Date;          // Timestamp
}
```

## Roadmap

- [ ] Implement Google Vision API integration
- [ ] Add data validation and normalization
- [ ] Create admin dashboard for data moderation
- [ ] Add charts/graphs for price trends
- [ ] Implement geolocation for auto-detecting country
- [ ] Add store-specific price comparisons
- [ ] Export price comparison reports

## Contributing

Contributions welcome! This is a community-driven project to help cross-border shoppers.

## License

MIT
