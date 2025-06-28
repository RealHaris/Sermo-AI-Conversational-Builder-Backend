/**
 * Helper functions for working with cron schedules
 */

/**
 * Converts a simple time format (H:MM) to a valid cron expression
 * @param {String} timeFormat - Time in format H:MM (e.g., 0:29, 14:30)
 * @returns {String} - Valid cron expression (e.g., "29 0 * * *" for daily at 00:29)
 */
const convertTimeToCronExpression = (timeFormat) => {
  // Return a default schedule if input is undefined/null
  if (!timeFormat) {
    return "*/5 * * * *"; // Default to every 5 minutes
  }

  // Valid cron expression already? Return as is
  if (timeFormat.split(" ").length === 5) {
    return timeFormat;
  }

  // Try to parse the time format (H:MM or HH:MM)
  const timeFormatRegex = /^(\d{1,2}):(\d{2})$/;
  const matches = timeFormat.toString().match(timeFormatRegex);

  if (matches) {
    const hours = parseInt(matches[1], 10);
    const minutes = parseInt(matches[2], 10);

    // Validate the time
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      console.warn(
        `Invalid time format: ${timeFormat}. Using default schedule.`
      );
      return "*/5 * * * *"; // Default to every 5 minutes
    }

    // Convert to cron expression format: "minutes hours * * *"
    // This will run daily at the specified hour and minute
    return `${minutes} ${hours} * * *`;
  }

  // If we couldn't parse it, return a default schedule
  console.warn(
    `Could not parse time format: ${timeFormat}. Using default schedule.`
  );
  return "*/5 * * * *"; // Default to every 5 minutes
};

/**
 * Validates a cron expression format
 * @param {String} cronExpression - Cron expression to validate
 * @returns {Boolean} - True if valid, false otherwise
 */
const isValidCronExpression = (cronExpression) => {
  try {
    const cron = require("node-cron");
    return cron.validate(cronExpression);
  } catch (error) {
    return false;
  }
};

/**
 * Converts cron schedule to minutes for date comparison
 * @param {String} cronExpression - Cron expression (e.g., "* /5 * * * * ", "30 2 * * * ")
  * @returns { Number } - Minutes representing the payment deadline duration
    */
const convertCronScheduleToMinutes = (cronExpression) => {
  if (!cronExpression) {
    console.log('No cron expression provided, using default 30 minutes');
    return 30; // Default to 30 minutes
  }

  // Handle "every minute" schedule
  if (cronExpression.trim() === '* * * * *') {
    console.log(`Detected every-minute schedule: "${cronExpression}" -> 1 minute`);
    return 1;
  }

  const parts = cronExpression.split(" ");
  if (parts.length !== 5) {
    console.log(`Invalid cron format: "${cronExpression}", using default 30 minutes`);
    return 30; // Default to 30 minutes for invalid format
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Handle minute-based schedules like "*/5 * * * *" (every 5 minutes)
  if (minute.startsWith("*/")) {
    const intervalMinutes = parseInt(minute.substring(2), 10);
    const result = isNaN(intervalMinutes) ? 30 : intervalMinutes;
    console.log(`Detected minute-based schedule: "${cronExpression}" -> ${result} minutes`);
    return result;
  }

  // Handle specific minute schedules like "30 * * * *" (every hour at minute 30)
  if (hour === "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    console.log(`Detected hourly schedule: "${cronExpression}" -> 60 minutes`);
    return 60; // 1 hour for hourly schedules
  }

  // Handle daily schedules like "30 2 * * *" (daily at 2:30)
  if (dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    console.log(`Detected daily schedule: "${cronExpression}" -> 1440 minutes (24 hours)`);
    return 24 * 60; // 24 hours for daily schedules
  }

  // Handle weekly schedules like "30 2 * * 1" (weekly on Monday at 2:30)
  if (dayOfMonth === "*" && month === "*" && dayOfWeek !== "*") {
    console.log(`Detected weekly schedule: "${cronExpression}" -> 10080 minutes (7 days)`);
    return 7 * 24 * 60; // 7 days for weekly schedules
  }

  // Handle monthly schedules like "30 2 1 * *" (monthly on 1st at 2:30)
  if (month === "*" && dayOfWeek === "*") {
    console.log(`Detected monthly schedule: "${cronExpression}" -> 43200 minutes (30 days)`);
    return 30 * 24 * 60; // 30 days for monthly schedules
  }

  // Default fallback
  console.log(`Unrecognized cron pattern: "${cronExpression}", using default 30 minutes`);
  return 30; // Default to 30 minutes
};

module.exports = {
  convertTimeToCronExpression,
  isValidCronExpression,
  convertCronScheduleToMinutes,
};
