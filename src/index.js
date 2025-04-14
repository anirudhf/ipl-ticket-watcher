const EventEmitter = require('events');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const axios = require('axios');
const cheerio = require('cheerio');
const { Webhook, MessageBuilder } = require('discord-webhook-node');

class TicketWatcher extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      watchInterval: config.watchInterval || parseInt(process.env.WATCH_INTERVAL_MIN || '5') * 60 * 1000,
      matchDates: config.matchDates || process.env.MATCH_DATES?.split(',') || [],
      ticketUrl: config.ticketUrl || 'https://shop.royalchallengers.com/ticket',
      discordWebhook: config.discordWebhook || process.env.DISCORD_WEBHOOK_URL,
      emailConfig: config.emailConfig || {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
        receiver: process.env.EMAIL_RECEIVER
      }
    };

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.config.emailConfig.user,
        pass: this.config.emailConfig.pass,
      },
    });

    this.hook = this.config.discordWebhook ? new Webhook(this.config.discordWebhook) : null;
  }

  async sendEmail(subject, text) {
    await this.transporter.sendMail({
      from: `RCB Ticket Notifier <${this.config.emailConfig.user}>`,
      to: this.config.emailConfig.receiver,
      subject,
      text,
    });
  }

  async sendDiscordNotification(message) {
    if (!this.hook) return;
    
    const embed = new MessageBuilder()
      .setTitle('🚨 RCB Tickets Alert!')
      .setDescription(message)
      .setURL(this.config.ticketUrl)
      .setColor('#FF0000')
      .setTimestamp();
    
    await this.hook.send(embed);
  }

  async checkForTickets() {
    try {
      const { data: html } = await axios.get(this.config.ticketUrl);
      const $ = cheerio.load(html);
      const dateElements = $('p.css-1nm99ps');

      const availableDates = [];
      dateElements.each((_, elem) => {
        availableDates.push($(elem).text().trim());
      });

      const matched = availableDates.filter(date => {
        return this.config.matchDates.some(match => 
          date.toLowerCase().includes(match.toLowerCase())
        );
      });

      if (matched.length > 0) {
        const msg = `🚨 Tickets available for: ${matched.join(', ')}\n\nBook here: ${this.config.ticketUrl}`;
        this.emit('ticketsAvailable', { dates: matched, message: msg });
        
        await Promise.all([
          this.sendEmail('🚨 RCB Tickets LIVE!', msg),
          this.sendDiscordNotification(msg)
        ]);
      } else {
        this.emit('noTickets', { time: new Date() });
      }
      return matched;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  start() {
    this.emit('start');
    this.checkForTickets();
    this.interval = setInterval(() => this.checkForTickets(), this.config.watchInterval);
    return this;
  }

  stop() {
    clearInterval(this.interval);
    this.emit('stop');
    return this;
  }
}

// Maintain CLI functionality
if (require.main === module) {
  dotenv.config();
  const watcher = new TicketWatcher();
  watcher
    .on('ticketsAvailable', ({message}) => console.log(message))
    .on('noTickets', ({time}) => console.log(`[${time.toLocaleTimeString()}] Tickets not yet available.`))
    .on('error', console.error)
    .start();
}

module.exports = TicketWatcher;
