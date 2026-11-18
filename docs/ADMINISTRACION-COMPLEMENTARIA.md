# Administration preview, isolated from the published app

New standalone component: `services/control-admin/`. It is not imported by server.mjs or the frontend and changes no existing scripts, Secrets, database policies or camera services. See its README and docs for scope, tests and staged migration. No deployment or camera migration is authorized by this branch.

Run independently with Node 22.16+: cd services/control-admin; npm ci --ignore-scripts; npm test; npm start. Demo is localhost-only with fictional identities; never expose it publicly.
