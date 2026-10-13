# Connections

Connections store the settings needed to reach your database servers. Use descriptive names to distinguish local, test, and production environments.

## Add and test

Choose the **+** action, select the database type, and enter the requested server and authentication fields. Different server versions may require a username and password, a token, or additional organization and database information.

Use **Test Connection** before saving. A successful test confirms that the configured endpoint can be reached with the supplied settings.

## Manage existing connections

Use a connection's context menu to connect, disconnect, edit, test, or refresh it. Disconnect before changing settings if an operation is in progress. Deleting a saved connection removes its local configuration; database deletion is a separate operation.

## Troubleshoot a connection

- Verify the hostname, port, and whether HTTPS is required.
- Check that the server is running and reachable from this computer.
- Confirm the database type and version match the selected connector.
- Check credentials and permissions if the server rejects access.
- For an HTTPS endpoint, check the server certificate and TLS settings.

See [Frequently Asked Questions](./faq.md) for more help.
