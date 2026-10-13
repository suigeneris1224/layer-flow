import {
  costPerKgFromSack,
  feedConversionRatio,
  feedCost,
  feedCostPerEgg,
  feedPerHen,
} from "@/lib/domain/calculations";
import { formatCurrency, formatNumber } from "@/lib/format";
import { A, Callout, ExampleTable, Formula, Prose } from "../prose";

const SACK_PRICE = 1_450;
const SACK_KG = 50;
const HENS = 1_000;
const FEED_KG = 115;
const EGGS = 870;

const perKg = costPerKgFromSack(SACK_PRICE, SACK_KG);
const dailyCost = feedCost(FEED_KG, perKg);

export default function FeedCostPost() {
  return (
    <Prose>
      <p>
        On most layer farms, feed is the single biggest expense — often well over half of what it
        costs to run the farm. Small changes in how much feed is used, or what it costs, move your
        profit more than almost anything else. Yet feed is usually bought in sacks and recorded in
        kilos, which makes it easy to lose track of.
      </p>

      <h2>Step 1: turn the sack price into a price per kilo</h2>
      <Formula>Cost per kilo = sack price ÷ sack weight (kg)</Formula>
      <p>
        Sacks come in different sizes — 25 kg and 50 kg are common — and the price per sack varies
        by supplier and formulation, so always work from your own receipts. As an example, a{" "}
        {SACK_KG} kg sack bought for {formatCurrency(SACK_PRICE)} costs{" "}
        <strong>{formatCurrency(perKg)} per kilo</strong>.
      </p>

      <h2>Step 2: record the feed you actually use</h2>
      <p>
        Record the kilos fed each day, per flock. Purchases tell you what you spent; usage tells you
        what the flock consumed, which is what your cost per egg should be based on. The difference
        between the two — feed bought but not used — is stock on hand, or waste.
      </p>

      <h2>Step 3: check feed per hen per day</h2>
      <Formula>Feed per hen (kg) = feed used ÷ hens present</Formula>
      <p>
        A laying hen typically eats roughly 100–130 grams of feed per day, depending on breed, body
        weight, the stage of lay, and the weather. Your breed&apos;s management guide will give a
        more precise target.
      </p>
      <ul>
        <li>
          <strong>Well above the range</strong> often points to spillage, rodents, or feeders that
          are filled too high.
        </li>
        <li>
          <strong>Well below it</strong> can mean hens aren&apos;t eating — heat, illness, or a
          problem with the feed itself — and usually shows up in laying rate a few days later.
        </li>
      </ul>

      <h2>A worked example</h2>
      <ExampleTable
        rows={[
          ["Hens present", formatNumber(HENS)],
          ["Feed used today", `${formatNumber(FEED_KG)} kg`],
          ["Feed per hen", `${formatNumber(feedPerHen(FEED_KG, HENS) * 1000)} g`],
          ["Cost per kilo", formatCurrency(perKg)],
          ["Feed cost today", formatCurrency(dailyCost)],
          ["Eggs collected", formatNumber(EGGS)],
          ["Feed cost per egg", formatCurrency(feedCostPerEgg(dailyCost, EGGS))],
          ["Feed per egg", `${formatNumber(feedConversionRatio(FEED_KG, EGGS) * 1000)} g`],
        ]}
      />
      <p>
        <strong>Feed per egg</strong> is worth watching on its own: it measures how efficiently the
        flock turns feed into eggs, regardless of what the feed costs. If it rises while the feed
        price stays the same, the flock is eating more for the same output.
      </p>

      <Callout title="Tip: note when you change feed">
        <p>
          When you switch supplier or formulation, write down the date. If laying rate or feed per
          hen moves over the next week, you&apos;ll know what changed.
        </p>
      </Callout>

      <h2>Feed tracking in LayerFlow</h2>
      <p>
        In LayerFlow you can enter feed cost per kilo directly, or give the sack size and sack price
        and let it work out the cost per kilo for you. Daily usage feeds straight into your cost per
        egg and estimated operating profit. Read next:{" "}
        <A href="/blog/how-to-calculate-cost-per-egg">how to calculate your cost per egg</A>.
      </p>
    </Prose>
  );
}
