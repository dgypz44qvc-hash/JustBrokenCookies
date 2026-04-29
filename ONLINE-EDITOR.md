# JBC Online Editor

The hosted editor is available from:

```text
/online-editor
```

It uses the same editor UI as `/editor`, but is intended for deployment behind a password.

## Password

Set this environment variable on the host:

```text
EDITOR_PASSWORD=choose-a-long-private-password
```

When `EDITOR_PASSWORD` is set, `/editor`, `/online-editor`, and all `/api/*` editor endpoints require HTTP Basic authentication. The username can be anything; the password must match `EDITOR_PASSWORD`.

If `EDITOR_PASSWORD` is not set, the editor remains open. That is convenient for local development, but it should not be used for a public deployment.

## What It Saves

The online editor writes the same files as the local editor:

```text
index.html
css/editor-overrides.css
images/editor-assets/*
```

Use a host with a persistent filesystem if you want edits and uploads to survive restarts. Some serverless hosts reset local file changes after deploys.
