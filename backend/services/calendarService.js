import { google } from 'googleapis';
import User from '../models/User.js';

// Initialize OAuth2 client (needs to be configured similarly to server.js)
// It's better to centralize this configuration if possible
const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    // Redirect URI might not be strictly needed here if only using refresh token,
    // but it's part of the client setup.
    process.env.NODE_ENV === 'production'
        ? "https://smartstorage-k0v4.onrender.com/oauthcallback"
        : "http://localhost:5003/oauthcallback"
);

/**
 * Adds an expiration event to the user's Google Calendar.
 * @param {string} userId - The ID of the user.
 * @param {object} ingredient - The ingredient object (must have name and expiryDate).
 * @returns {Promise<string|null>} The ID of the created event, or null if failed.
 */
export async function addEventToCalendar(userId, ingredient) {
    console.log(`📅 Attempting to add calendar event for user ${userId}, ingredient: ${ingredient.name}`);

    try {
        // 1. Get user's refresh token
        const user = await User.findById(userId).select('refreshToken');
        if (!user || !user.refreshToken) {
            console.warn(`📅 User ${userId} not found or no refresh token available.`);
            return null;
        }

        // 2. Set refresh token on OAuth client and get access token
        oAuth2Client.setCredentials({ refresh_token: user.refreshToken });
        
        // Refresh the access token (this will automatically use the refresh token)
        // Note: googleapis library handles the token refresh implicitly when making API calls
        // if credentials with a refresh token are set.
        // For explicit refresh (optional): 
        // const { token } = await oAuth2Client.getAccessToken(); 
        // console.log('Refreshed Access Token:', token); // Don't log sensitive tokens in prod

        // 3. Initialize Calendar API
        const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

        // 4. Define Event Details
        const eventStartTime = new Date(ingredient.expiryDate);
        eventStartTime.setDate(eventStartTime.getDate() - 1); // Set reminder for 1 day before expiry
        eventStartTime.setHours(9, 0, 0, 0); // Set time to 9:00 AM

        const eventEndTime = new Date(eventStartTime);
        eventEndTime.setHours(eventStartTime.getHours() + 1); // Event duration 1 hour

        const event = {
            summary: `Smart Pantry: '${ingredient.name}' expiring soon!`,
            description: `Your ingredient '${ingredient.name}' is expiring tomorrow. Use it soon! Added by Smart Pantry.`, 
            start: {
                dateTime: eventStartTime.toISOString(),
                timeZone: 'UTC', // Or get user's timezone if available/needed
            },
            end: {
                dateTime: eventEndTime.toISOString(),
                timeZone: 'UTC',
            },
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'popup', 'minutes': 60 }, // 1 hour before event (i.e., 8 AM on the reminder day)
                    { method: 'email', 'minutes': 120 } // 2 hours before event
                ],
            },
        };

        // 5. Insert Event
        const createdEvent = await calendar.events.insert({
            calendarId: 'primary', // Use the user's primary calendar
            resource: event,
        });

        console.log(`📅 Event created successfully for user ${userId}: ${createdEvent.data.id}`);
        return createdEvent.data.id; // Return the event ID

    } catch (error) {
        console.error(`❌ Error adding calendar event for user ${userId}:`, error.message);
        // Handle specific errors, e.g., token revocation
        if (error.response?.data?.error === 'invalid_grant') {
            console.error(`❌ User ${userId} may have revoked access or refresh token is invalid.`);
            // Optionally: Clear the refresh token from the user's record
            // await User.findByIdAndUpdate(userId, { $unset: { refreshToken: "" } });
        }
        return null; // Indicate failure
    }
} 