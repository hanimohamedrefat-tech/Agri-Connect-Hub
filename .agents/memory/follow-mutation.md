---
name: Follow mutation and other path-param mutations
description: Correct argument shapes for mutations that use path params in Orval-generated hooks
---

# Orval Mutation Argument Shapes (Path Param Mutations)

When Orval generates mutations from endpoints that use a path parameter, the generated hook expects the path param as a top-level key, NOT nested in `data`.

## Confirmed shapes

| Hook | Correct call | Wrong call |
|------|-------------|-----------|
| `useFollowUser` | `mutate({ username: "abc" })` | `mutate({ userId: 123 })` |
| `useJoinMeetingByCode` | `mutate({ joinCode: "abc-def" })` | `mutate({ data: { joinCode: "abc-def" } })` |

**Why:** These endpoints have only a path param, no request body. Orval wraps the path param as the mutation variable directly.

**How to apply:** When using any generated mutation hook for a path-param-only endpoint, check the generated `MutationFunction` type signature to confirm the variable shape before calling.
