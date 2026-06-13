# Movie Ticket Booking System

A Database Management System (DBMS) project to manage movie ticket reservations efficiently. It includes an interactive dark-theme frontend, a PHP backend, and a MySQL database script with triggers, stored procedures, joins, and subqueries.

## Folder Structure
- `index.html` - Home Page & App Wrapper
- `assets/`
  - `css/style.css` - Modern styling using vanilla CSS
  - `js/app.js` - Main JavaScript state engine (supports Mock Demo & PHP modes)
  - `js/queries.js` - Query executor for Demo Mode
- `backend/`
  - `config.php` - MySQL database configuration
  - `api.php` - Handles JSON API responses for bookings, admin updates, and queries
- `database/`
  - `schema.sql` - Complete schema design with triggers, stored procedures, and sample data

## Getting Started
To view the project immediately:
1. Open `index.html` in any web browser. The app runs in **Demo Mode** by default, allowing you to test bookings, payments, and admin actions.
2. To run with a real database, deploy this folder to your XAMPP `htdocs` or WAMP `www` folder, import `database/schema.sql` into phpMyAdmin, and switch the application mode to **PHP/MySQL** in the header.
