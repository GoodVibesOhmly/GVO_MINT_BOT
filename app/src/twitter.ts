import { config } from "./config";
import { TwitterApi } from "twitter-api-v2";
import { ArtBlockInfo } from "./api_data";

const TWITTER_TIMEOUT_MS = 14 * 1000;

export const twitterClientV2 = new TwitterApi({
  appKey: config.twitterApiKey,
  appSecret: config.twitterApiSecret,
  accessToken: config.twitterOauthToken,
  accessSecret: config.twitterOauthSecret,
});

export interface Response {
  data: any;
}

function timeout(timeoutMs: number, failureMessage: string): Promise<never> {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject(failureMessage), timeoutMs);
  });
}

const uploadTwitterMediaWithTimeout = async (
  timeoutMs: number,
  based: Buffer
) => {
  // use race function to timeout because twitter library doesn't timeout
  return Promise.race([
    timeout(TWITTER_TIMEOUT_MS, "Twitter post timed out"),
    twitterClientV2.v1.uploadMedia(based, { type: "png" }),
  ]);
};

export const uploadTwitterImage = async (
  imgBinary: Buffer
): Promise<string | undefined> => {
  try {
    console.log("Uploading received image to Twitter");
    const uploadRes = await uploadTwitterMediaWithTimeout(
      TWITTER_TIMEOUT_MS,
      imgBinary
    );
    return uploadRes;
  } catch (e) {
    console.error(e);
    return undefined;
  }
};

export const tweetArtblock = async (artBlock: ArtBlockInfo) => {
  const imageUrl = artBlock.image;
  if (!artBlock.image) {
    console.error("No artblock image defined", JSON.stringify(artBlock));
    return;
  }
  const mediaId = await uploadTwitterImage(artBlock.imgBinary);
  if (!mediaId) {
    console.error("no media id returned, not tweeting");
    return;
  }
  console.log(`Uploaded image ${imageUrl} complete. Tweeting...`);
  const tweetText = `${artBlock.name} minted${
    artBlock.mintedBy ? ` by ${artBlock.mintedBy}` : ""
  }. \n\n https://artblocks.io/token/${artBlock.tokenID}`;
  console.log(`Tweeting ${tweetText}`);

  const tweetRes = await twitterClientV2.v1.tweet(tweetText, {
    media_ids: mediaId,
  });

  return {
    tweetRes,
    tweetUrl: `https://twitter.com/artblockmints/status/${tweetRes.id_str}`,
  };
};
