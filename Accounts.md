# Accounts

Prompt Library is moving from a single-user local tool toward a shared library that can be accessed by multiple people and multiple devices.

## Current implementation

The account UI supports:

- account name
- password
- create account
- sign in
- sign out
- salted password hashing with Web Crypto
- browser session state
- device handoff through the existing web application
- QR generation without installing a phone app

The current authentication storage is deliberately local-first. It is suitable for a prototype and for separating users on one browser, but it is **not a production cloud authentication system** and it does not synchronise the existing local prompt database between devices.

## Production direction

For true multi-device accounts, move authentication and library storage behind a server-backed identity layer.

A strong candidate is Supabase because its Auth service supports password authentication and sessions, while Postgres Row Level Security can enforce which users can read or modify library records.

Recommended data model:

- users/profile
- libraries
- library_members
- prompts
- prompt_versions
- folders
- workspaces
- device_sessions

Recommended roles:

- Owner
- Editor
- Viewer

Do not put passwords, API keys, prompt contents, or session secrets into QR URLs. The QR should only contain a navigation URL or a short-lived handoff token.

## Design principle

This remains **one Prompt Library**. The phone is a browser surface, not a second app.
