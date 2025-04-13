/**
 * Restaurant Plugin
 * Handles restaurant search, table booking, and related operations
 */

// Plugin manifest - required for all plugins
export const manifest = {
    name: "Restaurant Plugin",
    version: "1.0.0",
    description: "Handles restaurant search, table booking, and related operations",
    author: "AI Task Runner Team",
    // List of intents this plugin can handle
    intents: [
        "search_restaurants",
        "book_table",
        "check_reservation",
        "cancel_reservation",
        "get_menu",
        "find_nearby_restaurants"
    ]
};

/**
 * Search for restaurants based on criteria
 * @param {Object} params - Search parameters
 * @returns {Promise<Object>} Search results
 */
export async function searchRestaurants(params) {
    const {
        location,
        cuisine = null,
        date = null,
        time = null,
        partySize = 2,
        priceRange = null,
        rating = null,
        distance = null
    } = params;

    console.log(`Searching restaurants in ${location}${cuisine ? ` for ${cuisine} cuisine` : ''}`);

    // Validation
    if (!location) {
        throw new Error("Location is required");
    }

    // In a real implementation, this would connect to a restaurant API (OpenTable, Yelp, etc.)
    // Mock implementation - generate 3-8 random restaurants
    const restaurantCount = 3 + Math.floor(Math.random() * 6);
    const restaurants = [];

    const cuisines = [
        "Italian", "Mexican", "Japanese", "Chinese", "Indian",
        "Thai", "American", "French", "Mediterranean", "Korean"
    ];

    // Filter by cuisine if specified
    const availableCuisines = cuisine ?
        [cuisine] :
        cuisines.sort(() => Math.random() - 0.5).slice(0, 3);

    for (let i = 0; i < restaurantCount; i++) {
        const restaurantCuisine = availableCuisines[i % availableCuisines.length];
        const restaurantRating = (3.5 + Math.random() * 1.5).toFixed(1);
        const availableTimes = [];

        // Generate available times around the requested time if provided
        if (time) {
            const requestedHour = parseInt(time.split(':')[0]);
            const possibleHours = [
                requestedHour - 1,
                requestedHour - 0.5,
                requestedHour,
                requestedHour + 0.5,
                requestedHour + 1
            ];

            for (const hour of possibleHours) {
                if (hour >= 11 && hour <= 22 && Math.random() > 0.3) {
                    const hourPart = Math.floor(hour);
                    const minutePart = hour % 1 === 0 ? '00' : '30';
                    availableTimes.push(`${hourPart}:${minutePart}`);
                }
            }
        } else {
            // Random times if no time specified
            const times = ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30'];
            availableTimes.push(...times.filter(() => Math.random() > 0.4));
        }

        restaurants.push({
            id: `rest_${i}_${Math.random().toString(36).substring(2, 7)}`,
            name: getRandomRestaurantName(restaurantCuisine),
            cuisine: restaurantCuisine,
            rating: parseFloat(restaurantRating),
            priceRange: ['$', '$$', '$$$', '$$$$'][Math.floor(Math.random() * 4)],
            address: `${Math.floor(Math.random() * 999) + 1} ${getRandomStreetName()} ${getRandomStreetType()}, ${location}`,
            phone: `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
            website: `https://www.${getRandomRestaurantName(restaurantCuisine).toLowerCase().replace(/\s+/g, '')}.com`,
            availableTimes,
            image: `https://example.com/restaurant-images/${i + 1}.jpg`,
            distance: (Math.random() * 5).toFixed(1) + ' mi'
        });
    }

    // Sort by rating by default
    restaurants.sort((a, b) => b.rating - a.rating);

    // Simulating API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    return {
        success: true,
        restaurants,
        query: {
            location,
            cuisine,
            date,
            time,
            partySize
        }
    };
}

/**
 * Book a table at a restaurant
 * @param {Object} params - Booking parameters
 * @returns {Promise<Object>} Booking result
 */
export async function bookTable(params) {
    const {
        restaurantId,
        restaurantName,
        date,
        time,
        partySize,
        name,
        phone,
        email,
        specialRequests = ""
    } = params;

    console.log(`Booking table at ${restaurantName || restaurantId} for ${partySize} people`);

    // Validation
    if (!restaurantId) {
        throw new Error("Restaurant ID is required");
    }
    if (!date) {
        throw new Error("Date is required");
    }
    if (!time) {
        throw new Error("Time is required");
    }
    if (!partySize || partySize < 1) {
        throw new Error("Valid party size is required");
    }
    if (!name) {
        throw new Error("Name is required");
    }
    if (!phone && !email) {
        throw new Error("Either phone or email is required for contact");
    }

    // In a real implementation, this would connect to a restaurant booking API
    // Mock implementation
    const reservationId = `resv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const confirmationCode = `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;

    // Simulate occasional booking failure
    const randomSuccess = Math.random() > 0.1; // 90% success rate

    if (!randomSuccess) {
        return {
            success: false,
            error: "The requested time is no longer available. Please try another time.",
            alternativeTimes: [
                addMinutes(time, -30),
                addMinutes(time, 30),
                addMinutes(time, 60)
            ]
        };
    }

    // Simulating API delay
    await new Promise(resolve => setTimeout(resolve, 1200));

    return {
        success: true,
        reservationId,
        confirmationCode,
        restaurantId,
        restaurantName: restaurantName || "Restaurant Name",
        date,
        time,
        partySize,
        name,
        phone,
        email,
        specialRequests,
        status: "confirmed"
    };
}

/**
 * Check a restaurant reservation status
 * @param {Object} params - Check parameters
 * @returns {Promise<Object>} Reservation status
 */
export async function checkReservation(params) {
    const {
        reservationId,
        confirmationCode,
        phone,
        email
    } = params;

    console.log(`Checking reservation: ${reservationId || confirmationCode}`);

    // Validation
    if (!reservationId && !confirmationCode && !phone && !email) {
        throw new Error("Either reservation ID, confirmation code, phone, or email is required");
    }

    // In a real implementation, this would query a reservation database
    // Mock implementation
    const mockStatus = ["confirmed", "pending", "seated", "completed", "cancelled"][Math.floor(Math.random() * 5)];
    const mockDate = new Date();
    mockDate.setDate(mockDate.getDate() + Math.floor(Math.random() * 14)); // Random date in next 2 weeks

    // Simulating API delay
    await new Promise(resolve => setTimeout(resolve, 600));

    return {
        success: true,
        reservation: {
            id: reservationId || `mock_resv_${Math.random().toString(36).substring(2, 7)}`,
            confirmationCode: confirmationCode || `MOCK${Math.floor(Math.random() * 10000)}`,
            restaurantName: "Sample Restaurant",
            date: mockDate.toISOString().split('T')[0],
            time: `${18 + Math.floor(Math.random() * 5)}:${Math.random() > 0.5 ? '00' : '30'}`,
            partySize: 2 + Math.floor(Math.random() * 8),
            status: mockStatus,
            specialInstructions: mockStatus === "confirmed" ? "Please arrive 10 minutes before your reservation time." : ""
        }
    };
}

/**
 * Cancel a restaurant reservation
 * @param {Object} params - Cancellation parameters
 * @returns {Promise<Object>} Cancellation result
 */
export async function cancelReservation(params) {
    const {
        reservationId,
        confirmationCode,
        reason = ""
    } = params;

    console.log(`Cancelling reservation: ${reservationId || confirmationCode}`);

    // Validation
    if (!reservationId && !confirmationCode) {
        throw new Error("Either reservation ID or confirmation code is required");
    }

    // In a real implementation, this would connect to a restaurant API
    // Simulating API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
        success: true,
        reservationId: reservationId || "unknown",
        confirmationCode: confirmationCode || "unknown",
        status: "cancelled",
        cancellationId: `cancel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        refundPolicy: "No charges were applied to this reservation."
    };
}

/**
 * Get restaurant menu
 * @param {Object} params - Menu request parameters
 * @returns {Promise<Object>} Restaurant menu
 */
export async function getMenu(params) {
    const { restaurantId } = params;

    console.log(`Getting menu for restaurant: ${restaurantId}`);

    // Validation
    if (!restaurantId) {
        throw new Error("Restaurant ID is required");
    }

    // In a real implementation, this would fetch from a restaurant API
    // Mock implementation - generate random menu

    // Simulating API delay
    await new Promise(resolve => setTimeout(resolve, 700));

    return {
        success: true,
        restaurantId,
        menu: {
            categories: [
                {
                    name: "Appetizers",
                    items: [
                        { name: "Garlic Bread", price: 5.99, description: "Toasted bread with garlic butter" },
                        { name: "Mozzarella Sticks", price: 7.99, description: "Fried mozzarella with marinara sauce" },
                        { name: "Bruschetta", price: 6.99, description: "Toasted bread topped with tomatoes, basil, and olive oil" }
                    ]
                },
                {
                    name: "Main Courses",
                    items: [
                        { name: "Spaghetti Carbonara", price: 14.99, description: "Classic pasta with eggs, cheese, and pancetta" },
                        { name: "Margherita Pizza", price: 12.99, description: "Traditional pizza with tomato sauce, mozzarella, and basil" },
                        { name: "Chicken Parmesan", price: 16.99, description: "Breaded chicken with tomato sauce and melted cheese" }
                    ]
                },
                {
                    name: "Desserts",
                    items: [
                        { name: "Tiramisu", price: 6.99, description: "Classic Italian dessert with coffee and mascarpone" },
                        { name: "Chocolate Cake", price: 5.99, description: "Rich chocolate cake with a molten center" }
                    ]
                }
            ]
        }
    };
}

/**
 * Execute a task using the appropriate function from this plugin
 * @param {string} intent - Task intent
 * @param {Object} parameters - Task parameters
 * @returns {Promise<Object>} Result of task execution
 */
export async function execute(intent, parameters) {
    switch (intent) {
        case "search_restaurants":
            return await searchRestaurants(parameters);

        case "book_table":
            return await bookTable(parameters);

        case "check_reservation":
            return await checkReservation(parameters);

        case "cancel_reservation":
            return await cancelReservation(parameters);

        case "get_menu":
            return await getMenu(parameters);

        case "find_nearby_restaurants":
            // Similar to search but with location-specific functionality
            return await searchRestaurants({
                ...parameters,
                nearby: true,
                maxDistance: parameters.maxDistance || 5
            });

        default:
            throw new Error(`Unsupported intent: ${intent}`);
    }
}

// Helper functions for generating mock data
function getRandomRestaurantName(cuisine) {
    const italianPrefixes = ["Bella", "Buono", "Casa", "Trattoria", "Il"];
    const italianSuffixes = ["Italia", "Milano", "Roma", "Pasta", "Pizza", "Gusto"];

    const mexicanPrefixes = ["El", "La", "Casa", "Taqueria", "Cantina"];
    const mexicanSuffixes = ["Amigo", "Mexicana", "Taco", "Burrito", "Fiesta"];

    const japanesePrefixes = ["Sushi", "Ramen", "Tokyo", "Kyoto", "Sakura"];
    const japaneseSuffixes = ["House", "Garden", "Express", "Sushi", "Noodle"];

    const generalPrefixes = ["The", "Royal", "Golden", "Silver", "Blue"];
    const generalSuffixes = ["Kitchen", "Bistro", "Cafe", "Grill", "Restaurant"];

    let prefix, suffix;

    switch (cuisine) {
        case "Italian":
            prefix = italianPrefixes[Math.floor(Math.random() * italianPrefixes.length)];
            suffix = italianSuffixes[Math.floor(Math.random() * italianSuffixes.length)];
            break;
        case "Mexican":
            prefix = mexicanPrefixes[Math.floor(Math.random() * mexicanPrefixes.length)];
            suffix = mexicanSuffixes[Math.floor(Math.random() * mexicanSuffixes.length)];
            break;
        case "Japanese":
            prefix = japanesePrefixes[Math.floor(Math.random() * japanesePrefixes.length)];
            suffix = japaneseSuffixes[Math.floor(Math.random() * japaneseSuffixes.length)];
            break;
        default:
            prefix = generalPrefixes[Math.floor(Math.random() * generalPrefixes.length)];
            suffix = generalSuffixes[Math.floor(Math.random() * generalSuffixes.length)];
    }

    return `${prefix} ${suffix}`;
}

function getRandomStreetName() {
    const names = ["Main", "Oak", "Maple", "Washington", "Park", "Elm", "Pine", "Cedar", "Broadway", "Market"];
    return names[Math.floor(Math.random() * names.length)];
}

function getRandomStreetType() {
    const types = ["St", "Ave", "Blvd", "Rd", "Ln", "Dr", "Way", "Pl"];
    return types[Math.floor(Math.random() * types.length)];
}

function addMinutes(timeString, minutes) {
    const [hours, mins] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, mins);
    date.setMinutes(date.getMinutes() + minutes);

    return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
} 