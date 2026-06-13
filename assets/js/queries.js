// assets/js/queries.js
// Predefined DBMS query templates and Mock Execution Engine for Demo Mode

const DBMS_QUERIES = {
    'query_join': {
        id: 'query_join',
        title: '5-Table Relational JOIN',
        type: 'INNER & LEFT JOIN',
        sql: `SELECT 
    b.booking_id,
    u.name AS customer_name,
    m.title AS movie_title,
    s.theater_name,
    s.show_time,
    GROUP_CONCAT(t.seat_number ORDER BY t.seat_number ASC SEPARATOR ', ') AS seats_booked,
    p.amount AS amount_paid,
    p.payment_status
FROM bookings b
JOIN users u ON b.user_id = u.user_id
JOIN shows s ON b.show_id = s.show_id
JOIN movies m ON s.movie_id = m.movie_id
LEFT JOIN tickets t ON b.booking_id = t.booking_id
LEFT JOIN payments p ON b.booking_id = p.booking_id
WHERE b.status = 'Confirmed'
GROUP BY b.booking_id
ORDER BY b.booking_time DESC;`,
        description: 'Retrieves all confirmed reservations by joining 5 different tables (bookings, users, shows, movies, tickets, and payments) and aggregating seats into a single comma-separated list.',
        
        // Mock execution on JS LocalState
        executeMock: (state) => {
            const confirmedBookings = state.bookings.filter(b => b.status === 'Confirmed');
            
            // Map and Join manually
            const rows = confirmedBookings.map(b => {
                const user = state.users.find(u => u.user_id === b.user_id) || { name: 'Unknown' };
                const show = state.shows.find(s => s.show_id === b.show_id) || { theater_name: 'Unknown', show_time: '', price: 0, movie_id: 0 };
                const movie = state.movies.find(m => m.movie_id === show.movie_id) || { title: 'Unknown' };
                
                // Get tickets for this booking
                const bookingTickets = state.tickets
                    .filter(t => t.booking_id === b.booking_id)
                    .map(t => t.seat_number)
                    .sort();
                const seatsBooked = bookingTickets.join(', ');
                
                // Get payment details
                const payment = state.payments.find(p => p.booking_id === b.booking_id) || { amount: 0, payment_status: 'Pending' };

                return {
                    'booking_id': b.booking_id,
                    'customer_name': user.name,
                    'movie_title': movie.title,
                    'theater_name': show.theater_name,
                    'show_time': show.show_time,
                    'seats_booked': seatsBooked || 'None',
                    'amount_paid': `$${parseFloat(payment.amount).toFixed(2)}`,
                    'payment_status': payment.payment_status
                };
            });

            // Sort by booking time (equivalent to booking_id desc since sequential)
            rows.sort((a, b) => b.booking_id - a.booking_id);

            return {
                columns: ['booking_id', 'customer_name', 'movie_title', 'theater_name', 'show_time', 'seats_booked', 'amount_paid', 'payment_status'],
                rows: rows
            };
        }
    },

    'query_subquery': {
        id: 'query_subquery',
        title: 'Nested Subquery in HAVING',
        type: 'SUBQUERY & HAVING',
        sql: `SELECT 
    m.movie_id,
    m.title,
    m.genre,
    (SELECT COALESCE(SUM(p.amount), 0.00) 
     FROM payments p 
     JOIN bookings b2 ON p.booking_id = b2.booking_id 
     JOIN shows s2 ON b2.show_id = s2.show_id 
     WHERE s2.movie_id = m.movie_id AND b2.status = 'Confirmed' AND p.payment_status = 'Completed') AS movie_revenue
FROM movies m
HAVING movie_revenue > (
    SELECT COALESCE(AVG(revenue_table.rev), 0)
    FROM (
        SELECT SUM(p2.amount) AS rev
        FROM payments p2
        JOIN bookings b3 ON p2.booking_id = b3.booking_id
        JOIN shows s3 ON b3.show_id = s3.show_id
        WHERE b3.status = 'Confirmed' AND p2.payment_status = 'Completed'
        GROUP BY s3.movie_id
    ) AS revenue_table
);`,
        description: 'Demonstrates a subquery in the HAVING clause. It calculates individual movie revenues and filters out only those movies whose revenue is greater than the AVERAGE revenue across all active movies.',
        
        executeMock: (state) => {
            // Helper to get revenue for a movie
            const getMovieRevenue = (movieId) => {
                let total = 0;
                state.bookings.forEach(b => {
                    if (b.status === 'Confirmed') {
                        const show = state.shows.find(s => s.show_id === b.show_id);
                        if (show && show.movie_id === movieId) {
                            const payment = state.payments.find(p => p.booking_id === b.booking_id);
                            if (payment && payment.payment_status === 'Completed') {
                                total += parseFloat(payment.amount);
                            }
                        }
                    }
                });
                return total;
            };

            // Calculate revenue for all movies
            const moviesWithRevenue = state.movies.map(m => {
                return {
                    movie_id: m.movie_id,
                    title: m.title,
                    genre: m.genre,
                    movie_revenue: getMovieRevenue(m.movie_id)
                };
            });

            // Calculate average revenue of movies that have bookings (or all movies)
            const activeRevenues = moviesWithRevenue.map(m => m.movie_revenue);
            const sum = activeRevenues.reduce((acc, val) => acc + val, 0);
            const avgRevenue = activeRevenues.length > 0 ? (sum / activeRevenues.length) : 0;

            // Filter movies above average
            const rows = moviesWithRevenue
                .filter(m => m.movie_revenue > avgRevenue)
                .map(m => ({
                    'movie_id': m.movie_id,
                    'title': m.title,
                    'genre': m.genre,
                    'movie_revenue': `$${m.movie_revenue.toFixed(2)}`
                }));

            return {
                columns: ['movie_id', 'title', 'genre', 'movie_revenue'],
                rows: rows
            };
        }
    },

    'query_procedure': {
        id: 'query_procedure',
        title: 'Stored Procedure: Revenue Report',
        type: 'STORED PROCEDURE',
        sql: `CALL sp_get_revenue_report();

-- Definition inside DB:
-- CREATE PROCEDURE sp_get_revenue_report()
-- BEGIN
--     SELECT m.movie_id, m.title, m.genre,
--            COUNT(DISTINCT b.booking_id) AS total_bookings,
--            COUNT(t.ticket_id) AS total_tickets_sold,
--            COALESCE(SUM(p.amount), 0.00) AS total_revenue
--     FROM movies m
--     LEFT JOIN shows s ON m.movie_id = s.movie_id
...`,
        description: 'Invokes `sp_get_revenue_report` which aggregates bookings, ticket counts, and total monetary earnings for all movies inside the database, ordering them by revenue in descending order.',
        
        executeMock: (state) => {
            const rows = state.movies.map(m => {
                // Find all show IDs for this movie
                const showIds = state.shows.filter(s => s.movie_id === m.movie_id).map(s => s.show_id);
                
                // Bookings
                const bookings = state.bookings.filter(b => showIds.includes(b.show_id) && b.status === 'Confirmed');
                const bookingIds = bookings.map(b => b.booking_id);
                
                // Tickets sold
                const ticketsSold = state.tickets.filter(t => bookingIds.includes(t.booking_id)).length;
                
                // Payments
                let totalRevenue = 0;
                bookings.forEach(b => {
                    const payment = state.payments.find(p => p.booking_id === b.booking_id);
                    if (payment && payment.payment_status === 'Completed') {
                        totalRevenue += parseFloat(payment.amount);
                    }
                });

                return {
                    'movie_id': m.movie_id,
                    'title': m.title,
                    'genre': m.genre,
                    'total_bookings': bookings.length,
                    'total_tickets_sold': ticketsSold,
                    'total_revenue': `$${totalRevenue.toFixed(2)}`,
                    raw_revenue: totalRevenue // for sorting
                };
            });

            // Order by revenue descending
            rows.sort((a, b) => b.raw_revenue - a.raw_revenue);

            // Strip raw_revenue
            rows.forEach(r => delete r.raw_revenue);

            return {
                columns: ['movie_id', 'title', 'genre', 'total_bookings', 'total_tickets_sold', 'total_revenue'],
                rows: rows
            };
        }
    }
};

// Syntax highlighter helper
function highlightSQL(sql) {
    const keywords = [
        'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'INNER', 'ON', 'GROUP BY', 'ORDER BY', 
        'HAVING', 'DESC', 'ASC', 'AND', 'OR', 'AS', 'COALESCE', 'SUM', 'AVG', 'COUNT', 
        'DISTINCT', 'CALL', 'CREATE', 'PROCEDURE', 'BEGIN', 'END'
    ];
    
    let highlighted = sql;

    // Highlight strings
    highlighted = highlighted.replace(/('[^']*')/g, '<span class="sql-string">$1</span>');

    // Highlight keywords
    keywords.forEach(keyword => {
        const regex = new RegExp('\\b' + keyword + '\\b', 'gi');
        highlighted = highlighted.replace(regex, match => `<span class="sql-keyword">${match.toUpperCase()}</span>`);
    });

    return highlighted;
}
