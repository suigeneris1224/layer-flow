import { describe, expect, it } from "vitest";
import { planAvailabilityLabel } from "@/lib/subscriptions/plans";
import { FAQ_GROUPS, faqSchema, pickFaq } from "@/lib/marketing/faq";
import { POSTS, getPost, relatedPosts } from "@/lib/blog/posts";
import { POST_BODIES } from "@/components/blog/posts";

describe("planAvailabilityLabel", () => {
  it("labels an ungated capability as all plans", () => {
    expect(planAvailabilityLabel(null)).toBe("All plans");
  });

  it("names every plan from the cheapest one that includes the feature", () => {
    expect(planAvailabilityLabel("offline_mode")).toBe("Starter & Pro");
    expect(planAvailabilityLabel("multi_farm")).toBe("Pro");
  });
});

describe("pickFaq", () => {
  it("returns the published answers in the requested order", () => {
    const items = pickFaq(["Can I start for free?", "What is LayerFlow?"]);
    expect(items.map((item) => item.question)).toEqual(["Can I start for free?", "What is LayerFlow?"]);
  });

  it("throws on a question that isn't published, so a page can't silently lose it", () => {
    expect(() => pickFaq(["Is this a real question?"])).toThrow();
  });

  it("builds FAQPage schema that mirrors the items exactly", () => {
    const items = FAQ_GROUPS[0].items;
    const schema = faqSchema(items);
    expect(schema.mainEntity).toHaveLength(items.length);
    expect(schema.mainEntity[0].acceptedAnswer.text).toBe(items[0].answer);
  });
});

describe("blog posts", () => {
  it("has a body for every post and a post for every body", () => {
    expect(Object.keys(POST_BODIES).sort()).toEqual(POSTS.map((post) => post.slug).sort());
  });

  it("uses unique slugs and valid ISO dates", () => {
    expect(new Set(POSTS.map((post) => post.slug)).size).toBe(POSTS.length);
    for (const post of POSTS) {
      expect(post.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("never lists a post as related to itself", () => {
    const post = getPost(POSTS[0].slug)!;
    expect(relatedPosts(post).some((related) => related.slug === post.slug)).toBe(false);
  });
});
