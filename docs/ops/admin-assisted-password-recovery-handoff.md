# Admin-Assisted Password Recovery Handoff

This note documents the minimal support flow for forgotten-password cases in GymCRM V2.

## Purpose

Use the existing admin password reset path when a user cannot remember their password. Do not create a separate recovery request, queue, or approval state.

## Handoff Checklist

1. Confirm the request belongs to the current center.
2. Verify the requester through the center's existing support procedure.
3. Find the user in `사용자 계정 관리`.
4. Use the existing password reset flow for that account.
5. Tell the user to sign in with the temporary password and complete the normal password-change flow.

## Do Not

- Do not treat this as a new self-service recovery feature.
- Do not reset accounts outside the current center.
- Do not create a recovery ticket state inside the product.
- Do not bypass the existing password-change lifecycle after reset.
