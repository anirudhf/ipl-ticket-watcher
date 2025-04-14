# 🏏 IPL Ticket Watcher (RCB-Optimized)

> Default configuration works for RCB tickets, but can monitor any IPL team

## Team Configuration

```env
# For RCB (default - no changes needed)
TICKET_URL=https://shop.royalchallengers.com/ticket

# For other teams (example: CSK)
TICKET_URL=https://in.bookmyshow.com/sports/mumbai-indians-ipl-2025/ET00434417
TEAM_NAME=MI
```

## Features

- Event-driven architecture
- Multiple notification channels (Email, Discord)
- Programmatic API
- CLI interface

## Installation

```bash
npm install ipl-ticket-watcher
```

## CLI Usage

1. Create a `.env` file with your configuration
2. Run the watcher:

```bash
npx ipl-ticket-watcher
```

## Example

```javascript
const TicketWatcher = require("ipl-ticket-watcher");

// Create watcher instance
const watcher = new TicketWatcher({
  watchInterval: 300000, // 5 minutes
  matchDates: ["April 15", "April 20"],
  ticketUrl: "https://shop.royalchallengers.com/ticket",
  emailConfig: {
    user: "your@email.com",
    pass: "password", //use your app password if 2FA is switched on
    receiver: "notify@email.com",
  },
});

watcher
  .on("ticketsAvailable", ({ dates, message }) => {
    console.log("Tickets available for:", dates);
    // add your own logic
  })
  .on("noTickets", ({ time }) => {
    console.log("No tickets at", time);
  })
  .on("error", console.error);

watcher.start();

// watcher.stop();
```

## Events

- `ticketsAvailable`: Emitted when tickets are found
- `noTickets`: Emitted on each check when no tickets available
- `error`: Emitted on scraping errors
- `start`: Emitted when watcher starts
- `stop`: Emitted when watcher stops

## Configuration

Both constructor config and environment variables are supported.
