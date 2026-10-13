# Writing Data

InfloWave provides data-writing and import actions for supported connectors. Select the intended connection and database before preparing an import.

## Prepare an import

Choose the input format offered by the selected connector. For structured files, review the mapping of timestamp, measurement, tag, and value fields. Check timestamp precision and numeric field types before writing.

## InfluxDB line protocol

An example line-protocol point contains a measurement, optional tags, and fields:

```text
temperature,location=office value=23.5
```

This example omits an explicit timestamp. Use the timestamp and precision required by your ingestion workflow when importing historical data.

## Write and verify

Preview the data when the import dialog offers a preview. Start with a small batch, review the result, and query the target measurement to confirm that values and timestamps are correct before importing the rest.

Writing data changes the selected server. Check the target carefully, especially when working with production data.

Use [Queries](./query-features.md) to verify the imported records.
