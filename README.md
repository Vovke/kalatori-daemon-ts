# Kalatori Daemon TypeScript — Non-Custodial Polkadot Payments Gateway

## Introduction

Kalatori is a non-custodial payments gateway designed for the Polkadot ecosystem. It allows any compatible eCommerce plugin to create and monitor the payment status of its orders. Each order is used to derive a unique Polkadot address (using account derivation paths), mapping payments to the particular order ID. This API supports both **embedded** and **offsite** payment modes.

## Features

- **Non-custodial**: No intermediary custody of funds.
- **Order Mapping**: Unique Polkadot address for each order.
- **Embedded & Offsite Payment Modes**: Flexible integration options.
- **API-based Monitoring**: Real-time payment status updates.

## Table of Contents

1. [Installation](#installation)
2. [Usage](#usage)
3. [API Documentation](#api-documentation)
4. [Environment Configuration](#environment-configuration)
5. [Development](#development)
6. [Running Tests](#running-tests)
7. [Contributing](#contributing)
8. [License](#license)

## Installation

### Prerequisites

- Node.js (version >= 16.x)
- Yarn

### Steps

1. Clone the repository:
   ```sh
   git clone git@github.com:Vovke/kalatori-daemon-ts.git
   cd kalatori-daemon-ts
   ```

2. Install dependencies:
   ```sh
   yarn install
   ```

3. Set up the environment variables by creating a `.env` file in the root directory and adding the necessary variables:
   ```sh
   cp .env.example .env
   ```

4. Configure the database and run migrations:
   ```sh
   yarn migration:run
   ```

## Usage

### Starting the Daemon

The environment is determined by force setting NODE_ENV (production|development|test) in the package.json file

To start the Kalatori daemon in development mode, use the following command:
    ```sh
    yarn dev
    ```

To start the Kalatori daemon in production mode, use the following command:
    ```sh
    yarn start
    ```

### Example Request

To derive an address for an order and initialize payment monitoring, you can use the following example:

```sh
curl -X POST "http://localhost:3000/v2/order/12345" -H "Content-Type: application/json" -d '{
  "amount": 17.99,
  "currency": "USDC",
  "callback": "https://api.shop.example.com/webhooks/kalatori/daemon_callback?order=12345&hmac=055f479a461db45d02d6ec192de7f4a3"
}'
```

## API Documentation

The Kalatori API is documented in OpenAPI 3.0 format. Below is a summary of the key endpoints:

### Endpoints

#### /v2/order/{orderId}

- **POST**: Derive an address for the specified order or check/update the status if it already exists.

#### /v2/order/{orderId}/forceWithdrawal

- **POST**: Force the withdrawal of the specified order by shop admins.

#### /public/v2/payment/{paymentAccount}

- **POST**: Get the order status by the payment account for public consumption by the "offsite payment" frontend.

#### /v2/status

- **GET**: Get the general configuration of the daemon.

#### /v2/health

- **GET**: Get the health status of the server.

For detailed API documentation, refer to the [API Specifications](https://alzymologist.github.io/kalatori-api/).

## Environment Configuration

Environment variables are used to configure the Kalatori daemon. Here are example configuration files for different environments:

### .env.production

```
NODE_ENV=production
PORT=3000
DATABASE_URL=kalatori.sqlite
LOG_LEVEL=warn
KALATORI_CONFIG=./config/chains.json
KALATORI_SEED="bottom drive obey lake curtain smoke basket hold race lonely fit walk"
KALATORI_CHAIN_NAME="polkadot"
KALATORI_DECIMALS=10
KALATORI_RECIPIENT="5DfhGyQdFobKM8NsWvEeAKk5EQQgYe9AydgJ7rMB6E1EqRzV"
KALATORI_REMARK="KALATORI_REMARK"
```

### .env.development

```
NODE_ENV=development
PORT=3000
DATABASE_URL=kalatori.sqlite
LOG_LEVEL=info
KALATORI_CONFIG=./config/chains.json
KALATORI_SEED="bottom drive obey lake curtain smoke basket hold race lonely fit walk"
KALATORI_RPC="ws://localhost:8000"
KALATORI_CHAIN_NAME="chopsticks"
KALATORI_DECIMALS=10
KALATORI_RECIPIENT="5DfhGyQdFobKM8NsWvEeAKk5EQQgYe9AydgJ7rMB6E1EqRzV"
KALATORI_REMARK="KALATORI_REMARK"
```

### .env.test

```
NODE_ENV=test
PORT=3001
DATABASE_URL=kalatori_test.sqlite
LOG_LEVEL=debug
KALATORI_CONFIG=./config/chains.json
KALATORI_SEED="bottom drive obey lake curtain smoke basket hold race lonely fit walk"
KALATORI_RPC="ws://localhost:8000"
KALATORI_CHAIN_NAME="chopsticks"
KALATORI_DECIMALS=10
KALATORI_RECIPIENT="5DfhGyQdFobKM8NsWvEeAKk5EQQgYe9AydgJ7rMB6E1EqRzV"
KALATORI_REMARK="KALATORI_TEST_REMARK"
```

## Development

### Steps

1. Clone the repository and navigate to the project directory.
2. Install dependencies using `yarn` or `npm install`.
3. Run database migrations:
   ```sh
   yarn migration:run
   ```
4. Run chopsticks in a separate terminal:
    ```sh
    chopsticks --config config/chopsticks.yml 
    ```
5. Start the development server:
   ```sh
   yarn dev
   ```

## Running Tests

To run tests locally, ensure that chopsticks is running in a separate terminal:
```sh
chopsticks --config config/chopsticks.yml
```

Then, run the tests:
```sh
yarn test
```

## Contributing

We welcome contributions! Please read our [Contributing Guidelines](CONTRIBUTING.md) for more details.

### Steps to Contribute

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Commit your changes (`git commit -am 'Add new feature'`).
4. Push to the branch (`git push origin feature-branch`).
5. Open a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.md) file for details.

