import { layingRate } from "@/lib/domain/calculations";
import { formatNumber, formatPercent } from "@/lib/format";
import { A, Callout, ExampleTable, Formula, Prose } from "../prose";

const HENS = 1_000;
const EGGS = 870;
const WEEK_EGGS = [870, 864, 872, 858, 866, 861, 869];
const weekTotal = WEEK_EGGS.reduce((sum, eggs) => sum + eggs, 0);

export default function LayingRatePost() {
  return (
    <Prose>
      <p>
        If you only track one production number on a layer farm, make it the laying rate. It tells
        you, in a single percentage, how hard your flock is working — and because it moves before
        your sales do, it&apos;s usually the first place a problem shows up.
      </p>

      <h2>What is laying rate?</h2>
      <p>
        Laying rate (also called <strong>hen-day egg production</strong>, or HDEP) is the share of
        the hens present on a given day that laid an egg. A rate of 85% means that for every 100
        hens in the house, you collected 85 eggs.
      </p>
      <Formula>Laying rate (%) = eggs collected ÷ hens present × 100</Formula>
      <p>
        Count <strong>all</strong> eggs collected, including broken and dirty ones — they were still
        laid. Use the number of hens actually alive in the house that day, not the number you
        originally placed. That&apos;s what separates hen-day production from{" "}
        <strong>hen-housed</strong> production, which divides by the original count and so also
        reflects mortality.
      </p>

      <h2>A worked example</h2>
      <p>This morning a house with {formatNumber(HENS)} hens produced {formatNumber(EGGS)} eggs:</p>
      <ExampleTable
        rows={[
          ["Hens present", formatNumber(HENS)],
          ["Eggs collected", formatNumber(EGGS)],
          ["Laying rate", formatPercent(layingRate(EGGS, HENS))],
        ]}
      />
      <p>
        Daily rates bounce around a little, so it&apos;s worth looking at the week too. Add up the
        week&apos;s eggs and divide by hens × days. Over seven days this house collected{" "}
        {formatNumber(weekTotal)} eggs, for a weekly laying rate of{" "}
        <strong>{formatPercent(layingRate(weekTotal, HENS * WEEK_EGGS.length))}</strong>.
      </p>

      <h2>What&apos;s a healthy laying rate?</h2>
      <p>
        It depends heavily on the age of the flock. Modern commercial layers typically start laying
        around 18–20 weeks of age, climb quickly to a peak above 90% in their first months of lay,
        then decline gradually over the following year. A flock late in lay can be perfectly healthy
        at 70% or less.
      </p>
      <p>
        That&apos;s why a single number on its own means little. Compare against two things instead:
      </p>
      <ul>
        <li>
          <strong>Your breed&apos;s production guide.</strong> Hatcheries publish expected rates by
          week of age for their strains. Ask your supplier for the one that matches your birds.
        </li>
        <li>
          <strong>The same flock last week.</strong> A gradual decline is normal. A sudden one is
          not.
        </li>
      </ul>

      <h2>Warning signs worth acting on</h2>
      <p>
        A drop of several percentage points over two or three days, with no change in the
        flock&apos;s age, is a signal to check the house the same day. Common causes include:
      </p>
      <ul>
        <li>Water supply problems — blocked nipples or an empty tank.</li>
        <li>A change in feed: a new supplier, a new formulation, or simply not enough of it.</li>
        <li>Heat stress during hot afternoons, especially in open-sided houses.</li>
        <li>Disruptions to lighting hours, or disturbances such as loud noise or predators.</li>
        <li>Disease — which is a question for your veterinarian, not a spreadsheet.</li>
      </ul>
      <Callout title="Tip: record the same way every day">
        <p>
          Collect and count at consistent times, and record broken and dirty eggs as they happen.
          Laying rate is only as good as the counts behind it — a missed afternoon collection looks
          exactly like a production drop.
        </p>
      </Callout>

      <h2>Tracking laying rate in LayerFlow</h2>
      <p>
        When you record the day&apos;s collection in LayerFlow, the laying rate is calculated for
        you from the hens present in that flock, and charted over time so a decline stands out.
        Alerts can flag a production drop before it becomes a habit. See{" "}
        <A href="/how-it-works">how it works</A>, or read next:{" "}
        <A href="/blog/how-to-calculate-cost-per-egg">how to calculate your cost per egg</A>.
      </p>
    </Prose>
  );
}
