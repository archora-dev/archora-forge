# Frontend API Impact

Decision: blocked
Merge risk: high
Reason: 1 breaking frontend contract change detected.

## Summary

- Breaking: 1
- Warnings: 0
- Non-breaking: 1
- Affected resources: members, users
- Affected generated files: 6

## PR Summary

Frontend API impact: blocked (high risk).
1 breaking frontend contract change detected.
Changes: 1 breaking, 0 warnings, 1 non-breaking.
Affected resources: members, users.
Affected generated files: 6.
Migration hints:
- users: replace usages before regenerating. GET /users was removed.
- members: new endpoint is available after regeneration. GET /members was added.

## Migration Hints

- users: replace usages before regenerating. GET /users was removed.
- members: new endpoint is available after regeneration. GET /members was added.

## Changes

- breaking removed-endpoint: GET /users was removed. (GET /users)
- non-breaking added-endpoint: GET /members was added. (GET /members)

## Impacted Surface

- Operation IDs: listMembers, listUsers
- Client methods: listMembers(), listUsers()
- Query hooks: useListMembersQuery, useListUsersQuery

## Source Usage

- `report/audit/generated-preview/default/src/features/members/api/useMembersQuery.ts:1,2,9,10`: listMembers, membersClient, membersQueryKeys
- `report/audit/generated-preview/default/src/features/members/model/members.config.ts:1`: membersConfig
- `report/audit/generated-preview/default/src/features/members/model/members.permissions.ts:1`: membersPermissions
- `report/audit/generated-preview/default/src/shared/api/generated/members/members.client.ts:21,22,27`: listMembers, membersClient
- `report/audit/generated-preview/default/src/shared/api/generated/members/members.query-keys.ts:3,5,6`: membersQueryKeys
- `src/users.ts:1,4`: listUsers, usersClient
