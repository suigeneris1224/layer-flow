# Marketing photos — AI prompt sheet

The marketing site has 13 photo slots (`lib/marketing/photos.ts`). A slot without its own file shows
its `fallback` image if the page gives one, otherwise a branded placeholder.

## One slot must be a real photo, never AI

| Slot | File | Why |
|---|---|---|
| `homeTestimonial` | `home-testimonial.jpg` | It sits beside a named customer's quote. A generated "customer" is a fake testimonial. |

Until a real quote exists, the homepage shows a "Made for Filipino farmers" section in its place, using `homeFarm`.

The About page's "Who's behind it" section uses `aboutFounder`: the real developer, generated from
their own photo as a reference. Never replace it with a stock or stranger's face.

## How to use this sheet (free ChatGPT)

Free ChatGPT allows only a few images a day, and the limit changes over time, so work through the
**priority order** below over a few days. Highest-traffic pages come first.

1. Open a **new chat** for each image, so earlier attempts don't bleed into the next one.
2. Paste: `Generate an image, landscape orientation.` + the **house style** + the slot's prompt.
   Landscape gives 1536×1024. Every slot is sized to be cropped from that, so don't worry that it
   isn't exactly 4:3 or 16:10.
3. Check it against the **rejection checklist**. To fix one detail, reply in the same chat ("same
   image, but the hens should be white"). That's cheaper than starting over.
4. Download it (hover the image → download icon). Save it into `marketing-src/`, renamed to
   the slot's file name with any extension, e.g. `features-hero.png`.
5. Run `npm run photos:optimize`. It center-crops each image to its slot (keeping the subject in
   frame) and writes a compressed JPEG into `public/marketing/`.
6. In `lib/marketing/photos.ts`, set `available: true` for that slot and rewrite its `alt` to describe
   the image you picked. Or tell Claude which ones you added.

### Using Gemini instead

Gemini works too: same house style, same scene lines. Start the message with
`Create an image, landscape 16:9.` Gemini's downloads are often only about 1024px wide, which is
fine. Tell Claude which slot an image is for, and the slot size can be lowered to match it so the
image is never stretched. Use the download button on the image, not a screenshot or "copy image".

Keep the main subject in the **middle 80%** of the frame. The 16:10 and 16:9 slots trim a little off
the top and bottom.

### Priority order

✅ All 12 generated slots done. Only `homeTestimonial` remains, and it needs a real customer photo.

### House style (prepend to every prompt)

> Photorealistic documentary-style photograph of a small-to-medium layer poultry farm in the
> Philippines, Cebu countryside. Open-sided layer house with galvanized wire cages and a corrugated
> metal roof, tropical greenery visible outside. White commercial laying hens with red combs. Soft, natural morning light.
> Calm palette of muted greens, warm neutrals and wood tones. Shallow depth of field, 35mm lens,
> candid, unposed. Filipino farmer in practical work clothes (t-shirt, cap or wide-brim hat, rubber
> boots). Realistic hands and faces. No text, no logos, no watermarks, no signage.

### Rejection checklist

Regenerate if you see any of these:
- Extra or fused fingers, or warped faces or eyes.
- Any lettering: garbled text on sacks, screens or shirts.
- Brown hens or brown eggs (most Philippine layer farms keep white hens laying white eggs), roosters,
  or broiler chickens.
- Snow, pine forests, European barns, red-brick buildings: anything that isn't the tropical Philippines.
- A phone or laptop screen showing a recognizable real app. Keep screens blurred or turned away.
- An overly glossy "stock" look. Natural and slightly imperfect reads as more trustworthy.

---

## Heroes

### `featuresHero` → `features-hero.jpg` · 1200×900 (4:3)
Features page, right side of the hero.
> A Filipino woman farmer in her 40s standing in the aisle of a layer house, holding a smartphone in
> one hand and looking at it as she records the morning egg count. A plastic egg tray full of white
> eggs rests on the cage ledge beside her. Rows of cages with white hens recede into soft focus. The
> phone screen is turned away from the camera.

### `howItWorksHero` → `how-it-works-hero.jpg` · 1024×640 (16:10) · ✅ done
How It Works hero. Done with a white-hen image from Gemini (a farmer in a bucket hat on her phone).
The slot is sized at 1024×640 to match Gemini's 1024px output, so it's cropped, not upscaled. A "Today's laying rate" card is overlaid
in the **bottom-right corner**, over the hens, clear of the farmer.

### `pricingHero` → `pricing-hero.jpg` · 1200×900 (4:3, shown cropped to 16:10)
Pricing page hero.
> A smiling Filipino farmer in his 50s standing outside the layer house, holding a full 30-egg tray of
> fresh white eggs at chest height, looking warmly at the camera. Behind him, out of focus, the
> open-sided layer house and tropical trees. Relaxed, proud, approachable.

### `aboutHero` → `about-hero.jpg` · 1200×900 (4:3)
About page hero ("Built for farmers, with farmers").
> A young Filipino farmer in his 20s gently holding a white laying hen against his chest with both
> hands, smiling, standing inside a clean layer house. Cages and hens softly blurred behind him.
> Warm, caring, genuine.

### `blogHero` → `blog-hero.jpg` · 1200×675 (16:9)
Blog index hero.
> Close-up of white laying hens in wire cages leaning out to eat from a long galvanized feed trough,
> layer mash visible in the trough. Shallow depth of field with one hen in sharp focus. Soft morning
> light, no people.

## Homepage and About (1152×648, 16:9)

### `homeFarm` → `home-farm.jpg` ✅ done
Homepage "Made for Filipino farmers" section, beside the commitments. Falls back to the How It Works hero.
> Wide shot from outside a long open-sided layer house in the Cebu countryside on a bright morning:
> corrugated metal roof, wooden posts, rows of wire cages with white hens visible inside, stacked
> plastic egg trays by the entrance, coconut palms and banana plants around it. No people.

### `aboutFounder` → `about-founder.jpg` ✅ done
About page, "Who's behind it". The developer at a laptop on a farmhouse porch, made in Gemini from
their own photo as a reference.

## Blog thumbnails (1152×648, 16:9, matching Gemini's output) ✅ done

Shown as 16:10 cards and as the wide image at the top of each article. Keep the subject centered.

### `blogLayingRate` → `blog-laying-rate.jpg`
"How to Calculate Laying Rate".
> A plastic egg tray filled with freshly collected white eggs resting on the ledge of a wire cage, a
> white hen in soft focus just behind it. Morning light, close-up, no people.

### `blogCostPerEgg` → `blog-cost-per-egg.jpg`
"How to Calculate Your Cost per Egg and Cost per Tray".
> A wooden table in a simple farm office: stacked egg trays of white eggs, an open paper notebook with
> handwritten columns of figures (illegible, blurred), a basic calculator and a pen. Natural window
> light, no people, no readable text.

### `blogFeedCost` → `blog-feed-cost.jpg`
"How to Track Layer Feed Costs When You Buy by the Sack".
> Several plain woven polypropylene feed sacks stacked on wooden pallets in a small farm storeroom, one
> sack open with layer mash visible, a metal scoop resting on top. Plain sacks with no printing or
> logos. Soft side light, no people.

### `blogEggSizes` → `blog-egg-sizes.jpg`
"Pricing Eggs by Size and by the Tray".
> Overhead flat-lay of four plastic egg trays side by side on a wooden table, each filled with white
> eggs of a visibly different size, from small to jumbo. Clean, orderly, natural light, no labels, no
> people.

### `blogOperatingProfit` → `blog-operating-profit.jpg`
"Reading Your Farm's Estimated Operating Profit".
> A Filipino woman farmer sitting at a simple wooden table on the porch of a farmhouse, reviewing
> numbers on a laptop with a cup of coffee beside her. The laptop screen is angled away or blurred. A
> layer house is visible in the soft-focus background. Calm late-afternoon light.
