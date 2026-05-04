# Firebase Realtime DB Schema

Overview of main top-level nodes and example documents for the UAF Community Garden app.

Top-level nodes:
- cms
- plots
- gardeners
- returning-gardeners
- admins

Example structures

cms (single object storing editable site content)
{
  "welcome": "Welcome to the UAF Community Garden!",
  "prices": "$25 per plot for students, $40 per plot for staff/faculty",
  "rules": [ { "text": "Garden Rules PDF", "url": "https://..." } ],
  "resources": [ { "text": "Soil Guide", "url": "https://..." } ]
}

plots (map of plotId -> metadata)
{
  "plot-1": {
    "name": "Plot 1",
    "status": "available",    // available | reserved | registered | verified
    "registeredGardenerId": null,
    "paymentVerified": false,
    "svgId": "p1",            // matches an SVG region id for the map
    "meta": { "size": "10x10", "notes": "near shed" }
  }
}

gardeners (registrations)
{
  "gardener-jane-example-edu": {
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane@example.edu",
    "plotId": "plot-1",
    "plots": ["plot-1", "plot-8"],
    "partners": [ { "name": "Pat", "email": "pat@example.com" } ],
    "paymentVerified": false,
    "createdAt": "2026-04-19T21:00:00Z"
  }
}

returning-gardeners (interest submissions)
{
  "r-0001": {
    "firstName": "John",
    "lastName": "Appleseed",
    "affiliation": "Student",
    "studentType": "Undergraduate",
    "hadPlotLastYear": true,
    "plotNumbers": "12",
    "forgotPlotNumber": false,
    "sharingPlot": true,
    "partner": { "name": "Alex", "email": "alex@example.com" },
    "agreeRules": true,
    "agreeLiability": true,
    "createdAt": "2026-04-19T21:00:00Z"
  }
}

admins
{
  "<uid>": { "email": "admin@example.edu", "role": "admin" }
}

Notes
- Use the svgId on each plot to wire the interactive SVG map to plot metadata.
- Keep cms and plots readable by public; restrict writes to admins where appropriate.
- Gardener IDs are normalized from email (`gardener-<email-slug>`) so repeat registrations for the same email are merged into one gardener record with multiple `plots`.
- Gardeners & returning-gardeners can be written by anonymous users (public write), but admin-only reads are enforced for managing registrations.
