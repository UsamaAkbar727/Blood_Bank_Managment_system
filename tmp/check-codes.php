<?php
require 'backend/config.php';
require 'backend/db.php';
$res = db()->query('SELECT collection_code FROM collections LIMIT 10');
while($row = $res->fetch_assoc()) {
    echo $row['collection_code'] . PHP_EOL;
}
