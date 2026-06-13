// assets/js/app.js
// Main JavaScript State Engine for Movie Ticket Booking DBMS

// Initial Seed Data representing the schema.sql structure
const INITIAL_SEED_DATA = {
    users: [
        { user_id: 1, name: 'Chirag (Admin)', email: 'admin@booking.dbms', role: 'admin' },
        { user_id: 2, name: 'Jane Doe', email: 'jane.doe@gmail.com', role: 'customer' },
        { user_id: 3, name: 'John Smith', email: 'john.smith@gmail.com', role: 'customer' }
    ],
    movies: [
        { movie_id: 1, title: 'Interstellar', genre: 'Sci-Fi / Drama', duration: 169, rating: 8.7, description: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.', poster_url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=600&auto=format&fit=crop&q=80' },
        { movie_id: 2, title: 'The Dark Knight', genre: 'Action / Thriller', duration: 152, rating: 9.0, description: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.', poster_url: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=600&auto=format&fit=crop&q=80' },
        { movie_id: 3, title: 'Inception', genre: 'Sci-Fi / Action', duration: 148, rating: 8.8, description: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.', poster_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80' },
        { movie_id: 4, title: 'Spirited Away', genre: 'Anime / Fantasy', duration: 125, rating: 8.6, description: 'During her family\'s move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches, and spirits, and where humans are changed into beasts.', poster_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80' }
    ],
    shows: [
        { show_id: 1, movie_id: 1, theater_name: 'Screen 1 (IMAX)', show_time: '2026-06-15 14:30:00', price: 350.00, total_seats: 80, available_seats: 78 },
        { show_id: 2, movie_id: 1, theater_name: 'Screen 3', show_time: '2026-06-15 19:00:00', price: 200.00, total_seats: 80, available_seats: 80 },
        { show_id: 3, movie_id: 2, theater_name: 'Screen 1 (IMAX)', show_time: '2026-06-15 18:00:00', price: 400.00, total_seats: 80, available_seats: 79 },
        { show_id: 4, movie_id: 3, theater_name: 'Screen 2', show_time: '2026-06-16 13:00:00', price: 180.00, total_seats: 80, available_seats: 80 },
        { show_id: 5, movie_id: 4, theater_name: 'Screen 4 (Dolby)', show_time: '2026-06-16 16:30:00', price: 250.00, total_seats: 80, available_seats: 80 }
    ],
    bookings: [
        { booking_id: 1, user_id: 2, show_id: 1, booking_time: '2026-06-13 10:00:00', status: 'Confirmed' },
        { booking_id: 2, user_id: 3, show_id: 3, booking_time: '2026-06-13 11:30:00', status: 'Confirmed' }
    ],
    tickets: [
        { ticket_id: 1, booking_id: 1, seat_number: 'C4' },
        { ticket_id: 2, booking_id: 1, seat_number: 'C5' },
        { ticket_id: 3, booking_id: 2, seat_number: 'E8' }
    ],
    payments: [
        { payment_id: 1, booking_id: 1, amount: 700.00, payment_method: 'Credit Card', payment_status: 'Completed', payment_time: '2026-06-13 10:00:00' },
        { payment_id: 2, booking_id: 2, amount: 400.00, payment_method: 'UPI', payment_status: 'Completed', payment_time: '2026-06-13 11:30:00' }
    ],
    audit_logs: [
        { log_id: 1, action: 'SYSTEM_INIT', details: 'Database seeded successfully with initial users, movies, and showtimes.', logged_at: '2026-06-13 12:20:00' },
        { log_id: 2, action: 'TICKET_ADDED', details: 'Seat C4 booked for Booking ID: 1', logged_at: '2026-06-13 10:00:00' },
        { log_id: 3, action: 'TICKET_ADDED', details: 'Seat C5 booked for Booking ID: 1', logged_at: '2026-06-13 10:00:00' },
        { log_id: 4, action: 'TICKET_ADDED', details: 'Seat E8 booked for Booking ID: 2', logged_at: '2026-06-13 11:30:00' }
    ]
};

// Global App State
const AppState = {
    mode: 'demo', // 'demo' or 'mysql'
    role: 'customer', // 'customer' or 'admin'
    activeUser: null, // Initialized on load
    currentView: 'movies',
    
    // Seat Selector State
    selectedMovie: null,
    selectedShow: null,
    selectedSeats: [],
    
    // DBMS Query selection
    selectedQuery: 'query_join',

    // Local DB tables for Demo Mode
    db: {}
};

// ==========================================
// INITIALIZATION & STATE MANAGEMENT
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    initLocalDB();
    setupEventListeners();
    checkDatabaseConnection();
    switchView('movies');
    updateUserBadge();
    renderMovies();
    renderQueryPanel();
});

// Setup mock database structure in LocalStorage
function initLocalDB(forceReset = false) {
    if (forceReset || !localStorage.getItem('dbms_users')) {
        localStorage.setItem('dbms_users', JSON.stringify(INITIAL_SEED_DATA.users));
        localStorage.setItem('dbms_movies', JSON.stringify(INITIAL_SEED_DATA.movies));
        localStorage.setItem('dbms_shows', JSON.stringify(INITIAL_SEED_DATA.shows));
        localStorage.setItem('dbms_bookings', JSON.stringify(INITIAL_SEED_DATA.bookings));
        localStorage.setItem('dbms_tickets', JSON.stringify(INITIAL_SEED_DATA.tickets));
        localStorage.setItem('dbms_payments', JSON.stringify(INITIAL_SEED_DATA.payments));
        localStorage.setItem('dbms_audit_logs', JSON.stringify(INITIAL_SEED_DATA.audit_logs));
    }
    
    // Sync state memory with storage
    AppState.db = {
        users: JSON.parse(localStorage.getItem('dbms_users')),
        movies: JSON.parse(localStorage.getItem('dbms_movies')),
        shows: JSON.parse(localStorage.getItem('dbms_shows')),
        bookings: JSON.parse(localStorage.getItem('dbms_bookings')),
        tickets: JSON.parse(localStorage.getItem('dbms_tickets')),
        payments: JSON.parse(localStorage.getItem('dbms_payments')),
        audit_logs: JSON.parse(localStorage.getItem('dbms_audit_logs'))
    };

    // Default active user is Jane Doe (Customer)
    AppState.activeUser = AppState.db.users.find(u => u.user_id === 2);
}

// Save AppState.db to LocalStorage
function saveLocalDB() {
    localStorage.setItem('dbms_users', JSON.stringify(AppState.db.users));
    localStorage.setItem('dbms_movies', JSON.stringify(AppState.db.movies));
    localStorage.setItem('dbms_shows', JSON.stringify(AppState.db.shows));
    localStorage.setItem('dbms_bookings', JSON.stringify(AppState.db.bookings));
    localStorage.setItem('dbms_tickets', JSON.stringify(AppState.db.tickets));
    localStorage.setItem('dbms_payments', JSON.stringify(AppState.db.payments));
    localStorage.setItem('dbms_audit_logs', JSON.stringify(AppState.db.audit_logs));
}

// Audit logger helper for Demo Mode
function logAuditAction(action, details) {
    const newLog = {
        log_id: AppState.db.audit_logs.length + 1,
        action: action,
        details: details,
        logged_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };
    AppState.db.audit_logs.unshift(newLog); // Put new logs at the beginning
    saveLocalDB();
}

// ==========================================
// NAVIGATION & EVENT HANDLERS
// ==========================================

function setupEventListeners() {
    // Mode Switcher (Demo / MySQL)
    document.getElementById('btn-mode-demo').addEventListener('click', () => setAppMode('demo'));
    document.getElementById('btn-mode-mysql').addEventListener('click', () => setAppMode('mysql'));

    // Role Switcher (Customer / Admin)
    document.getElementById('btn-role-customer').addEventListener('click', () => setRole('customer'));
    document.getElementById('btn-role-admin').addEventListener('click', () => setRole('admin'));

    // Sidebar navigation
    document.querySelectorAll('.nav-item a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const view = link.getAttribute('data-view');
            switchView(view);
        });
    });

    // Close Modal Button
    document.querySelector('.close-modal-btn').addEventListener('click', closeModal);
    document.getElementById('booking-modal').addEventListener('click', (e) => {
        if (e.target.id === 'booking-modal') closeModal();
    });

    // SQL Query panel selection
    document.querySelectorAll('.query-selection-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.query-selection-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            AppState.selectedQuery = card.getAttribute('data-query-id');
            renderQueryPanel();
        });
    });

    // Run SQL Query
    document.getElementById('btn-run-query').addEventListener('click', executeActiveQuery);

    // Book checkout steps
    document.getElementById('btn-confirm-seats').addEventListener('click', proceedToCheckout);
    document.getElementById('btn-back-to-seats').addEventListener('click', backToSeats);
    document.getElementById('btn-pay').addEventListener('click', processPayment);

    // Admin CRUD form actions
    document.getElementById('form-add-movie').addEventListener('submit', handleAddMovie);
    document.getElementById('form-add-show').addEventListener('submit', handleAddShow);
    document.getElementById('btn-reset-db').addEventListener('click', resetDatabase);
}

function switchView(viewName) {
    AppState.currentView = viewName;
    
    // Manage sidebar active status
    document.querySelectorAll('.nav-item').forEach(item => {
        const link = item.querySelector('a');
        if (link.getAttribute('data-view') === viewName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Toggle view elements
    document.querySelectorAll('.view-section').forEach(section => {
        if (section.id === `view-${viewName}`) {
            section.classList.add('active');
        } else {
            section.classList.remove('active');
        }
    });

    // Refresh view content
    if (viewName === 'movies') {
        renderMovies();
    } else if (viewName === 'tickets') {
        renderTickets();
    } else if (viewName === 'queries') {
        executeActiveQuery();
    } else if (viewName === 'admin') {
        renderAdminDashboard();
    }
}

function setAppMode(mode) {
    if (mode === 'mysql') {
        // Run health check before committing
        document.getElementById('db-status').innerHTML = 'Checking...';
        fetch('backend/api.php?action=get_users')
            .then(res => {
                if (!res.ok) throw new Error();
                return res.json();
            })
            .then(res => {
                if (res.success) {
                    AppState.mode = 'mysql';
                    document.getElementById('btn-mode-demo').classList.remove('active');
                    document.getElementById('btn-mode-mysql').classList.add('active');
                    document.getElementById('db-status-dot').classList.remove('offline');
                    document.getElementById('db-status-text').innerText = 'PHP/MySQL Connected';
                    // Re-align active user
                    AppState.activeUser = res.data.find(u => u.role === (AppState.role === 'admin' ? 'admin' : 'customer')) 
                                       || res.data[0];
                    updateUserBadge();
                    switchView(AppState.currentView);
                } else {
                    alert('Backend endpoint loaded, but SQL connection failed: ' + res.error);
                    setAppMode('demo');
                }
            })
            .catch(() => {
                alert('Could not connect to the local PHP API. Please ensure Apache/MySQL is active in WAMP/XAMPP and check folder deployment.\n\nRunning in Offline Demo Mode instead.');
                setAppMode('demo');
            });
    } else {
        AppState.mode = 'demo';
        document.getElementById('btn-mode-demo').classList.add('active');
        document.getElementById('btn-mode-mysql').classList.remove('active');
        document.getElementById('db-status-dot').classList.add('offline');
        document.getElementById('db-status-text').innerText = 'Demo Mode (Offline)';
        initLocalDB(); // Reload/verify state
        updateUserBadge();
        switchView(AppState.currentView);
    }
}

function setRole(role) {
    AppState.role = role;
    const adminLink = document.querySelector('.nav-item.admin-only');
    
    if (role === 'admin') {
        document.getElementById('btn-role-customer').classList.remove('active');
        document.getElementById('btn-role-admin').classList.add('active-admin');
        adminLink.classList.add('visible');
        
        // Switch user to Admin
        if (AppState.mode === 'demo') {
            AppState.activeUser = AppState.db.users.find(u => u.role === 'admin') || AppState.db.users[0];
            updateUserBadge();
        } else {
            // Fetch users from PHP api
            fetch('backend/api.php?action=get_users')
                .then(res => res.json())
                .then(res => {
                    if (res.success) {
                        AppState.activeUser = res.data.find(u => u.role === 'admin') || res.data[0];
                        updateUserBadge();
                    }
                });
        }
        
        switchView('admin');
    } else {
        document.getElementById('btn-role-customer').classList.add('active');
        document.getElementById('btn-role-admin').classList.remove('active-admin');
        adminLink.classList.remove('visible');
        
        if (AppState.mode === 'demo') {
            AppState.activeUser = AppState.db.users.find(u => u.role === 'customer') || AppState.db.users[1];
            updateUserBadge();
        } else {
            fetch('backend/api.php?action=get_users')
                .then(res => res.json())
                .then(res => {
                    if (res.success) {
                        AppState.activeUser = res.data.find(u => u.role === 'customer') || res.data[1];
                        updateUserBadge();
                    }
                });
        }
        
        if (AppState.currentView === 'admin') {
            switchView('movies');
        } else {
            switchView(AppState.currentView);
        }
    }
}

function updateUserBadge() {
    if (AppState.activeUser) {
        document.getElementById('current-username').innerText = AppState.activeUser.name;
        document.getElementById('current-userrole').innerText = AppState.activeUser.role.toUpperCase();
        document.getElementById('avatar-letter').innerText = AppState.activeUser.name.charAt(0);
    }
}

function checkDatabaseConnection() {
    // Attempt automatic backend connection
    fetch('backend/api.php?action=get_users')
        .then(res => {
            if (res.ok) setAppMode('mysql');
            else setAppMode('demo');
        })
        .catch(() => {
            setAppMode('demo');
        });
}

// ==========================================
// RENDERING CONTENT FUNCTIONS
// ==========================================

function renderMovies() {
    const grid = document.getElementById('movies-grid');
    grid.innerHTML = '<div style="color: var(--text-muted)">Loading movies...</div>';

    if (AppState.mode === 'demo') {
        drawMovies(AppState.db.movies);
    } else {
        fetch('backend/api.php?action=get_movies')
            .then(res => res.json())
            .then(res => {
                if (res.success) drawMovies(res.data);
                else grid.innerHTML = `<div class="empty-state">${res.error}</div>`;
            })
            .catch(() => grid.innerHTML = `<div class="empty-state">Could not connect to database.</div>`);
    }
}

function drawMovies(movies) {
    const grid = document.getElementById('movies-grid');
    if (movies.length === 0) {
        grid.innerHTML = '<div class="empty-state"><span class="empty-icon">🎬</span><p>No movies available. Check back soon!</p></div>';
        return;
    }

    grid.innerHTML = movies.map(movie => `
        <div class="movie-card" onclick="openBookingModal(${movie.movie_id})">
            <div class="movie-poster-container">
                <img class="movie-poster" src="${movie.poster_url}" alt="${movie.title} Poster" onerror="this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80'">
                <div class="movie-rating-badge">
                    <span>★</span> ${movie.rating}
                </div>
            </div>
            <div class="movie-details">
                <h3 class="movie-title">${movie.title}</h3>
                <div class="movie-metadata">
                    <span class="movie-tag">${movie.genre}</span>
                    <span class="movie-tag">${movie.duration} Mins</span>
                </div>
                <p class="movie-desc">${movie.description}</p>
                <button class="book-btn">Get Showtimes</button>
            </div>
        </div>
    `).join('');
}

// ==========================================
// SEATING SELECTOR & TRANSACTION FLOW
// ==========================================

function openBookingModal(movieId) {
    AppState.selectedSeats = [];
    
    // Set selection state
    if (AppState.mode === 'demo') {
        AppState.selectedMovie = AppState.db.movies.find(m => m.movie_id === movieId);
        openModalFlow();
    } else {
        fetch('backend/api.php?action=get_movies')
            .then(res => res.json())
            .then(res => {
                if (res.success) {
                    AppState.selectedMovie = res.data.find(m => m.movie_id === movieId);
                    openModalFlow();
                }
            });
    }
}

function openModalFlow() {
    document.getElementById('modal-movie-title').innerText = `Book Tickets: ${AppState.selectedMovie.title}`;
    document.getElementById('booking-modal').classList.add('active');
    
    // Reset view steps in modal
    document.getElementById('modal-step-seats').style.display = 'block';
    document.getElementById('modal-step-payment').classList.remove('active');
    
    renderShowtimesForMovie();
}

function closeModal() {
    document.getElementById('booking-modal').classList.remove('active');
}

function renderShowtimesForMovie() {
    const grid = document.getElementById('modal-showtime-grid');
    grid.innerHTML = '<div>Loading showtimes...</div>';
    
    const drawShows = (shows) => {
        const movieShows = shows.filter(s => s.movie_id === AppState.selectedMovie.movie_id);
        if (movieShows.length === 0) {
            grid.innerHTML = '<div style="color: var(--text-muted)">No active screenings for this movie.</div>';
            document.getElementById('seating-layout-wrapper').style.display = 'none';
            return;
        }

        grid.innerHTML = movieShows.map(show => `
            <div class="showtime-card" id="showtime-card-${show.show_id}" onclick="selectShowtime(${show.show_id})">
                <div class="show-theater">${show.theater_name}</div>
                <div class="show-time">${show.show_time.substring(5, 16)}</div>
                <div class="show-price">₹${parseFloat(show.price).toFixed(2)}</div>
                <div class="show-seats">${show.available_seats} / ${show.total_seats} seats left</div>
            </div>
        `).join('');

        // Select first showtime by default
        selectShowtime(movieShows[0].show_id);
    };

    if (AppState.mode === 'demo') {
        drawShows(AppState.db.shows);
    } else {
        fetch('backend/api.php?action=get_shows')
            .then(res => res.json())
            .then(res => {
                if (res.success) drawShows(res.data);
            });
    }
}

function selectShowtime(showId) {
    // Reset selections
    AppState.selectedSeats = [];
    updateBookingSummary();
    
    // Toggle active border styles
    document.querySelectorAll('.showtime-card').forEach(card => card.classList.remove('selected'));
    const selectedCard = document.getElementById(`showtime-card-${showId}`);
    if (selectedCard) selectedCard.classList.add('selected');

    if (AppState.mode === 'demo') {
        AppState.selectedShow = AppState.db.shows.find(s => s.show_id === showId);
        loadSeatingChart();
    } else {
        fetch('backend/api.php?action=get_shows')
            .then(res => res.json())
            .then(res => {
                if (res.success) {
                    AppState.selectedShow = res.data.find(s => s.show_id === showId);
                    loadSeatingChart();
                }
            });
    }
}

function loadSeatingChart() {
    document.getElementById('seating-layout-wrapper').style.display = 'block';
    const chart = document.getElementById('seating-grid');
    chart.innerHTML = '<div>Loading layout...</div>';

    const renderLayout = (bookedSeats) => {
        chart.innerHTML = '';
        const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']; // 8 rows
        const cols = 10; // 10 columns

        for (let i = 0; i < rows.length; i++) {
            const rowLabel = rows[i];
            const rowDiv = document.createElement('div');
            rowDiv.className = 'seat-row';
            
            // Add row letter prefix
            const labelSpan = document.createElement('span');
            labelSpan.className = 'row-label';
            labelSpan.innerText = rowLabel;
            rowDiv.appendChild(labelSpan);

            for (let j = 1; j <= cols; j++) {
                const seatId = `${rowLabel}${j}`;
                const seatSpan = document.createElement('span');
                
                const isBooked = bookedSeats.includes(seatId);
                seatSpan.className = `seat ${isBooked ? 'booked' : 'available'}`;
                seatSpan.innerText = seatId;
                
                if (!isBooked) {
                    seatSpan.onclick = () => toggleSeatSelection(seatId, seatSpan);
                }
                
                rowDiv.appendChild(seatSpan);
            }
            chart.appendChild(rowDiv);
        }
    };

    if (AppState.mode === 'demo') {
        // Read tickets for this show from LocalStorage
        const booked = AppState.db.tickets
            .filter(t => {
                const b = AppState.db.bookings.find(bk => bk.booking_id === t.booking_id);
                return b && b.show_id === AppState.selectedShow.show_id && b.status !== 'Cancelled';
            })
            .map(t => t.seat_number);
        renderLayout(booked);
    } else {
        fetch(`backend/api.php?action=get_booked_seats&show_id=${AppState.selectedShow.show_id}`)
            .then(res => res.json())
            .then(res => {
                if (res.success) renderLayout(res.data);
            });
    }
}

function toggleSeatSelection(seatId, seatElem) {
    if (AppState.selectedSeats.includes(seatId)) {
        AppState.selectedSeats = AppState.selectedSeats.filter(s => s !== seatId);
        seatElem.classList.remove('selected');
    } else {
        AppState.selectedSeats.push(seatId);
        seatElem.classList.add('selected');
    }
    updateBookingSummary();
}

function updateBookingSummary() {
    const seatsText = document.getElementById('selected-seats-summary');
    const priceText = document.getElementById('selected-price-summary');
    const checkoutBtn = document.getElementById('btn-confirm-seats');

    if (AppState.selectedSeats.length === 0) {
        seatsText.innerText = 'No Seats Selected';
        priceText.innerText = '₹0.00';
        checkoutBtn.disabled = true;
    } else {
        const total = AppState.selectedSeats.length * parseFloat(AppState.selectedShow.price);
        seatsText.innerText = `Seats: ${AppState.selectedSeats.sort().join(', ')} (${AppState.selectedSeats.length})`;
        priceText.innerText = `Total: ₹${total.toFixed(2)}`;
        checkoutBtn.disabled = false;
    }
}

// Transaction checkout navigation
function proceedToCheckout() {
    document.getElementById('modal-step-seats').style.display = 'none';
    document.getElementById('modal-step-payment').classList.add('active');
    
    // Set payment summaries
    const total = AppState.selectedSeats.length * parseFloat(AppState.selectedShow.price);
    document.getElementById('checkout-movie-title').innerText = AppState.selectedMovie.title;
    document.getElementById('checkout-theater-name').innerText = AppState.selectedShow.theater_name;
    document.getElementById('checkout-showtime').innerText = AppState.selectedShow.show_time;
    document.getElementById('checkout-seats').innerText = AppState.selectedSeats.sort().join(', ');
    document.getElementById('checkout-total-price').innerText = `₹${total.toFixed(2)}`;
    
    // Select payment method defaults
    document.querySelectorAll('.payment-method-card').forEach(card => {
        card.onclick = () => {
            document.querySelectorAll('.payment-method-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
        };
    });
    // Default select UPI
    document.getElementById('pay-method-upi').classList.add('selected');
}

function backToSeats() {
    document.getElementById('modal-step-payment').classList.remove('active');
    document.getElementById('modal-step-seats').style.display = 'block';
}

function processPayment() {
    const selectedPayCard = document.querySelector('.payment-method-card.selected');
    const payMethod = selectedPayCard ? selectedPayCard.getAttribute('data-method') : 'UPI';
    const totalAmount = AppState.selectedSeats.length * parseFloat(AppState.selectedShow.price);

    document.getElementById('btn-pay').disabled = true;
    document.getElementById('btn-pay').innerText = 'Processing secure transaction...';

    // Simulate database transaction latency
    setTimeout(() => {
        if (AppState.mode === 'demo') {
            const bookingId = AppState.db.bookings.length + 1;
            
            // Insert Booking
            AppState.db.bookings.push({
                booking_id: bookingId,
                user_id: AppState.activeUser.user_id,
                show_id: AppState.selectedShow.show_id,
                booking_time: new Date().toISOString().slice(0, 19).replace('T', ' '),
                status: 'Confirmed'
            });

            // Insert Tickets & Fire triggers
            AppState.selectedSeats.forEach(seat => {
                AppState.db.tickets.push({
                    ticket_id: AppState.db.tickets.length + 1,
                    booking_id: bookingId,
                    seat_number: seat
                });
                
                // Simulate TRIGGER: decrement show availability
                const showIndex = AppState.db.shows.findIndex(s => s.show_id === AppState.selectedShow.show_id);
                if (showIndex !== -1) {
                    AppState.db.shows[showIndex].available_seats -= 1;
                }
                
                // Log the trigger activation
                logAuditAction('TICKET_ADDED', `Seat ${seat} booked for Booking ID: ${bookingId}. Trigger after_ticket_insert decremented availability.`);
            });

            // Insert Payment
            AppState.db.payments.push({
                payment_id: AppState.db.payments.length + 1,
                booking_id: bookingId,
                amount: totalAmount,
                payment_method: payMethod,
                payment_status: 'Completed',
                payment_time: new Date().toISOString().slice(0, 19).replace('T', ' ')
            });

            saveLocalDB();
            completeCheckoutSuccess("Demo Transaction completed. Trigger after_ticket_insert executed!");
        } else {
            // Send payload to PHP backend Stored Procedure sp_book_seats
            const payload = {
                user_id: AppState.activeUser.user_id,
                show_id: AppState.selectedShow.show_id,
                seats: AppState.selectedSeats,
                amount: totalAmount,
                payment_method: payMethod
            };

            fetch('backend/api.php?action=book_seats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(res => res.json())
            .then(res => {
                if (res.success) {
                    completeCheckoutSuccess("Procedure sp_book_seats was executed successfully! Database triggers updated seats.");
                } else {
                    alert('Transaction error: ' + res.error);
                    document.getElementById('btn-pay').disabled = false;
                    document.getElementById('btn-pay').innerText = 'Pay & Confirm';
                }
            })
            .catch(() => {
                alert('Connection failure during checkout process.');
                document.getElementById('btn-pay').disabled = false;
                document.getElementById('btn-pay').innerText = 'Pay & Confirm';
            });
        }
    }, 1200);
}

function completeCheckoutSuccess(msg) {
    alert(msg);
    closeModal();
    document.getElementById('btn-pay').disabled = false;
    document.getElementById('btn-pay').innerText = 'Pay & Confirm';
    
    // Switch to Tickets View
    switchView('tickets');
}

// ==========================================
// VIEW USER TICKETS PASSES
// ==========================================

function renderTickets() {
    const list = document.getElementById('tickets-list');
    list.innerHTML = '<div style="color: var(--text-muted)">Loading your tickets...</div>';

    const drawTickets = (bookings, tickets, shows, movies, payments) => {
        // Filter user specific bookings
        const userBookings = bookings.filter(b => b.user_id === AppState.activeUser.user_id);
        
        if (userBookings.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">🎟️</span>
                    <p>You haven't booked any tickets yet.</p>
                    <button class="btn-secondary" onclick="switchView('movies')">Browse Movies</button>
                </div>
            `;
            return;
        }

        list.innerHTML = userBookings.map(b => {
            const show = shows.find(s => s.show_id === b.show_id) || {};
            const movie = movies.find(m => m.movie_id === show.movie_id) || {};
            const payment = payments.find(p => p.booking_id === b.booking_id) || { amount: 0, payment_status: 'Completed' };
            
            // Gather seat numbers
            let seatsStr = '';
            if (AppState.mode === 'demo') {
                seatsStr = tickets
                    .filter(t => t.booking_id === b.booking_id)
                    .map(t => t.seat_number)
                    .sort()
                    .join(', ');
            } else {
                seatsStr = b.seats || '';
            }

            const statusClass = b.status === 'Confirmed' ? 'confirmed' : 'cancelled';
            const isConfirmed = b.status === 'Confirmed';

            return `
                <div class="ticket-wrapper">
                    <div class="ticket-main">
                        <div class="ticket-header">
                            <span class="ticket-status-pill ${statusClass}">${b.status}</span>
                            <span class="ticket-detail-label">Booking #${b.booking_id}</span>
                        </div>
                        <h2 class="ticket-movie-title">${movie.title || 'Movie'}</h2>
                        
                        <div class="ticket-details-grid">
                            <div class="ticket-detail-item">
                                <span class="ticket-detail-label">Theater / Screen</span>
                                <span class="ticket-detail-value">${show.theater_name || 'TBA'}</span>
                            </div>
                            <div class="ticket-detail-item">
                                <span class="ticket-detail-label">Date & Time</span>
                                <span class="ticket-detail-value">${show.show_time || 'TBA'}</span>
                            </div>
                            <div class="ticket-detail-item">
                                <span class="ticket-detail-label">Seats</span>
                                <span class="ticket-detail-value">${seatsStr || 'N/A'}</span>
                            </div>
                            <div class="ticket-detail-item">
                                <span class="ticket-detail-label">Price Paid</span>
                                <span class="ticket-detail-value">₹${parseFloat(payment.amount).toFixed(2)} (${payment.payment_status})</span>
                            </div>
                        </div>
                        
                        ${isConfirmed ? `
                            <button class="cancel-booking-btn" onclick="cancelTicketBooking(${b.booking_id})">Cancel Booking</button>
                        ` : ''}
                    </div>
                    <div class="ticket-stub">
                        <div class="ticket-barcode"></div>
                        <div class="ticket-barcode-num">DB-BOOK-000${b.booking_id}</div>
                    </div>
                </div>
            `;
        }).join('');
    };

    if (AppState.mode === 'demo') {
        drawTickets(
            AppState.db.bookings, 
            AppState.db.tickets, 
            AppState.db.shows, 
            AppState.db.movies, 
            AppState.db.payments
        );
    } else {
        fetch('backend/api.php?action=get_bookings')
            .then(res => res.json())
            .then(res => {
                if (res.success) {
                    drawTickets(
                        res.data, 
                        [], 
                        AppState.db.shows, // use fallback lists from local sync or config if needed
                        AppState.db.movies,
                        res.data // backend maps payment and tickets inside the bookings response object
                    );
                }
            });
    }
}

function cancelTicketBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking? Triggers will execute to restore theater seating.')) {
        return;
    }

    if (AppState.mode === 'demo') {
        const bIndex = AppState.db.bookings.findIndex(b => b.booking_id === bookingId);
        if (bIndex !== -1) {
            const booking = AppState.db.bookings[bIndex];
            AppState.db.bookings[bIndex].status = 'Cancelled';
            
            // Get number of tickets
            const tickets = AppState.db.tickets.filter(t => t.booking_id === bookingId);
            
            // Simulate TRIGGER: restore available seats
            const showIndex = AppState.db.shows.findIndex(s => s.show_id === booking.show_id);
            if (showIndex !== -1) {
                AppState.db.shows[showIndex].available_seats += tickets.length;
            }

            // Set payment status to Refunded
            const pIndex = AppState.db.payments.findIndex(p => p.booking_id === bookingId);
            if (pIndex !== -1) {
                AppState.db.payments[pIndex].payment_status = 'Refunded';
            }

            // Log Audit Entry
            logAuditAction('BOOKING_CANCELLED', `Booking ID: ${bookingId} cancelled. Restored ${tickets.length} seats. Trigger after_booking_update updated show availability.`);
            
            saveLocalDB();
            alert('Booking cancelled successfully. Seat restored using Demo Trigger emulation!');
            renderTickets();
        }
    } else {
        fetch('backend/api.php?action=cancel_booking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ booking_id: bookingId })
        })
        .then(res => res.json())
        .then(res => {
            if (res.success) {
                alert('Booking successfully cancelled in database. Trigger after_booking_update restored seat availability!');
                renderTickets();
            } else {
                alert('Cancellation failed: ' + res.error);
            }
        });
    }
}

// ==========================================
// SQL DIAGNOSTICS & DBMS QUERY PANEL
// ==========================================

function renderQueryPanel() {
    const qInfo = DBMS_QUERIES[AppState.selectedQuery];
    if (!qInfo) return;

    document.getElementById('query-type-tag').innerText = qInfo.type;
    document.getElementById('query-desc-text').innerText = qInfo.description;
    
    // Highlight syntax
    document.getElementById('sql-code-editor').innerHTML = highlightSQL(qInfo.sql);
}

function executeActiveQuery() {
    const qInfo = DBMS_QUERIES[AppState.selectedQuery];
    if (!qInfo) return;

    const runBtn = document.getElementById('btn-run-query');
    runBtn.innerHTML = 'Running...';
    runBtn.disabled = true;

    const renderResultTable = (columns, rows) => {
        const tableHeader = document.getElementById('query-result-th');
        const tableBody = document.getElementById('query-result-tbody');
        
        tableHeader.innerHTML = '';
        tableBody.innerHTML = '';

        if (rows.length === 0) {
            tableHeader.innerHTML = '<th>No Results</th>';
            tableBody.innerHTML = '<tr><td style="color: var(--text-dark)">Query executed successfully, but returned 0 rows.</td></tr>';
            return;
        }

        // Set Headers
        columns.forEach(col => {
            const th = document.createElement('th');
            th.innerText = col.replace('_', ' ');
            tableHeader.appendChild(th);
        });

        // Set Rows
        rows.forEach(row => {
            const tr = document.createElement('tr');
            columns.forEach(col => {
                const td = document.createElement('td');
                td.innerText = row[col] !== undefined ? row[col] : 'NULL';
                tr.appendChild(td);
            });
            tableBody.appendChild(tr);
        });
    };

    // Simulate query processing time
    setTimeout(() => {
        if (AppState.mode === 'demo') {
            const result = qInfo.executeMock(AppState.db);
            renderResultTable(result.columns, result.rows);
            runBtn.innerHTML = 'Run SQL';
            runBtn.disabled = false;
        } else {
            // Make request to backend API
            let endpoint = '';
            if (AppState.selectedQuery === 'query_join') endpoint = 'run_query_join';
            else if (AppState.selectedQuery === 'query_subquery') endpoint = 'run_query_subquery';
            else if (AppState.selectedQuery === 'query_procedure') endpoint = 'run_query_procedure';

            fetch(`backend/api.php?action=${endpoint}`)
                .then(res => res.json())
                .then(res => {
                    if (res.success) {
                        const cols = res.data.results.length > 0 ? Object.keys(res.data.results[0]) : [];
                        renderResultTable(cols, res.data.results);
                    } else {
                        alert('SQL Error: ' + res.error);
                    }
                    runBtn.innerHTML = 'Run SQL';
                    runBtn.disabled = false;
                })
                .catch(() => {
                    alert('Failed to connect to API endpoint.');
                    runBtn.innerHTML = 'Run SQL';
                    runBtn.disabled = false;
                });
        }
    }, 400);
}

// ==========================================
// ADMIN DASHBOARD & CRUD MANAGEMENT
// ==========================================

function renderAdminDashboard() {
    renderAdminStats();
    loadAdminTab('movies');
    renderAuditLogs();
}

function renderAdminStats() {
    const calcStats = (bookings, payments, movies) => {
        const conf = bookings.filter(b => b.status === 'Confirmed');
        const totalRev = payments
            .filter(p => p.payment_status === 'Completed')
            .reduce((acc, p) => acc + parseFloat(p.amount), 0);

        document.getElementById('stat-revenue').innerText = `₹${totalRev.toFixed(2)}`;
        document.getElementById('stat-bookings').innerText = conf.length;
        document.getElementById('stat-movies').innerText = movies.length;
    };

    if (AppState.mode === 'demo') {
        calcStats(AppState.db.bookings, AppState.db.payments, AppState.db.movies);
    } else {
        Promise.all([
            fetch('backend/api.php?action=get_bookings').then(res => res.json()),
            fetch('backend/api.php?action=get_movies').then(res => res.json())
        ])
        .then(([bRes, mRes]) => {
            if (bRes.success && mRes.success) {
                // Bookings response contains nested payment data
                const bookings = bRes.data;
                const movies = mRes.data;
                
                // Map mock payments from bookings response
                const payments = bookings.map(b => ({
                    payment_status: b.payment_status === 'Completed' ? 'Completed' : 'Pending',
                    amount: b.amount_paid
                }));

                calcStats(bookings, payments, movies);
            }
        });
    }
}

function loadAdminTab(tab) {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    const activeTab = document.getElementById(`tab-link-${tab}`);
    if (activeTab) activeTab.classList.add('active');

    // Toggle forms/views
    document.querySelectorAll('.admin-tab-content').forEach(el => el.style.display = 'none');
    
    if (tab === 'movies') {
        document.getElementById('admin-movies-content').style.display = 'block';
        loadAdminMoviesGrid();
    } else if (tab === 'shows') {
        document.getElementById('admin-shows-content').style.display = 'block';
        loadAdminShowsGrid();
    }
}

// Admin tables renderer
function loadAdminMoviesGrid() {
    const tbody = document.getElementById('admin-movies-tbody');
    tbody.innerHTML = '<tr><td colspan="6">Loading movies...</td></tr>';

    const drawGrid = (movies) => {
        if (movies.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">No movies registered.</td></tr>';
            return;
        }
        tbody.innerHTML = movies.map(m => `
            <tr>
                <td><strong>${m.movie_id}</strong></td>
                <td>${m.title}</td>
                <td>${m.genre}</td>
                <td>${m.duration} Mins</td>
                <td>★ ${m.rating}</td>
                <td>
                    <button class="action-icon-btn delete" onclick="deleteMovieRecord(${m.movie_id})">🗑️</button>
                </td>
            </tr>
        `).join('');

        // Populate showtime add form options
        const select = document.getElementById('form-show-movie');
        select.innerHTML = movies.map(m => `<option value="${m.movie_id}">${m.title}</option>`).join('');
    };

    if (AppState.mode === 'demo') {
        drawGrid(AppState.db.movies);
    } else {
        fetch('backend/api.php?action=get_movies')
            .then(res => res.json())
            .then(res => {
                if (res.success) drawGrid(res.data);
            });
    }
}

function loadAdminShowsGrid() {
    const tbody = document.getElementById('admin-shows-tbody');
    tbody.innerHTML = '<tr><td colspan="7">Loading showtimes...</td></tr>';

    const drawGrid = (shows) => {
        if (shows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7">No showtimes configured.</td></tr>';
            return;
        }
        tbody.innerHTML = shows.map(s => {
            const movieTitle = s.movie_title || (AppState.db.movies.find(m => m.movie_id === s.movie_id) || {}).title || 'Unknown';
            return `
                <tr>
                    <td><strong>${s.show_id}</strong></td>
                    <td>${movieTitle}</td>
                    <td>${s.theater_name}</td>
                    <td>${s.show_time}</td>
                    <td>₹${parseFloat(s.price).toFixed(2)}</td>
                    <td>${s.available_seats} / ${s.total_seats}</td>
                    <td>
                        <button class="action-icon-btn delete" onclick="deleteShowRecord(${s.show_id})">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
    };

    if (AppState.mode === 'demo') {
        drawGrid(AppState.db.shows);
    } else {
        fetch('backend/api.php?action=get_shows')
            .then(res => res.json())
            .then(res => {
                if (res.success) drawGrid(res.data);
            });
    }
}

// Add Movie
function handleAddMovie(e) {
    e.preventDefault();
    const title = document.getElementById('form-movie-title').value;
    const genre = document.getElementById('form-movie-genre').value;
    const duration = parseInt(document.getElementById('form-movie-duration').value);
    const rating = parseFloat(document.getElementById('form-movie-rating').value);
    const description = document.getElementById('form-movie-desc').value;
    const poster_url = document.getElementById('form-movie-poster').value;

    if (AppState.mode === 'demo') {
        const id = AppState.db.movies.length + 1;
        AppState.db.movies.push({
            movie_id: id,
            title, genre, duration, rating, description,
            poster_url: poster_url || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80'
        });
        saveLocalDB();
        logAuditAction('MOVIE_ADDED', `Admin added new movie: "${title}" (Movie ID: ${id})`);
        
        alert('Movie added successfully (Offline mode).');
        document.getElementById('form-add-movie').reset();
        loadAdminMoviesGrid();
        renderAdminStats();
    } else {
        fetch('backend/api.php?action=add_movie', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, genre, duration, rating, description, poster_url })
        })
        .then(res => res.json())
        .then(res => {
            if (res.success) {
                alert('Movie registered successfully in DBMS database!');
                document.getElementById('form-add-movie').reset();
                loadAdminMoviesGrid();
                renderAdminStats();
            } else {
                alert('Error: ' + res.error);
            }
        });
    }
}

// Add Showtime
function handleAddShow(e) {
    e.preventDefault();
    const movie_id = parseInt(document.getElementById('form-show-movie').value);
    const theater_name = document.getElementById('form-show-theater').value;
    const show_time_raw = document.getElementById('form-show-time').value; // e.g. "2026-06-16T14:30"
    const show_time = show_time_raw.replace('T', ' ') + ':00';
    const price = parseFloat(document.getElementById('form-show-price').value);
    const total_seats = parseInt(document.getElementById('form-show-seats').value) || 80;

    if (AppState.mode === 'demo') {
        const id = AppState.db.shows.length + 1;
        AppState.db.shows.push({
            show_id: id,
            movie_id, theater_name, show_time, price,
            total_seats, available_seats: total_seats
        });
        saveLocalDB();
        logAuditAction('SHOWTIME_ADDED', `Admin added showtime for Movie ID ${movie_id} at ${theater_name} (Show ID: ${id})`);

        alert('Showtime scheduled successfully (Offline mode).');
        document.getElementById('form-add-show').reset();
        loadAdminShowsGrid();
    } else {
        fetch('backend/api.php?action=add_show', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ movie_id, theater_name, show_time, price, total_seats })
        })
        .then(res => res.json())
        .then(res => {
            if (res.success) {
                alert('Showtime created successfully in database!');
                document.getElementById('form-add-show').reset();
                loadAdminShowsGrid();
            } else {
                alert('Error: ' + res.error);
            }
        });
    }
}

// Delete CRUD actions
function deleteMovieRecord(movieId) {
    if (!confirm('Warning: Deleting this movie will delete all associated showtimes, tickets, and bookings! Proceed?')) {
        return;
    }

    if (AppState.mode === 'demo') {
        AppState.db.movies = AppState.db.movies.filter(m => m.movie_id !== movieId);
        
        // Cascading deletion simulation
        const deletingShows = AppState.db.shows.filter(s => s.movie_id === movieId);
        const deletingShowIds = deletingShows.map(s => s.show_id);
        
        AppState.db.shows = AppState.db.shows.filter(s => s.movie_id !== movieId);
        
        const deletingBookings = AppState.db.bookings.filter(b => deletingShowIds.includes(b.show_id));
        const deletingBookingIds = deletingBookings.map(b => b.booking_id);
        
        AppState.db.bookings = AppState.db.bookings.filter(b => !deletingShowIds.includes(b.show_id));
        AppState.db.tickets = AppState.db.tickets.filter(t => !deletingBookingIds.includes(t.booking_id));
        AppState.db.payments = AppState.db.payments.filter(p => !deletingBookingIds.includes(p.booking_id));

        saveLocalDB();
        logAuditAction('MOVIE_DELETED', `Admin deleted movie record ID: ${movieId} along with nested shows/reservations.`);
        
        alert('Movie record and dependencies deleted.');
        loadAdminMoviesGrid();
        renderAdminStats();
    } else {
        fetch('backend/api.php?action=delete_movie', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ movie_id: movieId })
        })
        .then(res => res.json())
        .then(res => {
            if (res.success) {
                alert('Movie and cascades deleted successfully.');
                loadAdminMoviesGrid();
                renderAdminStats();
            } else {
                alert('Deletion error: ' + res.error);
            }
        });
    }
}

function deleteShowRecord(showId) {
    if (!confirm('Deplay cancellation of show ID #' + showId + '? Bookings will be cascade deleted.')) {
        return;
    }

    if (AppState.mode === 'demo') {
        AppState.db.shows = AppState.db.shows.filter(s => s.show_id !== showId);
        const deletingBookings = AppState.db.bookings.filter(b => b.show_id === showId);
        const deletingBookingIds = deletingBookings.map(b => b.booking_id);
        
        AppState.db.bookings = AppState.db.bookings.filter(b => b.show_id !== showId);
        AppState.db.tickets = AppState.db.tickets.filter(t => !deletingBookingIds.includes(t.booking_id));
        AppState.db.payments = AppState.db.payments.filter(p => !deletingBookingIds.includes(p.booking_id));

        saveLocalDB();
        logAuditAction('SHOW_DELETED', `Admin cancelled screening ID: ${showId}.`);
        
        alert('Showtime deleted.');
        loadAdminShowsGrid();
    } else {
        fetch('backend/api.php?action=delete_show', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ show_id: showId })
        })
        .then(res => res.json())
        .then(res => {
            if (res.success) {
                alert('Showtime deleted successfully.');
                loadAdminShowsGrid();
            } else {
                alert('Deletion error: ' + res.error);
            }
        });
    }
}

// Render DB Trigger Audit Logs
function renderAuditLogs() {
    const list = document.getElementById('log-stream');
    list.innerHTML = '<div>Syncing logs...</div>';

    const drawLogs = (logs) => {
        if (logs.length === 0) {
            list.innerHTML = '<div style="color: var(--text-dark); padding: 1rem">No audit logs registered yet. Trigger a seat booking/cancel.</div>';
            return;
        }
        
        list.innerHTML = logs.map(log => {
            let classType = '';
            if (log.action.includes('TICKET_ADDED') || log.action.includes('INIT')) classType = 'trigger-insert';
            if (log.action.includes('CANCEL')) classType = 'trigger-cancel';

            return `
                <div class="log-entry ${classType}">
                    <div class="log-info">
                        <div class="log-header">
                            <span class="log-action-badge">${log.action}</span>
                        </div>
                        <div class="log-desc">${log.details}</div>
                    </div>
                    <div class="log-time">${log.logged_at.substring(11, 19)}</div>
                </div>
            `;
        }).join('');
    };

    if (AppState.mode === 'demo') {
        drawLogs(AppState.db.audit_logs);
    } else {
        fetch('backend/api.php?action=get_audit_logs')
            .then(res => res.json())
            .then(res => {
                if (res.success) drawLogs(res.data);
            });
    }
}

// DB Seeder Reset
function resetDatabase() {
    if (!confirm('Are you sure you want to clear current modifications and reset the database schema and sample data?')) {
        return;
    }

    if (AppState.mode === 'demo') {
        initLocalDB(true);
        alert('Demo State successfully reset to initial seed schema records.');
        renderAdminDashboard();
    } else {
        const btn = document.getElementById('btn-reset-db');
        btn.innerText = 'Resetting...';
        btn.disabled = true;

        fetch('backend/api.php?action=reset_db', { method: 'POST' })
            .then(res => res.json())
            .then(res => {
                if (res.success) {
                    alert('SQL tables dropped, recreated, and seeded successfully via schema.sql!');
                    renderAdminDashboard();
                } else {
                    alert('Reseed failed: ' + res.error);
                }
                btn.innerText = 'Reset DBMS Database';
                btn.disabled = false;
            })
            .catch(() => {
                alert('Could not complete MySQL database reset. Check server console.');
                btn.innerText = 'Reset DBMS Database';
                btn.disabled = false;
            });
    }
}
