import type { ComponentType } from "react";
import LayingRatePost from "./how-to-calculate-laying-rate";
import CostPerEggPost from "./how-to-calculate-cost-per-egg";
import FeedCostPost from "./how-to-track-feed-costs-by-the-sack";
import EggPricingPost from "./pricing-eggs-by-size-and-tray";
import OperatingProfitPost from "./reading-your-farms-operating-profit";

/** Post bodies by slug. Metadata lives in lib/blog/posts.ts. */
export const POST_BODIES: Record<string, ComponentType> = {
  "how-to-calculate-laying-rate": LayingRatePost,
  "how-to-calculate-cost-per-egg": CostPerEggPost,
  "how-to-track-feed-costs-by-the-sack": FeedCostPost,
  "pricing-eggs-by-size-and-tray": EggPricingPost,
  "reading-your-farms-operating-profit": OperatingProfitPost,
};
