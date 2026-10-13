# Database Operations

Connect to a server and expand its entry in the database explorer. Available operations depend on the database type, server version, and your account's permissions.

## Browse data structures

Select a database to explore its measurements or tables. Expand an item to inspect fields and tags where the server supports them. Refresh the explorer after making changes outside InfloWave.

For an InfluxDB 1.x database, you can inspect its structure with InfluxQL:

```sql
SHOW MEASUREMENTS
SHOW FIELD KEYS FROM "your_measurement"
SHOW TAG KEYS FROM "your_measurement"
```

Replace the example measurement name with one from your database.

## Create and manage

Use the explorer's context menu for supported database and retention-policy operations. Select the intended connection and database before confirming a change.

Deleting a database or measurement affects data on the server. Check the selected item and keep any required backup before confirming a destructive operation.

Continue with [Queries](./query-features.md).
