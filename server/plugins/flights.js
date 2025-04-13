/**
 * Flight Booking Plugin
 * Handles flight search, booking, and related operations
 */

// Plugin manifest - required for all plugins
export const manifest = {
    name: "Flight Booking Plugin",
    version: "1.0.0",
    description: "Handles flight search, booking, and related operations",
    author: "AI Task Runner Team",
    // List of intents this plugin can handle
    intents: [
        "search_flights",
        "book_flight",
        "check_flight_status",
        "get_flight_details",
        "cancel_flight",
        "flight_recommendations"
    ]
};

/**
 * Search for available flights
 * @param {Object} params - Search parameters
 * @returns {Promise<Object>} Search results
 */
export async function searchFlights(params) {
    const {
        origin,
        destination,
        departureDate,
        returnDate = null,
        numPassengers = 1,
        cabinClass = "economy",
        directOnly = false,
        airlines = []
    } = params;

    console.log(`Searching flights from ${origin} to ${destination} on ${departureDate}`);

    // Validation
    if (!origin) {
        throw new Error("Origin is required");
    }
    if (!destination) {
        throw new Error("Destination is required");
    }
    if (!departureDate) {
        throw new Error("Departure date is required");
    }

    // In a real implementation, this would connect to a flight API (Amadeus, Skyscanner, etc.)
    // Mock implementation - generate 3-8 random flights
    const flightCount = 3 + Math.floor(Math.random() * 6);
    const flights = [];

    const airlines = [
        { code: "DL", name: "Delta Air Lines" },
        { code: "UA", name: "United Airlines" },
        { code: "AA", name: "American Airlines" },
        { code: "LH", name: "Lufthansa" },
        { code: "BA", name: "British Airways" },
        { code: "AF", name: "Air France" },
        { code: "EK", name: "Emirates" },
        { code: "SQ", name: "Singapore Airlines" }
    ];

    // Generate departure times between 6am and 10pm
    for (let i = 0; i < flightCount; i++) {
        const airline = airlines[Math.floor(Math.random() * airlines.length)];
        const flightNumber = `${airline.code}${100 + Math.floor(Math.random() * 900)}`;
        const departureHour = 6 + Math.floor(Math.random() * 16); // Between 6am and 10pm
        const durationHours = 1 + Math.floor(Math.random() * 8); // Between 1 and 8 hours

        const departureTime = new Date(departureDate);
        departureTime.setHours(departureHour, Math.floor(Math.random() * 60), 0);

        const arrivalTime = new Date(departureTime);
        arrivalTime.setHours(arrivalTime.getHours() + durationHours);

        const price = 150 + Math.floor(Math.random() * 850); // Between $150 and $1000

        // Randomly decide if the flight has a layover
        const hasLayover = !directOnly && Math.random() > 0.6;
        const segments = [];

        if (hasLayover) {
            // First segment
            const layoverAirport = ["DFW", "ORD", "ATL", "LAX", "JFK"][Math.floor(Math.random() * 5)];
            const firstSegmentDuration = Math.floor(durationHours * 0.4);

            const layoverTime = new Date(departureTime);
            layoverTime.setHours(layoverTime.getHours() + firstSegmentDuration);

            segments.push({
                origin,
                destination: layoverAirport,
                departureTime: departureTime.toISOString(),
                arrivalTime: layoverTime.toISOString(),
                airline: airline.code,
                flightNumber: `${airline.code}${100 + Math.floor(Math.random() * 900)}`
            });

            // Layover duration between 45min and 3 hours
            const layoverDuration = 45 + Math.floor(Math.random() * 135);
            const secondSegmentDeparture = new Date(layoverTime);
            secondSegmentDeparture.setMinutes(secondSegmentDeparture.getMinutes() + layoverDuration);

            segments.push({
                origin: layoverAirport,
                destination,
                departureTime: secondSegmentDeparture.toISOString(),
                arrivalTime: arrivalTime.toISOString(),
                airline: airline.code,
                flightNumber: `${airline.code}${100 + Math.floor(Math.random() * 900)}`
            });
        } else {
            segments.push({
                origin,
                destination,
                departureTime: departureTime.toISOString(),
                arrivalTime: arrivalTime.toISOString(),
                airline: airline.code,
                flightNumber
            });
        }

        flights.push({
            id: `flight_${i}_${Math.random().toString(36).substring(2, 7)}`,
            airline: {
                code: airline.code,
                name: airline.name
            },
            price: {
                amount: price,
                currency: "USD",
                formattedPrice: `$${price}`
            },
            duration: {
                hours: durationHours,
                minutes: Math.floor(Math.random() * 60),
                totalMinutes: durationHours * 60 + Math.floor(Math.random() * 60)
            },
            segments,
            cabinClass,
            seatsAvailable: 3 + Math.floor(Math.random() * 20),
            refundable: Math.random() > 0.7
        });
    }

    // Sort by price
    flights.sort((a, b) => a.price.amount - b.price.amount);

    // Simulating API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    return {
        success: true,
        flights,
        query: {
            origin,
            destination,
            departureDate,
            returnDate,
            numPassengers,
            cabinClass
        }
    };
}

/**
 * Book a flight
 * @param {Object} params - Booking parameters
 * @returns {Promise<Object>} Booking result
 */
export async function bookFlight(params) {
    const {
        flightId,
        passengers,
        contactInfo,
        paymentInfo
    } = params;

    console.log(`Booking flight: ${flightId}`);

    // Validation
    if (!flightId) {
        throw new Error("Flight ID is required");
    }
    if (!passengers || !Array.isArray(passengers) || passengers.length === 0) {
        throw new Error("At least one passenger is required");
    }
    if (!contactInfo) {
        throw new Error("Contact information is required");
    }
    if (!paymentInfo) {
        throw new Error("Payment information is required");
    }

    // In a real implementation, this would connect to a booking API
    // Mock implementation
    const bookingId = `booking_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const confirmationCode = `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}`;

    // Simulating API delay
    await new Promise(resolve => setTimeout(resolve, 1200));

    return {
        success: true,
        bookingId,
        confirmationCode,
        flightId,
        status: "confirmed",
        passengers: passengers.map(p => ({ ...p, ticketNumber: `TKT${Math.floor(Math.random() * 10000000000)}` })),
        totalPrice: {
            amount: 300 + (passengers.length * 200) + Math.floor(Math.random() * 300),
            currency: "USD"
        },
        paymentInfo: {
            method: paymentInfo.method,
            last4: paymentInfo.last4 || "****"
        }
    };
}

/**
 * Check flight status
 * @param {Object} params - Status check parameters
 * @returns {Promise<Object>} Flight status
 */
export async function checkFlightStatus(params) {
    const {
        flightNumber,
        date,
        bookingReference
    } = params;

    console.log(`Checking status for flight: ${flightNumber}`);

    // Validation
    if (!flightNumber && !bookingReference) {
        throw new Error("Either flight number or booking reference is required");
    }

    // In a real implementation, this would connect to a flight status API
    // Mock implementation - randomly pick a status
    const statuses = ["On Time", "Delayed", "Boarding", "Departed", "Arrived", "Cancelled"];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    let statusDetails = {};

    switch (status) {
        case "Delayed":
            statusDetails = {
                delayMinutes: 15 + Math.floor(Math.random() * 120),
                reason: ["Weather", "Air Traffic Control", "Maintenance", "Operational"][Math.floor(Math.random() * 4)]
            };
            break;
        case "Boarding":
            statusDetails = {
                gate: `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 30)}`,
                boardingTime: new Date().toISOString()
            };
            break;
        case "Departed":
            statusDetails = {
                actualDepartureTime: new Date(new Date().getTime() - Math.floor(Math.random() * 120) * 60000).toISOString(),
                estimatedArrival: new Date(new Date().getTime() + Math.floor(Math.random() * 480) * 60000).toISOString()
            };
            break;
        case "Arrived":
            statusDetails = {
                actualArrivalTime: new Date(new Date().getTime() - Math.floor(Math.random() * 120) * 60000).toISOString(),
                terminal: `T${1 + Math.floor(Math.random() * 5)}`,
                baggage: `Carousel ${1 + Math.floor(Math.random() * 20)}`
            };
            break;
        case "Cancelled":
            statusDetails = {
                reason: ["Weather", "Air Traffic Control", "Maintenance", "Operational"][Math.floor(Math.random() * 4)],
                rebookOptions: true
            };
            break;
    }

    // Simulating API delay
    await new Promise(resolve => setTimeout(resolve, 400));

    return {
        success: true,
        flightNumber,
        status,
        statusDetails,
        lastUpdated: new Date().toISOString()
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
        case "search_flights":
            return await searchFlights(parameters);

        case "book_flight":
            return await bookFlight(parameters);

        case "check_flight_status":
            return await checkFlightStatus(parameters);

        case "get_flight_details":
            // Simplified version - in real implementation would fetch details from API
            return {
                success: true,
                flightDetails: {
                    id: parameters.flightId,
                    departureGate: `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 30)}`,
                    arrivalGate: `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 30)}`,
                    aircraft: ["Boeing 737", "Airbus A320", "Boeing 787", "Airbus A350"][Math.floor(Math.random() * 4)],
                    meal: ["Regular meal", "Vegetarian", "Kosher", "No meal service"][Math.floor(Math.random() * 4)]
                }
            };

        case "cancel_flight":
            // Simplified version - in real implementation would call cancellation API
            return {
                success: true,
                cancellationId: `cancel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                bookingId: parameters.bookingId,
                refundAmount: {
                    amount: Math.floor(Math.random() * 500),
                    currency: "USD"
                },
                status: "cancelled"
            };

        case "flight_recommendations":
            // Similar to search but with personalized recommendations
            return await searchFlights({
                ...parameters,
                recommended: true
            });

        default:
            throw new Error(`Unsupported intent: ${intent}`);
    }
} 