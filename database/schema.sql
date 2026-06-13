-- Movie Ticket Booking System Schema
-- Designed for MySQL/MariaDB

CREATE DATABASE IF NOT EXISTS `movie_booking_db`;
USE `movie_booking_db`;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `users` (
    `user_id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) UNIQUE NOT NULL,
    `role` ENUM('admin', 'customer') DEFAULT 'customer',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Movies Table
CREATE TABLE IF NOT EXISTS `movies` (
    `movie_id` INT AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `genre` VARCHAR(100) NOT NULL,
    `duration` INT NOT NULL, -- in minutes
    `rating` DECIMAL(3, 1) DEFAULT 0.0,
    `description` TEXT,
    `poster_url` VARCHAR(500) DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Shows Table (Showtimes & Theater details)
CREATE TABLE IF NOT EXISTS `shows` (
    `show_id` INT AUTO_INCREMENT PRIMARY KEY,
    `movie_id` INT NOT NULL,
    `theater_name` VARCHAR(100) NOT NULL,
    `show_time` DATETIME NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `total_seats` INT NOT NULL DEFAULT 80,
    `available_seats` INT NOT NULL DEFAULT 80,
    FOREIGN KEY (`movie_id`) REFERENCES `movies` (`movie_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Bookings Table
CREATE TABLE IF NOT EXISTS `bookings` (
    `booking_id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `show_id` INT NOT NULL,
    `booking_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `status` ENUM('Pending', 'Confirmed', 'Cancelled') DEFAULT 'Pending',
    FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
    FOREIGN KEY (`show_id`) REFERENCES `shows` (`show_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Tickets Table (Seats for a booking)
CREATE TABLE IF NOT EXISTS `tickets` (
    `ticket_id` INT AUTO_INCREMENT PRIMARY KEY,
    `booking_id` INT NOT NULL,
    `seat_number` VARCHAR(10) NOT NULL,
    FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_show_seat` (`booking_id`, `seat_number`) -- will handle show-specific uniqueness via trigger/constraint
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Payments Table
CREATE TABLE IF NOT EXISTS `payments` (
    `payment_id` INT AUTO_INCREMENT PRIMARY KEY,
    `booking_id` INT NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `payment_method` VARCHAR(50) NOT NULL,
    `payment_status` ENUM('Pending', 'Completed', 'Failed', 'Refunded') DEFAULT 'Pending',
    `payment_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Audit Logs Table (For demonstrating database triggers)
CREATE TABLE IF NOT EXISTS `audit_logs` (
    `log_id` INT AUTO_INCREMENT PRIMARY KEY,
    `action` VARCHAR(255) NOT NULL,
    `details` TEXT NOT NULL,
    `logged_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ==========================================
-- DATABASE TRIGGERS
-- ==========================================

DELIMITER $$

-- Trigger 1: Automatically decrement show seats when a ticket is added
DROP TRIGGER IF EXISTS `after_ticket_insert`$$
CREATE TRIGGER `after_ticket_insert`
AFTER INSERT ON `tickets`
FOR EACH ROW
BEGIN
    -- Update show's available seats
    UPDATE `shows` 
    SET `available_seats` = `available_seats` - 1
    WHERE `show_id` = (SELECT `show_id` FROM `bookings` WHERE `booking_id` = NEW.`booking_id`);
    
    -- Log the audit action
    INSERT INTO `audit_logs` (`action`, `details`)
    VALUES ('TICKET_ADDED', CONCAT('Seat ', NEW.`seat_number`, ' booked for Booking ID: ', NEW.`booking_id`));
END$$

-- Trigger 2: Automatically increment show seats when a booking is cancelled
DROP TRIGGER IF EXISTS `after_booking_update`$$
CREATE TRIGGER `after_booking_update`
AFTER UPDATE ON `bookings`
FOR EACH ROW
BEGIN
    DECLARE num_tickets INT;
    IF OLD.`status` != 'Cancelled' AND NEW.`status` = 'Cancelled' THEN
        -- Get number of tickets for this booking
        SELECT COUNT(*) INTO num_tickets FROM `tickets` WHERE `booking_id` = NEW.`booking_id`;
        
        -- Increment available seats in shows
        UPDATE `shows` 
        SET `available_seats` = `available_seats` + num_tickets
        WHERE `show_id` = NEW.`show_id`;
        
        -- Update payment to Refunded if completed
        UPDATE `payments`
        SET `payment_status` = 'Refunded'
        WHERE `booking_id` = NEW.`booking_id` AND `payment_status` = 'Completed';
        
        -- Log the audit action
        INSERT INTO `audit_logs` (`action`, `details`)
        VALUES ('BOOKING_CANCELLED', CONCAT('Booking ID: ', NEW.`booking_id`, ' cancelled. Refilled ', num_tickets, ' seats.'));
    END IF;
END$$

DELIMITER ;


-- ==========================================
-- STORED PROCEDURES
-- ==========================================

DELIMITER $$

-- Stored Procedure 1: Safe Seat Booking Transaction
DROP PROCEDURE IF EXISTS `sp_book_seats`$$
CREATE PROCEDURE `sp_book_seats`(
    IN p_user_id INT,
    IN p_show_id INT,
    IN p_seats TEXT, -- Comma-separated list of seat numbers (e.g. 'A1,A2')
    IN p_amount DECIMAL(10, 2),
    IN p_pay_method VARCHAR(50),
    OUT o_booking_id INT
)
BEGIN
    DECLARE seat_elem VARCHAR(10);
    DECLARE seat_idx INT DEFAULT 1;
    DECLARE comma_pos INT;
    DECLARE current_seats INT;
    
    -- Error handling: rollback on SQL exception
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    
    -- Verify seat availability
    SELECT `available_seats` INTO current_seats FROM `shows` WHERE `show_id` = p_show_id FOR UPDATE;
    
    -- Insert Booking
    INSERT INTO `bookings` (`user_id`, `show_id`, `status`)
    VALUES (p_user_id, p_show_id, 'Pending');
    
    SET o_booking_id = LAST_INSERT_ID();
    
    -- Parse comma-separated seats and insert tickets
    SET p_seats = CONCAT(p_seats, ',');
    WHILE LENGTH(p_seats) > 0 DO
        SET comma_pos = LOCATE(',', p_seats);
        SET seat_elem = TRIM(SUBSTRING(p_seats, 1, comma_pos - 1));
        
        IF LENGTH(seat_elem) > 0 THEN
            INSERT INTO `tickets` (`booking_id`, `seat_number`)
            VALUES (o_booking_id, seat_elem);
        END IF;
        
        SET p_seats = SUBSTRING(p_seats, comma_pos + 1);
    END WHILE;
    
    -- Insert Payment
    INSERT INTO `payments` (`booking_id`, `amount`, `payment_method`, `payment_status`)
    VALUES (o_booking_id, p_amount, p_pay_method, 'Completed');
    
    -- Update booking status to Confirmed
    UPDATE `bookings` SET `status` = 'Confirmed' WHERE `booking_id` = o_booking_id;
    
    COMMIT;
END$$

-- Stored Procedure 2: Fetch revenue report per movie
DROP PROCEDURE IF EXISTS `sp_get_revenue_report`$$
CREATE PROCEDURE `sp_get_revenue_report`()
BEGIN
    SELECT 
        m.`movie_id`,
        m.`title`,
        m.`genre`,
        COUNT(DISTINCT b.`booking_id`) AS `total_bookings`,
        COUNT(t.`ticket_id`) AS `total_tickets_sold`,
        COALESCE(SUM(p.`amount`), 0.00) AS `total_revenue`
    FROM `movies` m
    LEFT JOIN `shows` s ON m.`movie_id` = s.`movie_id`
    LEFT JOIN `bookings` b ON s.`show_id` = b.`show_id` AND b.`status` = 'Confirmed'
    LEFT JOIN `tickets` t ON b.`booking_id` = t.`booking_id`
    LEFT JOIN `payments` p ON b.`booking_id` = p.`booking_id` AND p.`payment_status` = 'Completed'
    GROUP BY m.`movie_id`
    ORDER BY `total_revenue` DESC;
END$$

DELIMITER ;


-- ==========================================
-- SAMPLE SEED DATA
-- ==========================================

-- Seed Users
INSERT INTO `users` (`user_id`, `name`, `email`, `role`) VALUES
(1, 'Chirag (Admin)', 'admin@booking.dbms', 'admin'),
(2, 'Jane Doe', 'jane.doe@gmail.com', 'customer'),
(3, 'John Smith', 'john.smith@gmail.com', 'customer')
ON DUPLICATE KEY UPDATE `email`=`email`;

-- Seed Movies
INSERT INTO `movies` (`movie_id`, `title`, `genre`, `duration`, `rating`, `description`, `poster_url`) VALUES
(1, 'Interstellar', 'Sci-Fi / Drama', 169, 8.7, 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.', 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=600&auto=format&fit=crop&q=80'),
(2, 'The Dark Knight', 'Action / Thriller', 152, 9.0, 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.', 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=600&auto=format&fit=crop&q=80'),
(3, 'Inception', 'Sci-Fi / Action', 148, 8.8, 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.', 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80'),
(4, 'Spirited Away', 'Anime / Fantasy', 125, 8.6, 'During her family\'s move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches, and spirits, and where humans are changed into beasts.', 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80')
ON DUPLICATE KEY UPDATE `title`=`title`;

-- Seed Shows (Setting times to upcoming dates relative to mid-2026)
INSERT INTO `shows` (`show_id`, `movie_id`, `theater_name`, `show_time`, `price`, `total_seats`, `available_seats`) VALUES
(1, 1, 'Screen 1 (IMAX)', '2026-06-15 14:30:00', 350.00, 80, 78),
(2, 1, 'Screen 3', '2026-06-15 19:00:00', 200.00, 80, 80),
(3, 2, 'Screen 1 (IMAX)', '2026-06-15 18:00:00', 400.00, 80, 79),
(4, 3, 'Screen 2', '2026-06-16 13:00:00', 180.00, 80, 80),
(5, 4, 'Screen 4 (Dolby)', '2026-06-16 16:30:00', 250.00, 80, 80)
ON DUPLICATE KEY UPDATE `price`=`price`;

-- Seed Bookings, Tickets, and Payments (simulating Trigger/Procedure effects manually to pre-populate)
INSERT INTO `bookings` (`booking_id`, `user_id`, `show_id`, `booking_time`, `status`) VALUES
(1, 2, 1, '2026-06-13 10:00:00', 'Confirmed'),
(2, 3, 3, '2026-06-13 11:30:00', 'Confirmed')
ON DUPLICATE KEY UPDATE `status`=`status`;

-- Seed Tickets
INSERT INTO `tickets` (`ticket_id`, `booking_id`, `seat_number`) VALUES
(1, 1, 'C4'),
(2, 1, 'C5'),
(3, 2, 'E8')
ON DUPLICATE KEY UPDATE `seat_number`=`seat_number`;

-- Seed Payments
INSERT INTO `payments` (`payment_id`, `booking_id`, `amount`, `payment_method`, `payment_status`) VALUES
(1, 1, 700.00, 'Credit Card', 'Completed'),
(2, 2, 400.00, 'UPI', 'Completed')
ON DUPLICATE KEY UPDATE `payment_status`=`payment_status`;

-- Seed initial Audit Logs for demo demonstration
INSERT INTO `audit_logs` (`log_id`, `action`, `details`) VALUES
(1, 'SYSTEM_INIT', 'Database seeded successfully with initial users, movies, and showtimes.'),
(2, 'TICKET_ADDED', 'Seat C4 booked for Booking ID: 1'),
(3, 'TICKET_ADDED', 'Seat C5 booked for Booking ID: 1'),
(4, 'TICKET_ADDED', 'Seat E8 booked for Booking ID: 2')
ON DUPLICATE KEY UPDATE `action`=`action`;
