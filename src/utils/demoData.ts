import type { Table, Relationship } from '../types';
import { getTableColor } from './sqlParser';

// Demo schema representing an e-commerce platform
export const DEMO_TABLES: Table[] = [
  {
    id: 'table-users',
    name: 'users',
    columns: [
      { name: 'id', type: 'SERIAL', isPrimaryKey: true, isForeignKey: false, isNullable: false },
      { name: 'email', type: 'VARCHAR(255)', isPrimaryKey: false, isForeignKey: false, isNullable: false },
      { name: 'username', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false, isNullable: false },
      { name: 'password_hash', type: 'VARCHAR(255)', isPrimaryKey: false, isForeignKey: false, isNullable: false },
      { name: 'first_name', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: false, isNullable: true },
      { name: 'last_name', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: false, isNullable: true },
      { name: 'avatar_url', type: 'TEXT', isPrimaryKey: false, isForeignKey: false, isNullable: true },
      { name: 'created_at', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false, isNullable: false },
      { name: 'updated_at', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false, isNullable: false },
    ],
    color: getTableColor(0),
  },
  {
    id: 'table-products',
    name: 'products',
    columns: [
      { name: 'id', type: 'SERIAL', isPrimaryKey: true, isForeignKey: false, isNullable: false },
      { name: 'name', type: 'VARCHAR(200)', isPrimaryKey: false, isForeignKey: false, isNullable: false },
      { name: 'description', type: 'TEXT', isPrimaryKey: false, isForeignKey: false, isNullable: true },
      { name: 'price', type: 'DECIMAL(10,2)', isPrimaryKey: false, isForeignKey: false, isNullable: false },
      { name: 'sku', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: false, isNullable: false },
      { name: 'category_id', type: 'INT', isPrimaryKey: false, isForeignKey: true, isNullable: false, references: { table: 'categories', column: 'id' } },
      { name: 'stock_quantity', type: 'INT', isPrimaryKey: false, isForeignKey: false, isNullable: false },
      { name: 'image_url', type: 'TEXT', isPrimaryKey: false, isForeignKey: false, isNullable: true },
      { name: 'is_active', type: 'BOOLEAN', isPrimaryKey: false, isForeignKey: false, isNullable: false },
      { name: 'created_at', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false, isNullable: false },
    ],
    color: getTableColor(1),
  },
  {
    id: 'table-categories',
    name: 'categories',
    columns: [
      { name: 'id', type: 'SERIAL', isPrimaryKey: true, isForeignKey: false, isNullable: false },
      { name: 'name', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false, isNullable: false },
      { name: 'slug', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false, isNullable: false },
      { name: 'parent_id', type: 'INT', isPrimaryKey: false, isForeignKey: true, isNullable: true, references: { table: 'categories', column: 'id' } },
      { name: 'description', type: 'TEXT', isPrimaryKey: false, isForeignKey: false, isNullable: true },
    ],
    color: getTableColor(2),
  },
  {
    id: 'table-orders',
    name: 'orders',
    columns: [
      { name: 'id', type: 'SERIAL', isPrimaryKey: true, isForeignKey: false, isNullable: false },
      { name: 'user_id', type: 'INT', isPrimaryKey: false, isForeignKey: true, isNullable: false, references: { table: 'users', column: 'id' } },
      { name: 'order_number', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: false, isNullable: false },
      { name: 'status', type: 'VARCHAR(20)', isPrimaryKey: false, isForeignKey: false, isNullable: false },
      { name: 'total_amount', type: 'DECIMAL(10,2)', isPrimaryKey: false, isForeignKey: false, isNullable: false },
      { name: 'shipping_address_id', type: 'INT', isPrimaryKey: false, isForeignKey: true, isNullable: false, references: { table: 'addresses', column: 'id' } },
      { name: 'payment_method', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: false, isNullable: true },
      { name: 'notes', type: 'TEXT', isPrimaryKey: false, isForeignKey: false, isNullable: true },
      { name: 'created_at', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false, isNullable: false },
      { name: 'shipped_at', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false, isNullable: true },
    ],
    color: getTableColor(3),
  },
  {
    id: 'table-order_items',
    name: 'order_items',
    columns: [
      { name: 'id', type: 'SERIAL', isPrimaryKey: true, isForeignKey: false, isNullable: false },
      { name: 'order_id', type: 'INT', isPrimaryKey: false, isForeignKey: true, isNullable: false, references: { table: 'orders', column: 'id' } },
      { name: 'product_id', type: 'INT', isPrimaryKey: false, isForeignKey: true, isNullable: false, references: { table: 'products', column: 'id' } },
      { name: 'quantity', type: 'INT', isPrimaryKey: false, isForeignKey: false, isNullable: false },
      { name: 'unit_price', type: 'DECIMAL(10,2)', isPrimaryKey: false, isForeignKey: false, isNullable: false },
      { name: 'discount', type: 'DECIMAL(10,2)', isPrimaryKey: false, isForeignKey: false, isNullable: true },
    ],
    color: getTableColor(4),
  },
  {
    id: 'table-addresses',
    name: 'addresses',
    columns: [
      { name: 'id', type: 'SERIAL', isPrimaryKey: true, isForeignKey: false, isNullable: false },
      { name: 'user_id', type: 'INT', isPrimaryKey: false, isForeignKey: true, isNullable: false, references: { table: 'users', column: 'id' } },
      { name: 'label', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: false, isNullable: true },
      { name: 'street_address', type: 'VARCHAR(255)', isPrimaryKey: false, isForeignKey: false, isNullable: false },
      { name: 'city', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false, isNullable: false },
      { name: 'state', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false, isNullable: true },
      { name: 'postal_code', type: 'VARCHAR(20)', isPrimaryKey: false, isForeignKey: false, isNullable: false },
      { name: 'country', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false, isNullable: false },
      { name: 'is_default', type: 'BOOLEAN', isPrimaryKey: false, isForeignKey: false, isNullable: false },
    ],
    color: getTableColor(5),
  },
];

export const DEMO_RELATIONSHIPS: Relationship[] = [
  {
    id: 'rel-products-categories',
    sourceTable: 'table-products',
    sourceColumn: 'category_id',
    targetTable: 'table-categories',
    targetColumn: 'id',
    type: 'one-to-many',
  },
  {
    id: 'rel-categories-self',
    sourceTable: 'table-categories',
    sourceColumn: 'parent_id',
    targetTable: 'table-categories',
    targetColumn: 'id',
    type: 'one-to-many',
  },
  {
    id: 'rel-orders-users',
    sourceTable: 'table-orders',
    sourceColumn: 'user_id',
    targetTable: 'table-users',
    targetColumn: 'id',
    type: 'one-to-many',
  },
  {
    id: 'rel-orders-addresses',
    sourceTable: 'table-orders',
    sourceColumn: 'shipping_address_id',
    targetTable: 'table-addresses',
    targetColumn: 'id',
    type: 'one-to-many',
  },
  {
    id: 'rel-order_items-orders',
    sourceTable: 'table-order_items',
    sourceColumn: 'order_id',
    targetTable: 'table-orders',
    targetColumn: 'id',
    type: 'one-to-many',
  },
  {
    id: 'rel-order_items-products',
    sourceTable: 'table-order_items',
    sourceColumn: 'product_id',
    targetTable: 'table-products',
    targetColumn: 'id',
    type: 'one-to-many',
  },
  {
    id: 'rel-addresses-users',
    sourceTable: 'table-addresses',
    sourceColumn: 'user_id',
    targetTable: 'table-users',
    targetColumn: 'id',
    type: 'one-to-many',
  },
];

export const DEMO_SQL_QUERIES = `-- E-Commerce Platform Report Queries
-- These queries demonstrate the relationships in our database

-- Order Summary Report
SELECT
    o.order_number,
    o.created_at AS order_date,
    u.email AS customer_email,
    u.first_name || ' ' || u.last_name AS customer_name,
    a.city || ', ' || a.country AS shipping_location,
    o.total_amount,
    o.status
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN addresses a ON o.shipping_address_id = a.id
WHERE o.created_at >= '2024-01-01'
ORDER BY o.created_at DESC;

-- Product Sales Analysis
SELECT
    p.name AS product_name,
    c.name AS category,
    SUM(oi.quantity) AS total_sold,
    SUM(oi.quantity * oi.unit_price) AS revenue
FROM order_items oi
JOIN products p ON oi.product_id = p.id
JOIN categories c ON p.category_id = c.id
JOIN orders o ON oi.order_id = o.id
WHERE o.status = 'completed'
GROUP BY p.id, p.name, c.name
ORDER BY revenue DESC;

-- Customer Order History
SELECT
    u.username,
    COUNT(DISTINCT o.id) AS total_orders,
    SUM(o.total_amount) AS lifetime_value,
    MAX(o.created_at) AS last_order_date
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.username
HAVING COUNT(o.id) > 0;`;
