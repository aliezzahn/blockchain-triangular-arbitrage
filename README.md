# Triangular Arbitrage Monitor

**Triangular Arbitrage Monitor** is a mobile-first web application built with **React 19** that enables users to monitor potential arbitrage opportunities across three tokens on the Ethereum blockchain. By integrating with the Uniswap V3 Quoter contract, it calculates profits from triangular arbitrage trades and offers real-time suggestions for profitable token combinations. The app features a dark-themed, touch-friendly interface optimized for mobile devices.

---

## Table of Contents

- [Triangular Arbitrage Monitor](#triangular-arbitrage-monitor)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [How It Works](#how-it-works)
    - [Token Selection](#token-selection)
    - [Arbitrage Calculation](#arbitrage-calculation)
    - [Suggestion System](#suggestion-system)
    - [User Interface](#user-interface)
    - [Error Handling](#error-handling)
    - [Caching](#caching)
  - [Features](#features)
  - [Usage](#usage)
  - [Troubleshooting](#troubleshooting)
  - [License](#license)

---

## Overview

The Triangular Arbitrage Monitor helps users identify and explore arbitrage opportunities by simulating trades across three tokens on Ethereum's Uniswap V3 decentralized exchange. It uses a curated list of six high-liquidity tokens (WETH, USDC, DAI, USDT, WBTC, MATIC) to ensure reliable and fast calculations. The app not only monitors user-selected token trios but also proactively suggests profitable alternatives when issues arise, making it a powerful tool for crypto traders.

---

## How It Works

### Token Selection

- The app starts with a pre-defined list of six high-liquidity Ethereum tokens: WETH, USDC, DAI, USDT, WBTC, and MATIC.
- Users select three unique tokens from dropdown menus to define a triangular arbitrage path (e.g., WETH → USDC → DAI).
- These tokens are chosen to minimize calculation overhead and ensure viable trading pairs exist on Uniswap V3.

### Arbitrage Calculation

- The app calculates potential profits by simulating a three-step trade using the Uniswap V3 Quoter contract:
  1. **Step 1**: Trade 1 unit of Token 1 (e.g., WETH) for Token 2 (e.g., USDC).
  2. **Step 2**: Trade the resulting amount of Token 2 for Token 3 (e.g., DAI).
  3. **Step 3**: Trade the resulting amount of Token 3 back to Token 1.
- The profit is determined by comparing the final amount of Token 1 to the initial 1-unit input, accounting for Uniswap’s 0.3% fee tier.
- Calculations refresh automatically every 30 seconds to reflect changing market conditions.

### Suggestion System

- At startup, the app pre-calculates profits for all possible combinations of the six tokens (20 trios: 6 choose 3).
- It identifies the top 5 most profitable trios based on simulated arbitrage trades and stores them for quick access.
- When a user-selected trio fails (e.g., no trading path exists), the app suggests the most profitable trio from this list.
- A suggestion modal, accessible via the sidebar menu, displays all top 5 profitable trios with their profit estimates, allowing users to choose an alternative.

### User Interface

- **Header**: A fixed top bar displays the app title ("Arbitrage Monitor") and a hamburger menu icon for navigation.
- **Sidebar Menu**: Tapping the hamburger icon opens a slide-in menu with options to reset tokens, refresh calculations, or view suggestions.
- **Token Dropdowns**: Three searchable dropdowns allow token selection, styled for touch interaction with large tap targets.
- **Results Section**: Displays "Starting Amount", "Final Amount", and "Profit" in a compact card, with profit color-coded (green for positive, red for negative).
- **Suggestion Modal**: A scrollable list of profitable trios appears as suggestion cards, each showing the token path and profit (e.g., "WETH → USDC → DAI (Profit: 0.0123)").
- **Loading Indicators**: Spinners show during initial suggestion calculations and arbitrage refreshes.

### Error Handling

- If a trading step fails (e.g., no Uniswap V3 pool exists for a pair), the app displays a user-friendly error message between the relevant dropdowns:
  - "No trading path available for this pair" (Step 1).
  - "This pair can't be traded right now" (Step 2).
  - "Unable to complete the arbitrage loop" (Step 3).
- Each error includes a tappable suggestion (e.g., "Try this: WETH → USDC → DAI (Profit: 0.0123)") that, when tapped, updates the token selection and recalculates the arbitrage.

### Caching

- Profitable trios are calculated once at startup and stored in the browser’s `localStorage` to avoid repeated on-chain calculations.
- On subsequent visits, the app loads these cached trios instantly, displaying results without delay unless manually refreshed.

---

## Features

- **Real-time Monitoring**: Updates arbitrage profits every 30 seconds.
- **Profitable Suggestions**: Offers the top 5 profitable token trios, pre-calculated for efficiency.
- **Error Recovery**: Suggests viable alternatives when a user-selected trio fails.
- **Mobile-First Design**: Optimized for touch interaction with a dark, modern UI.
- **Performance Optimization**: Uses a small token set and caching to minimize load times.
- **Debug Log**: Displays detailed trade steps for transparency.

---

## Usage

- **Launch the App**: Open the app in your mobile browser to start monitoring arbitrage opportunities.
- **Select Tokens**: Use the dropdowns to choose three tokens (e.g., WETH → USDC → DAI) and watch the results update.
- **View Results**: Check the "Starting Amount", "Final Amount", and "Profit" to assess arbitrage potential.
- **Handle Errors**: If an error appears, tap the suggested trio to apply it and recalculate.
- **Explore Suggestions**: Tap the hamburger menu, then "Show Suggestions" to see a modal with the top 5 profitable trios. Tap any suggestion to use it.
- **Navigate**: Use the sidebar menu to reset tokens or manually refresh calculations.

---

## Troubleshooting

- **Initial Delay**: The first load may show "Finding Profitable Pairs..." for ~5-10 seconds as trios are calculated. Subsequent loads are instant due to caching.
- **No Suggestions**: If no profitable trios appear, it may indicate temporary Uniswap pool issues or RPC errors.
- **Persistent Errors**: If a suggested trio fails, market conditions may have shifted. Try refreshing via the menu.
- **Outdated Data**: Cached trios reflect the market at calculation time. Use the menu to refresh if prices change significantly.

---

## License

This project is licensed under the MIT License.

---

This README focuses on explaining how the app operates, ensuring you understand its mechanics without diving into setup or contribution details. Let me know if you'd like further clarification or adjustments!
