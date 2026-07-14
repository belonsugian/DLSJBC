<?php
/**
 * config.php
 * Database connection for the DLSJBC Grade Management System.
 * Edit $DB_USER / $DB_PASS below if your XAMPP MySQL uses a different login
 * (the XAMPP default is username "root" with an empty password).
 */

$DB_HOST = 'localhost';
$DB_NAME = 'dlsjbc_db';
$DB_USER = 'root';
$DB_PASS = '';
$DB_CHARSET = 'utf8mb4';

$dsn = "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=$DB_CHARSET";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $DB_USER, $DB_PASS, $options);
} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed: ' . $e->getMessage(),
    ]);
    exit;
}

// All API endpoints respond with JSON.
header('Content-Type: application/json');

/** Small helper to send a JSON response and stop execution. */
function respond($data) {
    echo json_encode($data);
    exit;
}

/** Small helper to read POST body whether it's form-encoded or JSON. */
function post_data() {
    if (!empty($_POST)) return $_POST;
    $raw = file_get_contents('php://input');
    $json = json_decode($raw, true);
    return is_array($json) ? $json : [];
}
