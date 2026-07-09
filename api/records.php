<?php
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once __DIR__ . '/db.php';

try {
    $pdo = new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $store = $_GET['store'] ?? '';
    $stmt = $pdo->prepare('SELECT date, orders, hours, iph FROM iph_records WHERE store = ? ORDER BY date');
    $stmt->execute([$store]);
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));

} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $stmt = $pdo->prepare('
        INSERT INTO iph_records (store, date, orders, hours, iph) VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE orders = VALUES(orders), hours = VALUES(hours), iph = VALUES(iph)
    ');
    $stmt->execute([$data['store'], $data['date'], $data['orders'], $data['hours'], $data['iph']]);
    echo json_encode(['ok' => true]);

} elseif ($method === 'DELETE') {
    $data = json_decode(file_get_contents('php://input'), true);
    $stmt = $pdo->prepare('DELETE FROM iph_records WHERE store = ? AND date = ?');
    $stmt->execute([$data['store'], $data['date']]);
    echo json_encode(['ok' => true]);
}
