# Queries

Open a query tab for the connection and select the database you want to query. The editor provides syntax highlighting, completion, and formatting for supported query languages.

## Execute a query

Write a query and use the editor's execution action. Check the active connection, database, and any selected text before executing. Results and execution errors appear in the result panel.

For InfluxDB 1.x, limit the time range and row count while exploring an unfamiliar measurement:

```sql
SELECT * FROM "your_measurement"
WHERE time > now() - 1h
LIMIT 100
```

Use the query language supported by your selected server. InfluxQL examples do not apply to every connector.

## Work with results

Inspect returned columns in the results table. Use the available result actions to copy or export data. Query history and saved queries help you reuse work without retyping it.

## If a query fails

Read the server's error message, verify the selected database, and check field names and quoting. For a slow query, try a narrower time range or a smaller row limit before changing timeout settings.

See [Data Visualization](./data-visualization.md) to turn suitable results into charts.
