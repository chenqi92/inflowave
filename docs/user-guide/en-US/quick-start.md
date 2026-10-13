# Quick Start

Have your database server address, port, and credentials ready. The exact connection fields depend on the selected database type and version.

## Create a connection

1. Open the workspace and choose the **+** button to add a connection.
2. Give the connection a descriptive name.
3. Select the database type and enter its server address, port, and authentication details.
4. Use **Test Connection** to verify access, then save the connection.
5. Connect and expand it in the database explorer.

For an InfluxDB 1.x server, the usual HTTP port is `8086`. Use the port configured on your own server if it differs.

## Run your first query

Open a query tab for the connection. On InfluxDB 1.x, this read-only query lists databases:

```sql
SHOW DATABASES
```

Select a database and list its measurements:

```sql
SHOW MEASUREMENTS
```

To inspect a small sample, replace `your_measurement` with an existing measurement name:

```sql
SELECT * FROM "your_measurement" LIMIT 10
```

Choose the execution action in the editor toolbar. Results appear below the editor. These examples use InfluxQL; choose the query language supported by your server for other database types or versions.

Next, learn about [Queries](./query-features.md) and [Data Visualization](./data-visualization.md).
