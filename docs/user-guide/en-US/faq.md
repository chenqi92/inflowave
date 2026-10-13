# Frequently Asked Questions

## Why can I not connect?

Check the server address, port, database type, authentication details, and network access. Test the connection again after correcting the settings. See [Connections](./connection-management.md).

## Why is a database or measurement missing?

Refresh the explorer and confirm that you selected the intended connection. Your account may not have permission to list every database. Some structures and operations also depend on the server version.

## Why does a query return no data?

Check the selected database, measurement name, filters, and time range. Confirm that the timestamps use the expected time zone and precision. Start with a small read-only query before adding more filters.

## Can I change the language?

Yes. Choose a language in Settings or the native language menu. Your saved preference is used the next time you launch InfloWave. The user guide follows the selected interface language.

## How can I reopen this guide?

Open the user guide from the Help menu. The option at the bottom of the guide controls whether it opens automatically on startup.

## How do I report a problem?

Open an issue in the [InfloWave repository](https://github.com/chenqi92/inflowave/issues). Include the application version, operating system, database type and version, steps to reproduce, and the relevant error message. Remove passwords, tokens, and private query data before sharing logs or screenshots.
