<?php
// backend/api.php
// Controller API endpoint for Movie Booking System

require_once 'config.php';

$db = getDBConnection();
$action = isset($_GET['action']) ? $_GET['action'] : '';

// Parse JSON request body if present
$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, true);

// Utility function to respond with JSON
function sendResponse($success, $data = null, $error = null, $code = 200) {
    http_response_code($code);
    echo json_encode([
        "success" => $success,
        "data" => $data,
        "error" => $error
    ]);
    exit();
}

try {
    switch ($action) {
        
        // ==========================================
        // FETCH DATA ENDPOINTS
        // ==========================================
        
        case 'get_movies':
            $stmt = $db->query("SELECT * FROM movies ORDER BY rating DESC");
            $movies = $stmt->fetchAll();
            sendResponse(true, $movies);
            break;

        case 'get_shows':
            $stmt = $db->query("
                SELECT s.*, m.title AS movie_title, m.duration, m.genre 
                FROM shows s 
                JOIN movies m ON s.movie_id = m.movie_id 
                ORDER BY s.show_time ASC
            ");
            $shows = $stmt->fetchAll();
            sendResponse(true, $shows);
            break;

        case 'get_bookings':
            $stmt = $db->query("
                SELECT b.*, u.name AS user_name, u.email AS user_email, 
                       s.theater_name, s.show_time, s.price, m.title AS movie_title,
                       GROUP_CONCAT(t.seat_number ORDER BY t.seat_number ASC SEPARATOR ', ') AS seats,
                       p.amount AS amount_paid, p.payment_status, p.payment_method
                FROM bookings b
                JOIN users u ON b.user_id = u.user_id
                JOIN shows s ON b.show_id = s.show_id
                JOIN movies m ON s.movie_id = m.movie_id
                LEFT JOIN tickets t ON b.booking_id = t.booking_id
                LEFT JOIN payments p ON b.booking_id = p.booking_id
                GROUP BY b.booking_id
                ORDER BY b.booking_time DESC
            ");
            $bookings = $stmt->fetchAll();
            sendResponse(true, $bookings);
            break;

        case 'get_users':
            $stmt = $db->query("SELECT * FROM users ORDER BY role ASC, name ASC");
            $users = $stmt->fetchAll();
            sendResponse(true, $users);
            break;

        case 'get_audit_logs':
            $stmt = $db->query("SELECT * FROM audit_logs ORDER BY logged_at DESC LIMIT 50");
            $logs = $stmt->fetchAll();
            sendResponse(true, $logs);
            break;

        case 'get_booked_seats':
            $show_id = isset($_GET['show_id']) ? intval($_GET['show_id']) : 0;
            $stmt = $db->prepare("
                SELECT t.seat_number 
                FROM tickets t
                JOIN bookings b ON t.booking_id = b.booking_id
                WHERE b.show_id = ? AND b.status != 'Cancelled'
            ");
            $stmt->execute([$show_id]);
            $seats = $stmt->fetchAll(PDO::FETCH_COLUMN);
            sendResponse(true, $seats);
            break;

        // ==========================================
        // BOOKING TRANSACTIONS (Uses Stored Procedure)
        // ==========================================
        
        case 'book_seats':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($input)) {
                sendResponse(false, null, "Invalid request payload", 400);
            }
            
            $user_id = intval($input['user_id']);
            $show_id = intval($input['show_id']);
            $seats = $input['seats']; // Array of seats, e.g., ["A1", "A2"]
            $amount = floatval($input['amount']);
            $payment_method = $input['payment_method'];

            if (empty($seats)) {
                sendResponse(false, null, "No seats selected", 400);
            }

            // Convert seat array to comma separated string for the stored procedure
            $seats_str = implode(',', $seats);

            // Call Stored Procedure sp_book_seats
            $stmt = $db->prepare("CALL sp_book_seats(?, ?, ?, ?, ?, @out_booking_id)");
            $stmt->execute([$user_id, $show_id, $seats_str, $amount, $payment_method]);

            // Fetch the OUT parameter (booking ID)
            $res = $db->query("SELECT @out_booking_id AS booking_id")->fetch();
            $booking_id = $res['booking_id'];

            sendResponse(true, [
                "booking_id" => $booking_id,
                "message" => "Booking confirmed successfully using Stored Procedure sp_book_seats! Trigger after_ticket_insert has updated seat availability."
            ]);
            break;

        case 'cancel_booking':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($input)) {
                sendResponse(false, null, "Invalid request payload", 400);
            }
            
            $booking_id = intval($input['booking_id']);

            // Update status to Cancelled. This will fire after_booking_update trigger!
            $stmt = $db->prepare("UPDATE bookings SET status = 'Cancelled' WHERE booking_id = ?");
            $stmt->execute([$booking_id]);

            sendResponse(true, [
                "message" => "Booking Cancelled. Trigger after_booking_update updated show availability and updated payment status to Refunded!"
            ]);
            break;

        // ==========================================
        // ADMIN CRUD ENDPOINTS
        // ==========================================

        case 'add_movie':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($input)) {
                sendResponse(false, null, "Invalid request payload", 400);
            }
            $stmt = $db->prepare("
                INSERT INTO movies (title, genre, duration, rating, description, poster_url)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $input['title'],
                $input['genre'],
                intval($input['duration']),
                floatval($input['rating']),
                $input['description'],
                $input['poster_url'] ?: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80'
            ]);
            sendResponse(true, ["message" => "Movie added successfully!"]);
            break;

        case 'delete_movie':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($input)) {
                sendResponse(false, null, "Invalid request payload", 400);
            }
            $stmt = $db->prepare("DELETE FROM movies WHERE movie_id = ?");
            $stmt->execute([intval($input['movie_id'])]);
            sendResponse(true, ["message" => "Movie and associated shows/bookings deleted successfully!"]);
            break;

        case 'add_show':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($input)) {
                sendResponse(false, null, "Invalid request payload", 400);
            }
            $stmt = $db->prepare("
                INSERT INTO shows (movie_id, theater_name, show_time, price, total_seats, available_seats)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $seats = intval($input['total_seats']) ?: 80;
            $stmt->execute([
                intval($input['movie_id']),
                $input['theater_name'],
                $input['show_time'],
                floatval($input['price']),
                $seats,
                $seats
            ]);
            sendResponse(true, ["message" => "Showtime added successfully!"]);
            break;

        case 'delete_show':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($input)) {
                sendResponse(false, null, "Invalid request payload", 400);
            }
            $stmt = $db->prepare("DELETE FROM shows WHERE show_id = ?");
            $stmt->execute([intval($input['show_id'])]);
            sendResponse(true, ["message" => "Showtime deleted successfully!"]);
            break;

        // ==========================================
        // COMPLEX SQL QUERY EXECUTION PANEL
        // ==========================================
        
        case 'run_query_join':
            // 5-table JOIN query showcasing all relevant student project joins
            $sql = "
                SELECT 
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
                ORDER BY b.booking_time DESC
            ";
            $stmt = $db->query($sql);
            $results = $stmt->fetchAll();
            sendResponse(true, [
                "sql" => trim($sql),
                "results" => $results,
                "description" => "A complex query joining 5 tables (bookings, users, shows, movies, tickets, payments) utilizing aggregate function GROUP_CONCAT to list seat numbers and grouping by booking ID."
            ]);
            break;

        case 'run_query_subquery':
            // Subquery demonstrating selection based on calculated aggregates
            $sql = "
                SELECT 
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
                )
            ";
            $stmt = $db->query($sql);
            $results = $stmt->fetchAll();
            sendResponse(true, [
                "sql" => trim($sql),
                "results" => $results,
                "description" => "Demonstrates a subquery inside HAVING. It finds movies that generate higher than the average revenue across all active movies."
            ]);
            break;

        case 'run_query_procedure':
            // Stored procedure call demo
            $sql = "CALL sp_get_revenue_report()";
            $stmt = $db->query($sql);
            $results = $stmt->fetchAll();
            sendResponse(true, [
                "sql" => trim($sql),
                "results" => $results,
                "description" => "Calls the stored procedure `sp_get_revenue_report` which internally uses LEFT JOINs and GROUP BY to calculate total bookings, tickets sold, and revenue for each movie."
            ]);
            break;

        // Reset/Reseed database action
        case 'reset_db':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                sendResponse(false, null, "Invalid request method", 400);
            }
            $schemaFile = dirname(__DIR__) . '/database/schema.sql';
            if (!file_exists($schemaFile)) {
                sendResponse(false, null, "Schema file not found at " . $schemaFile, 500);
            }
            
            $sqlContent = file_get_contents($schemaFile);
            
            // Remove DELIMITER declarations since standard PDO doesn't parse them easily.
            // Split by custom delimiters or execute batch statements
            // A simple way is to use multi_query or read statement by statement.
            // Let's connect without a database first, then execute.
            $rawDb = new PDO("mysql:host=" . DB_HOST . ";charset=utf8mb4", DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
            ]);
            
            // Let's execute the raw SQL script.
            // Note: DELIMITER statements are a CLI client feature, not valid PDO SQL. We can strip or parse them.
            // Let's implement a clean parser or execute it sequentially.
            // Since we know our schema.sql structure, we can execute the queries.
            // To make it easy and robust, we can run it through PDO multi-query or split statements.
            // A simple replacement to run queries:
            
            // Strip comments
            $sqlContent = preg_replace('/--.*\n/', '', $sqlContent);
            // Replace DELIMITER blocks to execute statements directly:
            $sqlContent = str_replace('DELIMITER $$', '', $sqlContent);
            $sqlContent = str_replace('DELIMITER ;', '', $sqlContent);
            $sqlContent = str_replace('$$', ';', $sqlContent);
            
            // Split by ';'
            $statements = explode(';', $sqlContent);
            
            foreach ($statements as $query) {
                $query = trim($query);
                if (!empty($query)) {
                    $rawDb->exec($query);
                }
            }
            
            sendResponse(true, ["message" => "Database successfully reseeded using schema.sql!"]);
            break;

        default:
            sendResponse(false, null, "Invalid endpoint or action specified: " . $action, 404);
            break;
    }
} catch (PDOException $e) {
    sendResponse(false, null, "Database SQL Error: " . $e->getMessage(), 500);
} catch (Exception $e) {
    sendResponse(false, null, "General Server Error: " . $e->getMessage(), 500);
}
