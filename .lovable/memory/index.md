# Project Memory

## Core

JAMB CBT training platform. Supabase backend, no external services.
Space Grotesk headings, Inter body. Primary deep blue #1a3a6e.
Email whitelist system: allowed_users table gates all access.
General password for first-time onboarding only, never for returning login.

## Memories

- [Auth flow](mem://features/auth) — Whitelist check → general password → account setup → personal login
- [DB schema](mem://features/db-schema) — allowed_users, settings, users tables with security-definer functions
- [Admin panel](mem://features/admin) — Role-based admin panel with sidebar, CRUD for allowed students, subjects, topics, questions
- [CBT features](mem://features/cbt) — Practice mode with all-topics option, option shuffling, AI generation. CBT exam with configurable duration (30/60/90/120 min) and proportional question count.
