# AegisAgent Lab Frontend Admin

React + Vite management console for the local Agent MVP.

## Features

- Dashboard with current project metrics.
- Task list and task creation.
- Task approval and rejection.
- Read-only execution form for Go and Rust tools.
- Trace timeline and JSON export viewer.
- Static tool catalog for the current read-only tool chain.

## Run Locally

Start the C# API first:

```powershell
cd ..\agent-service\csharp-api
dotnet run --project Agent.Api\Agent.Api.csproj --urls http://localhost:5055
```

Start the frontend:

```powershell
npm install
npm run dev
```

The Vite dev server proxies `/api` to `http://localhost:5055`, so no CORS change is required for local use.
The default local URL is `http://127.0.0.1:5174`.

## Build

```powershell
npm run build
```

## Scope

This console intentionally exposes no production write actions, code modification actions, deployment actions, authentication, tenant management, or real model API calls.
