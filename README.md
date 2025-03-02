# Trading Signals

## Overview
This is the backend of a comprehensive platform designed to facilitate cryptocurrency trading by providing users with real-time trading signals, trade management, and portfolio tracking. The platform integrates with various APIs and services to offer a seamless trading experience. The future goal is to develop a user-friendly frontend to enhance accessibility and usability.

## Features
- **User Authentication:** Secure user signup, signin, and password reset functionalities.
- **Trade Management:** Create, update, and manage trades with detailed information.
- **Trade Plans:** Create and manage trade plans with specific pairs and timeframes.
- **Real-time Notifications:** Receive real-time notifications via Telegram for trade events and user activities.
- **Portfolio Tracking:** Track user balances and top-up statuses for SOL and stable coins.
- **Data Visualization:** Visualize trading data and signals using interactive charts.

## Project Structure
```
.
├── .env
├── .gitignore
├── index.js
├── package.json
├── README.md
├── src/
│   ├── main/
│   │   ├── api/
│   │   │   ├── tradePlanResource.js
│   │   │   ├── tradeResource.js
│   │   │   └── userResource.js
│   │   ├── config/
│   │   │   └── mongoose.js
│   │   ├── middleware/
│   │   │   └── auth.js
│   │   ├── model/
│   │   │   ├── trade.js
│   │   │   ├── tradePlan.js
│   │   │   └── user.js
│   │   ├── utils/
│   │   │   ├── ohlcv.js
│   │   │   ├── supertrend.js
│   │   │   ├── telegram.js
│   │   │   └── tradeUtils.js
│   └── tests/
│       ├── SOL-USDC/
│       │   ├── 15min30DaysTest.txt
│       │   ├── 1h30daysTest.txt
│       │   ├── 30min30DaysTest.txt
│       │   └── 5min30DaysTest.txt
│       └── tests.js
└── vercel.json
```

## Installation
1. **Clone the repository:**
   ```sh
   git clone https://github.com/yourusername/trading-signals.git
   cd trading-signals
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Set up environment variables:** Create a `.env` file in the root directory and add the following variables:
   ```ini
   MONGODB_URI=your_mongodb_uri
   MONGODB_DB_NAME=your_database_name
   JWTSECRET=your_jwt_secret
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   TELEGRAM_CHAT_ID=your_telegram_chat_id
   CLIENT_URL=your_client_url
   PORT=your_port
   ```

## Usage
1. **Start the server:**
   ```sh
   npm start
   ```
2. The server will be running at `http://localhost:3000`.

## Tests
The project includes several test files to validate the trading strategies over different timeframes:
- `5min30DaysTest.txt`: Test for 30 days with a 5-minute timeframe.
- `15min30DaysTest.txt`: Test for 30 days with a 15-minute timeframe.
- `30min30DaysTest.txt`: Test for 30 days with a 30-minute timeframe.
- `1h30daysTest.txt`: Test for 30 days with a 1-hour timeframe.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## Contact
For any inquiries, please contact [harshul.codez@gmail.com](mailto:harshul.codez@gmail.com).
