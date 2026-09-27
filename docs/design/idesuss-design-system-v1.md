# Idesüss Design System v1

## Design intent
The interface should feel like a reliable European transport information platform: dense enough for professional use, calm enough for long daily use, and distinctive without looking experimental.

## Personality
- calm
- capable
- structured
- transport-oriented
- trustworthy
- slightly vintage
- never playful or neon-heavy

## Core palette
- Canvas: #07111c
- Canvas raised: #0b1724
- Surface: #102131
- Surface soft: #15293b
- Text primary: #f5f1e8
- Text secondary: #b9c5d1
- Accent warm: #e0a85a
- Accent cool: #5b9ed8
- Success: #2fb173
- Warning: #d79b3d
- Danger: #d65353
- Border: rgba(255,255,255,.10)

## Spacing scale
4 / 8 / 12 / 16 / 24 / 32 / 48 / 64

## Radius
- control: 10px
- card: 16px
- hero card: 20px

## Typography
- UI: system sans / Inter-like proportions
- status/time/data: tabular numerals
- headings: strong, compact, no decorative display type required
- avoid excessive uppercase except transport-board labels

## Information hierarchy
1. route / module / primary action
2. time / status / current state
3. operator / source / context
4. secondary help text

## Header
Desktop:
- brand left;
- primary module navigation center;
- utility controls right;
- compact language selector;
- account/menu control.

Mobile:
- compact brand;
- quick module launcher;
- language and account remain secondary;
- no oversized selector.

## Components
- primary navigation tab
- module tile
- status chip
- timetable row
- compact selector
- command button
- utility panel
- alert
- empty state
- loading skeleton
- modal

## Rules
- never use white-on-white or low-contrast controls;
- never rely on color alone for status;
- all actionable controls minimum 44px touch target on mobile;
- avoid unnecessary gradients;
- glass effects only when they improve hierarchy;
- all modules share the same tokens;
- new UI must not introduce one-off colors or spacing unless documented.
