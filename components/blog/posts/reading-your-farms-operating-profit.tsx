import { operatingProfit, percentChange, profitPerTray } from "@/lib/domain/calculations";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { A, Callout, ExampleTable, Formula, Prose } from "../prose";

const REVENUE = 176_500;
const COSTS = 119_300;
const EGGS = 19_560;
const LAST_MONTH_PROFIT = 52_400;
const profit = operatingProfit(REVENUE, COSTS);
const change = percentChange(profit, LAST_MONTH_PROFIT);

export default function OperatingProfitPost() {
  return (
    <Prose>
      <p>
        &quot;Did the farm make money this month?&quot; sounds like a simple question. Answering it
        honestly means being clear about which costs you&apos;re counting. Estimated operating
        profit is the most useful everyday answer — as long as you know what it includes and what
        it leaves out.
      </p>

      <h2>What is estimated operating profit?</h2>
      <Formula>Estimated operating profit = revenue − operating costs</Formula>
      <p>
        <strong>Revenue</strong> is what you earned from egg sales in the period.{" "}
        <strong>Operating costs</strong> are the costs of running the farm day to day: feed, labor,
        electricity and water, vaccines and medicine, packaging, transport, and repairs.
      </p>
      <p>It deliberately leaves out three things:</p>
      <ul>
        <li>
          <strong>Depreciation</strong> — the slow wearing out of cages, buildings, and equipment.
        </li>
        <li>
          <strong>Owner&apos;s draw</strong> — money the owner takes out for personal use.
        </li>
        <li>
          <strong>Financing costs</strong> — interest and loan repayments.
        </li>
      </ul>
      <p>
        That&apos;s why it&apos;s called <em>estimated</em> and <em>operating</em>: it isn&apos;t
        your net income or a tax figure. It answers a narrower, very practical question —{" "}
        <strong>is the day-to-day running of the farm earning more than it costs?</strong>
      </p>

      <h2>A worked example</h2>
      <ExampleTable
        rows={[
          ["Egg sales revenue", formatCurrency(REVENUE)],
          ["Operating costs", formatCurrency(COSTS)],
          ["Estimated operating profit", formatCurrency(profit)],
          ["Eggs produced", formatNumber(EGGS)],
          ["Profit per tray", formatCurrency(profitPerTray(REVENUE, COSTS, EGGS))],
          ["Last month's profit", formatCurrency(LAST_MONTH_PROFIT)],
          ["Change", change === null ? "—" : formatPercent(change)],
        ]}
      />

      <h2>How to read it</h2>
      <ul>
        <li>
          <strong>Look at the trend, not one month.</strong> A month with a big vaccine order or
          repair will dip. Several months in a row heading down is the signal.
        </li>
        <li>
          <strong>Break it down.</strong> If profit falls, check whether revenue fell (fewer eggs,
          lower prices, a smaller size mix) or costs rose (feed price, feed per hen, one-off
          expenses). The fix is different for each.
        </li>
        <li>
          <strong>Compare per tray.</strong> Profit per tray stays comparable even as the size of
          your flock changes.
        </li>
      </ul>
      <Callout title="Plan for the costs it leaves out">
        <p>
          A positive operating profit still has to cover the things it excludes — especially
          replacing your flock when it reaches the end of lay, and maintaining your house and
          cages. Setting aside part of each month&apos;s operating profit for these keeps a good
          year from turning into a hard one.
        </p>
      </Callout>

      <h2>Operating profit in LayerFlow</h2>
      <p>
        LayerFlow calculates estimated operating profit from the sales, feed usage, and expenses you
        record, and shows it over any period alongside revenue and costs — clearly labelled as an
        estimate, with exactly these exclusions. Start with{" "}
        <A href="/blog/how-to-calculate-cost-per-egg">your cost per egg</A>, or{" "}
        <A href="/signup">start free</A>.
      </p>
    </Prose>
  );
}
