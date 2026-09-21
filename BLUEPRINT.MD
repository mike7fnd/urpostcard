# URPOSTCARD APP — Production Web App Build

Build a production-ready, mobile-first web application centered around one simple idea:

> **Send a real-feeling postcard to another person, and watch it physically travel across the world to their pinned location before they receive it.**

This should NOT feel like a typical messaging app, social network, dashboard, or generic AI-generated website. The entire product should feel like a **minimal digital recreation of sending a physical postcard**.

## 1. Core Technology

Use the existing project architecture where possible.

* Next.js
* TypeScript
* Supabase

  * Authentication
  * PostgreSQL database
  * Row Level Security
  * Storage if needed
  * Realtime only where genuinely useful
* Tailwind CSS
* Modern React architecture
* Responsive from mobile → tablet → desktop
* Production-ready implementation
* No mock data
* No fake APIs
* No hardcoded users, locations, messages, distances, delivery times, or postcard states
* All important state must persist through Supabase

Before implementing anything, inspect the existing project and understand its current architecture, routing, components, authentication, Supabase setup, styling system, and database conventions. Extend the existing architecture rather than unnecessarily rebuilding it.

---

# 2. Product Philosophy

The product should feel like:

**physical postcard + Apple-level simplicity + Google Earth-like geographic experience + subtle cinematic animation.**

Avoid:

* Generic SaaS dashboards
* Excessive cards
* Excessive borders
* Heavy gradients
* Glassmorphism everywhere
* Huge text
* Excessive shadows
* Gamification
* Social-media-style feeds
* Cluttered navigation
* Generic chatbot-like UI
* Overly colorful UI

The interface should be extremely minimal.

Use whitespace, typography, physical textures, motion, and geography to create the personality.

The postcard itself should be the primary visual object.

---

# 3. Mobile-First Is the Primary Experience

Design the application as if it were originally created for a phone.

Desktop should feel like an expanded version of the mobile experience—not a completely different product.

### Mobile

Use:

* Full-screen experiences
* Thumb-friendly controls
* Bottom navigation where appropriate
* Gesture-driven interactions
* Large touch targets
* Minimal chrome
* Edge-to-edge map experiences
* Smooth transitions
* Safe-area support
* Reduced UI during animations

### Desktop

Use the additional screen space intelligently.

For example:

* Globe/map can occupy the majority of the viewport
* Postcard can float above the map
* Information can appear in subtle floating controls
* Do NOT convert everything into cards and sidebars

---

# 4. Authentication

Implement real Supabase authentication.

Users should be able to:

* Create an account
* Sign in
* Sign out
* Recover their account
* Manage their profile

Each user must have:

* Unique username
* Display name
* Profile image/avatar (optional)
* Pinned geographic location
* Latitude
* Longitude
* Location display name
* Account creation timestamp

The username should be the primary identity used when sending postcards.

---

# 5. Mandatory Location Setup

Location is a fundamental part of the product.

After registration, guide the user through a beautiful onboarding experience:

### "Where should your postcards find you?"

Show a map/globe where the user can select their location.

The user should be able to:

* Search for a place
* Move around the map
* Drop a pin
* Confirm their location

Do not force the user to expose their exact residential address.

Store only the location precision necessary for the postcard journey.

The user should clearly understand that their pinned location is used to calculate postcard travel distance and delivery time.

Once confirmed, save:

```text
latitude
longitude
location_name
```

to Supabase.

Allow the user to change their pinned location later from Settings/Profile.

---

# 6. 3D Globe / World Map

The globe is a major part of the product.

Implement a performant interactive world visualization capable of:

* 3D globe presentation
* Zooming
* Panning/rotation
* Sender location
* Receiver location
* Great-circle route
* Animated postcard journey

Use an appropriate production-ready mapping/globe technology compatible with Next.js.

The map should feel cinematic rather than like a conventional navigation map.

During normal usage, keep the map visually quiet.

The globe should support:

* Dark/light visual treatment depending on application theme
* Minimal geographic labels
* Subtle terrain/land visualization
* Location markers
* Route visualization

Do not make the map visually noisy.

---

# 7. Sending a Postcard

The main action should be extremely simple.

A user should be able to choose:

**Send a postcard**

Then:

### Step 1 — Recipient

Search for another registered user by username.

Example:

```text
@anna
```

Show the recipient's display name and general pinned location.

Never expose unnecessary private location information.

---

### Step 2 — Choose Postcard

Create a small collection of beautiful postcard designs.

Each postcard should visually resemble a physical postcard.

Examples:

* Minimal white postcard
* Vintage paper
* Travel postcard
* Soft pastel postcard
* Film photograph postcard
* Seasonal postcard

Do not make these look like generic UI cards.

They should look like actual physical paper.

Use realistic:

* Paper texture
* Subtle grain
* Slight shadows
* Imperfections
* Printed typography
* Physical edges

Keep the designs elegant and minimal.

---

# 8. Writing the Message

The sender writes:

```text
To: @username

[message]

From: @username
```

Keep the writing experience extremely clean.

No unnecessary toolbar.

The user should feel like they are physically writing on a postcard.

Support:

* Character limit
* Sender username automatically populated
* Recipient automatically populated
* Preview mode

The postcard should update visually as the user types.

---

# 9. Distance Calculation

Once sender and recipient are selected, calculate the geographic distance between their pinned locations.

Use a proper geographic distance calculation such as great-circle distance / Haversine calculation.

Do NOT calculate distance using straight pixel distance on the map.

Store:

```text
origin_latitude
origin_longitude
destination_latitude
destination_longitude
distance_km
```

on the postcard shipment.

---

# 10. Postcard Travel Time

The postcard should NOT arrive instantly.

The concept is:

> **The farther away the recipient is, the longer the postcard takes to travel.**

Create a deterministic delivery calculation based on:

* Geographic distance
* Configurable virtual travel speed
* Optional minimum/maximum delivery duration
* Optional random atmospheric variation if appropriate

Example conceptual model:

```text
distance = geographic distance

travel_duration =
distance / virtual_postcard_speed
```

The actual calculation should be centralized in a service/function rather than duplicated throughout the application.

Important:

The delivery time must be persisted on the server.

Do NOT rely on a frontend timer.

The server should store:

```text
sent_at
estimated_delivery_at
delivered_at
status
```

Possible states:

```text
draft
preparing
in_transit
arrived
opened
cancelled
```

---

# 11. The Magical Send Interaction

This is one of the most important experiences in the entire application.

When the sender finishes writing:

Show the completed physical postcard.

The primary action should NOT simply be:

> "Send"

Instead, create a gesture:

### "Swipe to send"

The user grabs the postcard and swipes upward.

The postcard should physically follow the user's finger.

Use realistic motion:

* Slight rotation
* Momentum
* Drag resistance
* Depth
* Shadow movement
* Subtle lift from the surface

When released above the threshold:

The postcard leaves the interface.

Do not immediately switch screens.

The animation should make the user feel like they actually launched the postcard.

---

# 12. Transition Into the Globe

After the swipe:

The UI transforms into the world.

The postcard becomes a physical object traveling above the globe.

Camera:

1. Starts near the sender
2. Pulls outward
3. Reveals the globe
4. Shows the route
5. Follows the postcard
6. Gradually transitions toward the recipient

The route should follow a realistic great-circle path rather than a flat straight line.

The postcard should visibly travel along the route.

Create a subtle atmospheric trail.

Do NOT make it look like a spaceship.

It should still feel like a postcard traveling through the world.

---

# 13. Travel Animation

The journey is the emotional centerpiece.

The postcard should appear to physically travel.

Use:

* Camera movement
* Globe rotation
* Perspective
* Route animation
* Postcard rotation
* Depth
* Subtle motion blur
* Atmospheric effects
* Carefully timed easing

The animation should feel cinematic but restrained.

Avoid:

* Explosion effects
* Excessive particles
* Neon trails
* Arcade-game aesthetics
* Overly dramatic transitions

Think:

**physical object + geography + cinematic motion.**

---

# 14. Real Delivery State

The animation is not the source of truth.

The database is.

For every postcard, persist its actual delivery state.

Example:

```text
id
sender_id
receiver_id
postcard_template_id
message
origin_latitude
origin_longitude
destination_latitude
destination_longitude
distance_km
travel_duration
sent_at
estimated_delivery_at
delivered_at
opened_at
status
created_at
updated_at
```

The application should calculate the current state from persisted server data.

If the user closes the browser during the journey and returns later, the postcard should still be in the correct state.

Do NOT depend on the browser remaining open.

---

# 15. Receiving a Postcard

When the recipient's delivery time has been reached:

The postcard becomes available.

The recipient should receive a subtle notification indicating that a postcard has arrived.

But the notification should preserve the magic.

Example:

> "A postcard has arrived for you."

Do not reveal the message in the notification.

---

# 16. Receiving Animation

When the recipient opens the arrival experience:

Create a beautiful physical animation.

The postcard should appear from the top portion of the screen and move toward the user.

Conceptually:

```text
        postcard
           ↓
           ↓
           ↓
      [receiver]
```

It should feel as if the postcard has physically arrived at the phone.

Use:

* Perspective
* Rotation
* Depth
* Shadow
* Momentum
* Slight bounce
* Paper movement

Then settle the postcard naturally into the interface.

Only after the animation finishes should the user be able to read the message.

---

# 17. Opening the Postcard

The recipient can tap the postcard.

It should flip/open into a readable state.

Show:

```text
From @username

$message
```

Keep the message area beautiful and calm.

The physical postcard should remain visually important.

Include subtle metadata such as:

```text
Sent from Bongabong
Arrived from 1,247 km away
```

Do not expose the exact private coordinates of either user.

---

# 18. Postcard History

Users should have a simple postcard history.

Two primary sections:

### Sent

Postcards the user has sent.

Show:

* Recipient
* Postcard preview
* Destination
* Distance
* Status
* Sent date
* Estimated/actual arrival

### Received

Postcards received.

Show:

* Sender
* Postcard preview
* Origin
* Distance
* Arrival date
* Read/unread state

Keep this extremely visual.

Avoid creating a conventional dashboard.

---

# 19. Postcard Detail

Opening a postcard from history should restore the journey context.

Show:

* Physical postcard
* Sender
* Recipient
* Origin
* Destination
* Distance
* Timeline
* Delivery status

If delivered, allow the user to replay the journey.

The replay should be optional.

---

# 20. Database Architecture

Create a clean normalized Supabase schema.

At minimum:

### profiles

```text
id
username
display_name
avatar_url
latitude
longitude
location_name
location_precision
created_at
updated_at
```

### postcard_templates

```text
id
name
description
image_url
design_config
is_active
created_at
```

### postcards

```text
id
sender_id
recipient_id
template_id
message
origin_latitude
origin_longitude
destination_latitude
destination_longitude
origin_location_name
destination_location_name
distance_km
travel_duration_seconds
sent_at
estimated_delivery_at
delivered_at
opened_at
status
created_at
updated_at
```

### notifications

```text
id
user_id
type
postcard_id
title
body
read_at
created_at
```

Add indexes for:

* username
* sender_id
* recipient_id
* status
* estimated_delivery_at
* created_at

Use UUIDs.

---

# 21. Supabase Security

This is production software.

Implement proper Row Level Security.

Users should only be able to:

* Read their own profile
* Update their own profile
* Read postcards they sent or received
* Create postcards as themselves
* Update only permitted postcard fields
* Read their own notifications
* Mark their own notifications as read

Do NOT trust client-supplied:

* sender_id
* delivery status
* delivery timestamp
* distance
* travel duration

Where appropriate, calculate/validate these server-side.

Never expose Supabase service-role credentials to the client.

---

# 22. Username System

Usernames must be unique.

Implement:

* Username validation
* Case normalization
* Reserved username protection
* Username search
* Duplicate prevention

Example:

```text
@mike
@anna
@kio
```

Searching should be fast and indexed.

---

# 23. Privacy

Location is sensitive.

Do not expose:

* Exact coordinates
* Exact address
* Private map pin to arbitrary users

The recipient may see a general location such as:

```text
Bongabong, Oriental Mindoro
```

rather than:

```text
Exact latitude / longitude
```

The globe animation can use the coordinates internally without exposing them as raw data.

---

# 24. Navigation

Keep navigation minimal.

Possible mobile navigation:

```text
Home
Send
Postcards
Profile
```

But avoid forcing every screen into persistent navigation.

During immersive postcard animations, hide navigation completely.

Desktop can use a minimal floating navigation system.

---

# 25. Home Screen

The home screen should immediately communicate the concept.

Possible structure:

```text
Good evening, Mike.

You have
2 postcards traveling

[Large globe]

        🌎

1 postcard arriving soon

[Send a postcard]
```

But keep it even simpler if the visual design communicates the idea without text.

The home screen should feel like entering a quiet world rather than opening a dashboard.

---

# 26. Visual Design System

Use:

* Inter or similarly clean modern typography
* Large whitespace
* Very restrained color palette
* Off-white / paper backgrounds
* Near-black typography
* Subtle accent color
* Realistic paper textures
* Soft shadows
* Gentle borders only where needed
* Large rounded geometry where appropriate

The design should feel inspired by:

* Apple
* high-end editorial design
* physical stationery
* modern travel applications
* minimalist photography

But do NOT copy any existing product.

---

# 27. Physicality

The most important design principle:

## Everything should feel physical.

The postcard has:

* Weight
* Surface
* Depth
* Thickness
* Shadow
* Momentum
* Rotation
* Position
* Direction

Buttons can remain digital and minimal.

The postcard itself should behave like an object.

When dragging:

```text
finger → postcard follows
```

When releasing:

```text
postcard → momentum → flight
```

When arriving:

```text
postcard → enters screen → settles
```

When opening:

```text
postcard → flip → message
```

---

# 28. Animation Principles

Use modern animation tooling such as Framer Motion / Motion or an appropriate WebGL animation system where necessary.

Animations must be:

* Smooth
* Interruptible where appropriate
* Gesture-aware
* Physics-inspired
* GPU-friendly
* Respectful of reduced-motion preferences

Implement:

* spring physics
* velocity-aware gestures
* interpolation
* easing
* 3D transforms
* depth
* opacity transitions

Avoid animating huge numbers of DOM elements unnecessarily.

---

# 29. Performance

This must work well on ordinary mobile devices.

Important:

* Lazy-load the 3D globe
* Do not initialize WebGL before necessary
* Dynamically import heavy map/globe components
* Optimize postcard assets
* Use responsive image formats
* Avoid unnecessary Supabase requests
* Cache appropriate data
* Use server-side validation
* Avoid polling when unnecessary
* Use Realtime only where it provides actual value
* Keep animations GPU-friendly
* Respect mobile memory constraints

The initial page should remain lightweight even though the application contains sophisticated animation.

---

# 30. Responsive Behavior

Test at minimum:

### Mobile

```text
320px
375px
390px
430px
```

### Tablet

```text
768px
1024px
```

### Desktop

```text
1280px
1440px
1920px
```

The postcard should never become awkwardly oversized.

The globe should adapt naturally to viewport dimensions.

---

# 31. Accessibility

Implement proper accessibility.

Include:

* Keyboard navigation
* Visible focus states
* Semantic HTML
* Screen-reader labels
* Sufficient contrast
* Reduced-motion support
* Accessible form validation
* Accessible buttons
* Touch targets of appropriate size

For users who prefer reduced motion, provide a simplified transition rather than removing functionality.

---

# 32. Error States

Design beautiful minimal error states.

Examples:

* Recipient not found
* Invalid username
* Location not configured
* Postcard failed to send
* Network unavailable
* Globe failed to initialize
* Delivery unavailable
* Session expired

Do not show ugly generic browser errors.

Keep errors human and concise.

---

# 33. Empty States

Create custom illustrations matching the application's physical postcard aesthetic.

Examples:

### No sent postcards

```text
Your postcards are waiting to travel.
```

### No received postcards

```text
No postcards have reached you yet.
```

The illustrations should feel like paper/postcard artwork rather than generic SaaS SVGs.

---

# 34. Important Technical Rule

The animation must NEVER determine application state.

For example:

Bad:

```text
animation finishes → mark postcard delivered
```

Correct:

```text
server determines delivery timestamp
        ↓
application detects delivered state
        ↓
animation represents that state
```

Animations are presentation.

Supabase is the source of truth.

---

# 35. Delivery Logic

Implement a central delivery service.

Conceptually:

```text
create postcard
        ↓
validate sender
        ↓
validate recipient
        ↓
retrieve locations
        ↓
calculate distance
        ↓
calculate travel duration
        ↓
create postcard
        ↓
status = in_transit
        ↓
estimated_delivery_at = sent_at + duration
        ↓
when current time >= estimated_delivery_at
        ↓
status = arrived
```

Do not rely on a browser being open.

Implement the appropriate server-side mechanism for transitioning overdue postcards into the delivered/arrived state.

Make the delivery calculation deterministic and testable.

---

# 36. Future-Ready Architecture

Structure the application so future features can be added without rewriting the postcard system.

Potential future features:

* Postcard collections
* Multiple postcard styles
* Seasonal postcards
* Digital stamps
* Postcard reactions
* Private/public postcards
* Scheduled postcards
* Birthday delivery
* Anniversary delivery
* Postcard archive
* Journey replay
* Globe activity
* Friends/following
* Postcard notifications
* Premium postcard designs

Do NOT implement these unless required now.

Build the architecture so they can be added later.

---

# 37. Production Quality Requirements

Before considering the implementation complete:

### Authentication

* Registration works
* Login works
* Logout works
* Session persistence works
* Protected routes work

### Location

* Location can be configured
* Location persists
* Location can be changed
* Privacy is respected

### Sending

* Recipient search works
* Postcard creation works
* Message persists
* Distance calculation works
* Delivery calculation works
* Send gesture works

### Journey

* Globe loads
* Sender location works
* Recipient location works
* Route works
* Journey animation works
* Reopening the browser preserves state

### Receiving

* Delivery state is correct
* Notification works
* Arrival animation works
* Postcard can be opened
* Message is readable
* Opened state persists

### Security

* RLS enabled
* Unauthorized access blocked
* Client cannot forge delivery state
* Service credentials never reach browser

### Performance

* Mobile performance tested
* Globe lazy-loaded
* Images optimized
* No unnecessary requests
* Animations remain smooth

---

# 38. Final UX Standard

The finished product should communicate this feeling:

> **"I wrote something for someone I care about, sent it into the world, watched it travel across the planet, and eventually it physically arrived at their phone."**

That emotional journey is more important than adding lots of features.

Do not build a dashboard with a postcard feature.

Build a **postcard experience that happens to have an application around it.**

Prioritize:

**physicality → emotion → geography → simplicity → reliability.**

Before writing large amounts of code, inspect the existing project and produce a concise implementation plan covering:

1. Existing architecture
2. Required database migrations
3. Required Supabase policies
4. Required pages/routes
5. Required components
6. Globe/map technology
7. Animation architecture
8. Delivery-state architecture
9. Security considerations
10. Performance considerations

Then implement the system incrementally.

Do not leave placeholder implementations where a production implementation is expected.
