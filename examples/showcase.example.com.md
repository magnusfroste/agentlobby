---
title: "Northwind Rope — every block on one page"
description: "A sample page that uses every Lobby block once, so an agent or a person can see what each one looks like."
theme: aurora
tags: example
---

::banner
Every block on one page. Read the source at [/site.md](/site.md){.primary}
::

::nav{brand="Northwind"}
- How it works → #how
- Compare → #compare
- Prices → #prices
- FAQ → #faq
::

::hero{eyebrow="braided since 1904" image="https://images.unsplash.com/photo-1519999482648-25049ddd37b1?w=1200&q=80" imageAlt="A city of canals and towers at dusk, seen from above"}
# Rope that **holds**.
## Braided in Gothenburg, pull-tested to failure, sold by the metre.

[See prices](#prices){.primary} [How it works](#how){.ghost}
::

::logos{title="Rigged on" align=center}
- Harbour of Gothenburg
- Nordic Sail
- Klippan Yard
- Baltic Ferries
::

::stats{tone=soft}
- value: 120
  label: years of braiding
- value: 4.2 t
  label: tested breaking load
- value: 48 h
  label: from order to dock
::

::features{title="Why sailors pick it" columns=3}
- icon: 🧪
  title: Tested to failure
  body: Every batch is pulled until it breaks, and the number is printed on the tag.
- icon: 🌊
  title: Salt-water proof
  body: Polyester core with a **UV-stable** sheath.
- icon: 📏
  title: Cut to length
  body: Order by the metre; we splice the ends.
::

::steps{id=how title="How it works"}
- title: Pick a diameter
  body: 6 to 24 mm, with the load for each.
- title: Say how long
  body: Any length, cut and whipped.
- title: It ships the next day
  body: Tracked, to any harbour in the Nordics.
::

::two-column{image="https://images.unsplash.com/photo-1500627965408-b5f2c8793f17?w=1200&q=80" imageAlt="A person standing in front of glowing red and white light tubes" reverse=true tone=dark}
## Made for the weather you get
The sheath is braided tight enough to shed water, loose enough to grip wet.
::

::compare{id=compare title="Compared" columns="Northwind, Chandlery rope, Hardware store"}
- row: Breaking load printed on the tag
  values: yes; partial; no
- row: Cut to length
  values: yes; yes; no
- row: Spliced ends
  values: yes; no; no
- row: Price per metre
  values: 38 kr; 45 kr; 22 kr
::

::testimonials{title="From the docks"}
- quote: We re-rigged the whole fleet with it and have not replaced a line since.
  by: Ingrid
  role: Harbour master
- quote: The tag with the tested load is what sold me.
  by: Jonas
  role: Charter skipper
- quote: Next-day delivery to Visby. Every time.
  by: Maja
  role: Boatyard owner
::

::gallery{title="In use" columns=3}
- image: https://images.unsplash.com/photo-1534854638093-bada1813ca19?w=900&q=80
  alt: A swimmer on a pink float in a turquoise pool
  caption: Summer on the water
- image: https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=900&q=80
  alt: A wave rolling onto a sandy beach, seen from above
  caption: Salt water, all year
- image: https://images.unsplash.com/photo-1473116763249-2faaef81ccda?w=900&q=80
  alt: A beach at sunset under a pink sky
  caption: Shore lines
::

::pricing{id=prices title="Prices" tone=soft}
- name: By the metre
  price: 38 kr
  period: /m
  features: Any length; Whipped ends
  cta: Order
  href: mailto:order@example.com
- name: Spliced
  price: 52 kr
  period: /m
  body: The one most boats need.
  features: Everything by the metre; Eye splice on both ends; Load tag
  cta: Order spliced
  href: mailto:order@example.com
  featured: true
::

::cards{title="Guides" columns=3}
- tag: Guide
  title: Choosing a diameter
  body: Load, stretch and grip, in one table.
  href: #prices
  cta: Read →
- tag: Guide
  title: Caring for rope
  body: Rinse, dry, coil — and when to retire it.
  href: #faq
  cta: Read →
- tag: Story
  title: 120 years in Gothenburg
  body: From hemp to polyester.
  cta: Coming soon
::

::quote{by="A customer since 1987" role="Fisherman, Smögen"}
It is the only rope I have never had to think about.
::

::video{src="https://www.youtube.com/watch?v=aqz-KE-bpKQ" title="Sample video"}
A sample video, to show how an embed looks.
::

::faq{id=faq title="Questions"}
- q: Do you ship abroad?
  a: Yes, anywhere in the EU.
- q: Can I return a cut length?
  a: Not a cut one, but an uncut coil within 30 days.
::

::cta{tone=accent}
## Need a quote for a whole fleet?
[Email us](mailto:order@example.com){.primary}
::

::footer{note="Northwind Rope AB · an example page"}
- Source → /site.md
- Contact → mailto:order@example.com
::
