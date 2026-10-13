import { costPerTray, EGGS_PER_TRAY, roundMoney } from "@/lib/domain/calculations";
import { formatCurrency, formatPercent } from "@/lib/format";
import { A, Callout, Formula, Prose } from "../prose";

/** Illustrative only -- clearly labelled as such in the copy. */
const MIX = [
  { size: "Small", share: 0.15, price: 200 },
  { size: "Medium", share: 0.3, price: 215 },
  { size: "Large", share: 0.3, price: 230 },
  { size: "Extra Large", share: 0.18, price: 245 },
  { size: "Jumbo", share: 0.07, price: 260 },
];
const averageTrayPrice = roundMoney(MIX.reduce((sum, row) => sum + row.share * row.price, 0));
// Same example farm as the cost-per-egg article, so the two guides agree.
const COST_PER_TRAY = costPerTray(119_300, 19_560);

export default function EggPricingPost() {
  return (
    <Prose>
      <p>
        In the Philippines, table eggs are usually graded by size and sold by the tray of{" "}
        {EGGS_PER_TRAY}. Bigger eggs command higher prices — but your cost to produce them is
        roughly the same per egg. That makes your size mix, and how you price each size, a real
        lever on your farm&apos;s income.
      </p>

      <h2>Sort by weight, consistently</h2>
      <p>
        Sizes are graded by the weight of the egg. Common labels run from Small through Medium,
        Large, and Extra Large up to Jumbo, and some buyers use additional grades below Small. Agree
        the weight bands with your regular buyers, and weigh a sample regularly so your graders stay
        consistent — a tray of &quot;Large&quot; that&apos;s really mixed sizes costs you trust.
      </p>
      <p>
        As hens age, their eggs tend to get bigger while the number of eggs falls. So expect your
        size mix to shift over a flock&apos;s life — and your average price per tray with it.
      </p>

      <h2>Know your cost per tray first</h2>
      <p>
        Before you price anything, know what a tray costs you to produce. If you haven&apos;t
        worked it out yet, start with{" "}
        <A href="/blog/how-to-calculate-cost-per-egg">how to calculate your cost per egg</A>.
        That&apos;s your floor: across all sizes, you need to sell above it.
      </p>

      <h2>Work out your average price per tray</h2>
      <Formula>Average tray price = Σ (share of eggs in each size × tray price for that size)</Formula>
      <p>
        Here&apos;s an <strong>illustrative</strong> example. The prices below are made up for the
        sake of the arithmetic — egg prices vary widely by region and season, so use what your
        buyers actually pay.
      </p>
      <div className="scroll-x-flush rounded-xl border border-border bg-surface">
        <table className="min-w-[22rem]">
          <thead>
            <tr>
              <th>Size</th>
              <th className="text-right">Share of eggs</th>
              <th className="text-right">Tray price</th>
            </tr>
          </thead>
          <tbody>
            {MIX.map((row) => (
              <tr key={row.size}>
                <td>{row.size}</td>
                <td className="text-right tabular">{formatPercent(row.share * 100, 0)}</td>
                <td className="text-right tabular">{formatCurrency(row.price)}</td>
              </tr>
            ))}
            <tr>
              <td className="font-semibold text-foreground">Average</td>
              <td className="text-right tabular">100%</td>
              <td className="text-right font-semibold tabular text-foreground">
                {formatCurrency(averageTrayPrice)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        With a cost of {formatCurrency(COST_PER_TRAY)} per tray, this farm earns about{" "}
        <strong>{formatCurrency(roundMoney(averageTrayPrice - COST_PER_TRAY))}</strong> per tray on
        average — but notice that its Small eggs earn far less than its Jumbo eggs. If the mix
        shifted toward smaller eggs, its margin would shrink even though the prices hadn&apos;t
        changed.
      </p>

      <h2>Practical pricing tips</h2>
      <ul>
        <li>
          <strong>Review prices when costs move.</strong> A feed price increase raises your cost per
          tray straight away. Recheck your margin per size, not just the average.
        </li>
        <li>
          <strong>Price broken and dirty eggs separately</strong>, or not at all — and record them,
          so they don&apos;t silently drag down your numbers.
        </li>
        <li>
          <strong>Know who owes you.</strong> Selling on credit to regular customers is common; keep
          a running balance so a good month on paper is also a good month in the bank.
        </li>
      </ul>
      <Callout title="Tip: price by tray, track by egg">
        <p>
          Most buyers think in trays, but your costs and production are counted in eggs. Keeping
          both, and converting at {EGGS_PER_TRAY} eggs per tray, avoids rounding errors creeping in.
        </p>
      </Callout>

      <h2>Sizes and pricing in LayerFlow</h2>
      <p>
        LayerFlow records each day&apos;s collection by size, keeps egg stock per size, and lets you
        set a tray price for each one. Sales can be recorded by the tray or by the egg, to a
        customer on file or a walk-in, paid or on credit. See{" "}
        <A href="/features">all features</A> or <A href="/pricing">pricing</A>.
      </p>
    </Prose>
  );
}
