import { costPerEgg, costPerTray, EGGS_PER_TRAY, operatingCostsFromExpenses } from "@/lib/domain/calculations";
import { formatCurrency, formatNumber } from "@/lib/format";
import { A, Callout, ExampleTable, Formula, Prose } from "../prose";

const FEED = 95_000;
const OTHER = [
  { label: "Labor", amount: 12_000 },
  { label: "Electricity and water", amount: 3_800 },
  { label: "Vaccines and medicine", amount: 2_900 },
  { label: "Egg trays and packaging", amount: 2_400 },
  { label: "Transport and fuel", amount: 3_200 },
];
const EGGS = 19_560;
const totalCosts = operatingCostsFromExpenses(
  FEED,
  OTHER.map((row) => ({ amount: row.amount, category: "OTHER" }))
);

export default function CostPerEggPost() {
  return (
    <Prose>
      <p>
        You can&apos;t set a sensible egg price, or know whether a month was a good one, without
        knowing what each egg costs you to produce. The good news: the calculation is simple. The
        hard part is collecting the numbers that go into it.
      </p>

      <h2>The formula</h2>
      <Formula>Cost per egg = total operating costs ÷ eggs produced</Formula>
      <Formula label="And per tray">Cost per tray = cost per egg × {EGGS_PER_TRAY}</Formula>
      <p>
        Use the same period for both numbers — a week or a month works well. A single day is too
        noisy, because expenses like a feed delivery or a vaccine round land on one day but cover
        many.
      </p>

      <h2>What counts as an operating cost?</h2>
      <p>Include the costs of running the farm day to day:</p>
      <ul>
        <li>
          <strong>Feed</strong> — usually the largest cost by far. Count the feed actually used,
          not just what was bought.
        </li>
        <li>Labor, including wages and allowances for farm staff.</li>
        <li>Electricity and water.</li>
        <li>Vaccines, vitamins, and medicine.</li>
        <li>Egg trays, packaging, and transport to buyers.</li>
        <li>Repairs and supplies for the house.</li>
      </ul>
      <p>
        Leave out depreciation, loan payments, and money the owner takes for personal use. They
        matter, but they belong in a different number — see{" "}
        <A href="/blog/reading-your-farms-operating-profit">
          reading your farm&apos;s operating profit
        </A>
        .
      </p>
      <Callout title="Don't count feed twice">
        <p>
          If you track feed usage separately (kilos used per day), don&apos;t also add the feed
          purchase receipts to your expenses for the same period. Pick one — usage is more accurate
          — or you&apos;ll overstate your costs.
        </p>
      </Callout>

      <h2>A worked example</h2>
      <p>Here&apos;s one month on a farm of about 850 hens:</p>
      <ExampleTable
        rows={[
          ["Feed used", formatCurrency(FEED)],
          ...OTHER.map((row): [string, string] => [row.label, formatCurrency(row.amount)]),
          ["Total operating costs", formatCurrency(totalCosts)],
          ["Eggs produced", formatNumber(EGGS)],
          ["Cost per egg", formatCurrency(costPerEgg(totalCosts, EGGS))],
          ["Cost per tray", formatCurrency(costPerTray(totalCosts, EGGS))],
        ]}
      />
      <p>
        Every tray this farm sells for less than{" "}
        <strong>{formatCurrency(costPerTray(totalCosts, EGGS))}</strong> loses money, before the
        owner has paid themselves anything.
      </p>

      <h2>Using the number</h2>
      <ul>
        <li>
          <strong>Set a price floor.</strong> Your cost per tray is the minimum you can sell a tray
          for over time. Prices for different egg sizes should average out above it — see{" "}
          <A href="/blog/pricing-eggs-by-size-and-tray">pricing eggs by size and tray</A>.
        </li>
        <li>
          <strong>Watch the trend.</strong> Cost per egg rises when feed prices go up, but also when
          laying rate falls — the same costs spread over fewer eggs. If it climbs, check both.
        </li>
        <li>
          <strong>Compare flocks.</strong> Older flocks usually cost more per egg. Seeing by how
          much helps you decide when replacing a flock pays off.
        </li>
      </ul>

      <h2>Cost per egg in LayerFlow</h2>
      <p>
        LayerFlow works out cost per egg and cost per tray from the feed usage and expenses you
        record, for any period you choose — counting feed once, from usage. See the{" "}
        <A href="/features">full feature list</A>, or{" "}
        <A href="/signup">start free</A>.
      </p>
    </Prose>
  );
}
