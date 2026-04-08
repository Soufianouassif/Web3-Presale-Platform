import { Router } from "express";
import rateLimit from "express-rate-limit";

const router = Router();

// ── Validate Twitter username (alphanumeric + underscore, 1-50 chars) ─────────
const USERNAME_RE = /^[A-Za-z0-9_]{1,50}$/;

const twitterLimiter = rateLimit({
  windowMs: 60 * 1_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests" },
});

router.get("/twitter/timeline/:username", twitterLimiter, async (req, res) => {
  try {
    const { username } = req.params;

    // منع SSRF: التحقق من صحة اسم المستخدم قبل إدراجه في الـ URL
    if (!USERNAME_RE.test(username)) {
      res.status(400).json({ error: "Invalid username" });
      return;
    }

    const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${username}?dnt=true&lang=en&showReplies=false`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      res.status(response.status).json({ error: "Failed to fetch timeline" });
      return;
    }

    const html = await response.text();

    const tweets: Array<{
      text: string;
      time: string;
      name: string;
      handle: string;
      avatar: string;
      likes: string;
      url: string;
    }> = [];

    const tweetBlocks = html.split('data-tweet-id="').slice(1);

    for (const block of tweetBlocks) {
      const textMatch = block.match(
        /<div[^>]*class="[^"]*timeline-Tweet-text[^"]*"[^>]*>([\s\S]*?)<\/div>/
      );
      const text = textMatch
        ? textMatch[1]
            .replace(/<[^>]+>/g, "")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .trim()
        : "";

      const timeMatch = block.match(
        /<time[^>]*datetime="([^"]*)"[^>]*>([\s\S]*?)<\/time>/
      );
      const time = timeMatch
        ? timeMatch[2].replace(/<[^>]+>/g, "").trim()
        : "";

      const nameMatch = block.match(
        /class="[^"]*TweetAuthor-name[^"]*"[^>]*>[\s\S]*?title="([^"]*)"/
      );
      const name = nameMatch ? nameMatch[1] : username;

      const handleMatch = block.match(
        /class="[^"]*TweetAuthor-screenName[^"]*"[^>]*>[\s\S]*?title="([^"]*)"/
      );
      const handle = handleMatch ? handleMatch[1] : `@${username}`;

      const avatarMatch = block.match(
        /class="[^"]*TweetAuthor-avatar[^"]*"[\s\S]*?src="([^"]*)"/
      );
      const avatar = avatarMatch ? avatarMatch[1] : "";

      const likesMatch = block.match(
        /class="[^"]*TweetInfo-heartStat[^"]*"[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/
      );
      const likes = likesMatch
        ? likesMatch[1].replace(/<[^>]+>/g, "").trim()
        : "";

      const urlMatch = block.match(
        /class="[^"]*timeline-Tweet-timestamp[^"]*"[^>]*href="([^"]*)"/
      );
      const tweetUrl = urlMatch ? urlMatch[1] : `https://x.com/${username}`;

      if (text) {
        tweets.push({ text, time, name, handle, avatar, likes, url: tweetUrl });
      }
    }

    if (tweets.length === 0) {
      const simpleTextMatches = html.match(
        /class="[^"]*(?:tweet-text|e-entry-title)[^"]*"[^>]*>([\s\S]*?)<\/(?:p|div|span)>/g
      );
      if (simpleTextMatches) {
        for (const match of simpleTextMatches.slice(0, 5)) {
          const cleaned = match
            .replace(/<[^>]+>/g, "")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .trim();
          if (cleaned) {
            tweets.push({
              text: cleaned,
              time: "",
              name: username,
              handle: `@${username}`,
              avatar: "",
              likes: "",
              url: `https://x.com/${username}`,
            });
          }
        }
      }
    }

    res.json({
      username,
      tweets,
      count: tweets.length,
      rawHtml: tweets.length === 0 ? html.slice(0, 5000) : undefined,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
