# AGENTS.md

This file provides guidance for Codex when working in this repository.

## Project Context

This is my personal website repository. Changes should prioritize clean design, maintainability, performance, accessibility, and visual consistency.

The website represents my personal brand, so content, layout, and aesthetics should be handled carefully.

## Core Rules

### Git and Branching

- Never push directly to `main` without my explicit confirmation.
- Before making large or risky changes, create a new branch.
- If the scope of changes grows beyond the original request, pause and summarize the changes before continuing.
- Keep commits focused and easy to review.
- Do not rewrite git history unless I explicitly ask for it.

### Content Changes

- Any content change must be confirmed with me before finalizing.
- This includes changes to:
  - Bio or personal descriptions
  - Project descriptions
  - Resume/CV content
  - Blog posts
  - Contact information
  - Social links
  - About page text
  - Homepage copy
- Do not invent personal details, achievements, dates, roles, companies, or project outcomes.
- If content is missing or unclear, use placeholders or ask for clarification.

### Design and Visual Quality

Always check the appearance of the website after making UI changes.

Pay attention to:

- Overall aesthetics
- Alignment of objects
- Spacing and padding
- Typography consistency
- Visual hierarchy
- Mobile responsiveness
- Dark mode and light mode, if applicable
- Ordering and grouping of sections
- Button, link, and card consistency
- Image sizing and aspect ratios
- Layout stability across screen sizes

Everything should look intentional, ordered, and polished.

### Development Workflow

Before editing, understand the relevant files and existing patterns.

When making changes:

1. Inspect the current implementation.
2. Follow the existing code style.
3. Make the smallest reasonable change.
4. Run formatting and linting when available.
5. Test the website locally when possible.
6. Review the visual appearance before considering the task complete.

### Code Quality

- Keep components clean, readable, and reusable.
- Avoid unnecessary abstractions.
- Prefer simple, maintainable solutions.
- Do not introduce new dependencies unless clearly justified.
- Preserve existing functionality unless I explicitly ask to change it.
- Keep styling consistent with the existing design system.
- Remove unused code when it is clearly safe to do so.

### Visual Review Requirement

After UI or styling changes, verify that:

- The page still loads correctly.
- Elements are aligned properly.
- Sections appear in the correct order.
- The layout works on desktop and mobile.
- There are no obvious spacing, overflow, or wrapping issues.
- The final result looks aesthetically polished.

If browser-based verification is available, use it. If not, clearly state that visual verification could not be completed.

### Safety Around Personal Website Content

Because this is a personal website:

- Do not publish or push changes without my confirmation.
- Do not add exaggerated claims.
- Do not modify personal tone without approval.
- Do not alter public-facing identity details unless requested.
- Confirm meaningful content edits before treating them as final.

## Preferred Behavior

When completing a task, summarize:

- What changed
- Which files were modified
- Whether content changes were made
- Whether visual appearance was checked
- Any follow-up decisions needed from me

## Important Reminder

Never push to `main` without my explicit confirmation.
