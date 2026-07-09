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
    $stmt = $pdo->prepare('SELECT value FROM iph_plans WHERE store = ?');
    $stmt->execute([$store]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    echo json_encode($row ? ['value' => (float)$row['value']] : null);

} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $stmt = $pdo->prepare('
        INSERT INTO iph_plans (store, value) VALUES (?, ?)
        ON DUPLICATE KEY UPDATE value = VALUES(value)
    ');
    $stmt->execute([$data['store'], $data['value']]);
    echo json_encode(['ok' => true]);

} elseif ($method === 'DELETE') {
    $data = json_decode(file_get_contents('php://input'), true);
    $stmt = $pdo->prepare('DELETE FROM iph_plans WHERE store = ?');
    $stmt->execute([$data['store']]);
    echo json_encode(['ok' => true]);
}
