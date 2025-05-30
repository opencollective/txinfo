import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatInTimeZone } from "date-fns-tz";
import { Address, ChainConfig, ChainModel, ProfileData, URI } from "@/types";
import { npubEncode } from "nostr-tools/nip19";
import chains from "@/chains.json";
import { NostrNote } from "@/providers/NostrProvider";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const generateAvatar = (address: string) => {
  return `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`;
};

export const getAddressFromURI = (uri: string): Address => {
  return uri.substring(uri.lastIndexOf(":") + 1) as Address;
};

export const getChainIdFromURI = (uri: string): number | undefined => {
  if (uri && uri.startsWith("ethereum")) {
    return parseInt(uri.split(":")[1]);
  }
  return undefined;
};

export const getChainSlugFromChainId = (
  chainId?: number
): string | undefined => {
  if (!chainId) return undefined;
  return Object.keys(chains).find(
    (key) => chains[key as keyof typeof chains].id === chainId
  );
};

export const getProfileFromNote = (
  note: NostrNote
): ProfileData | undefined => {
  if (note) {
    const uri = note.tags.find((t) => t[0] === "i")?.[1];
    if (!uri) return undefined;
    const address = getAddressFromURI(uri);
    return {
      uri: uri as URI,
      address,
      name: note.content || "",
      about: note.tags.find((t) => t[0] === "about")?.[1] || "",
      picture: note.tags.find((t) => t[0] === "picture")?.[1] || "",
      website: note.tags.find((t) => t[0] === "website")?.[1] || "",
    };
  }
};

export const formatNumber = (
  number: number,
  precision?: number,
  short = true
) => {
  let num = number,
    prec = precision || 2,
    suffix = "";
  const locale =
    typeof window !== "undefined" ? window.navigator.language : "en-US";

  if (short) {
    if (Math.abs(number) > 1000000000000) {
      num = number / 1000000000000;
      prec = 2;
      suffix = "T";
    } else if (Math.abs(number) > 1000000000) {
      num = number / 1000000000;
      prec = 2;
      suffix = "B";
    } else if (Math.abs(number) > 1000000) {
      num = number / 1000000;
      prec = 2;
      suffix = "M";
    } else if (Math.abs(number) > 1000) {
      num = number / 1000;
      prec = 2;
      suffix = "K";
    }
  }
  return (
    num.toLocaleString(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: prec,
    }) + suffix
  );
};

export function formatTimestamp(ts: number, format = "MMM d HH:mm"): string {
  if (!ts) {
    console.error("formatTimestamp: ts is undefined");
    return "";
  }
  return formatInTimeZone(
    ts * 1000,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    format // "MMM d, yyyy 'at' HH:mm:ss zzz"
  );
}

export function generateURI(
  model: ChainModel,
  params: { chainId?: number; txHash?: string; address?: string }
): URI {
  let parts: (string | number)[] = [model];
  switch (model) {
    case "ethereum":
      if (params.chainId) {
        parts.push(params.chainId);
      }
      if (params.txHash) {
        parts.push("tx");
        parts.push(params.txHash);
      } else if (params.address) {
        parts.push("address");
        parts.push(params.address);
      } else {
        throw new Error("Invalid parameters: " + JSON.stringify(params));
      }
      return parts.join(":").toLowerCase() as URI;
    case "rosetta":
      if (params.chainId) {
        parts.push(params.chainId);
      }
      if (params.txHash) {
        parts.push("tx");
        parts.push(params.txHash);
      } else if (params.address) {
        parts.push("address");
        parts.push(params.address);
      } else {
        throw new Error("Invalid parameters: " + JSON.stringify(params));
      }
      return parts.join(":").toLowerCase() as URI;
  }
}

export function getNpubFromPubkey(
  pubkey: string,
  options: { truncate?: boolean } = {}
) {
  const npub = npubEncode(pubkey);
  if (options.truncate) {
    return npub.slice(0, 6) + "..." + npub.slice(-4);
  }
  return npub;
}

export function isUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function getTxInfoUrlFromURI(uri?: string) {
  if (!uri) return null;
  const parts = uri.split(":");
  const chainId = parseInt(parts[1]);
  const addressType = parts[2];
  const value = parts[3];
  let res;
  Object.keys(chains).forEach((slug) => {
    const config = chains[slug as keyof typeof chains] as ChainConfig;
    if (config.id === chainId) {
      res = `/${slug}/${addressType}/${value}`;
      return;
    }
  });
  return res;
}

// Extract hashtags from a text string
// 1. #[kind:value with spaces] format
// 2. #simpletag
// 3. #key:attr format without spaces
export function extractHashtags(text: string): {
  tags: string[][];
  cleanDescription: string;
} {
  const hashtagRegex = /#(?:\[(\w+:[^\]]+)\]|(\w+:(?:[^\s#]+)?|\w+))/g;
  const matches = text.match(hashtagRegex) || [];

  // Remove hashtags from the description
  const cleanDescription = text
    .replace(hashtagRegex, "")
    .replace(/\s+/g, " ")
    .trim();

  const tags = matches.map((tag) => {
    // If the tag starts with #[, we need to extract the content within brackets
    if (tag.startsWith("#[")) {
      const content = tag.slice(2, -1); // Remove #[ and ]
      return [
        content.substring(0, content.indexOf(":")),
        content.substring(content.indexOf(":") + 1),
      ];
    }
    // Handle regular tags
    if (tag.includes(":")) {
      return [
        tag.substring(1, tag.indexOf(":")),
        tag.substring(tag.indexOf(":") + 1),
      ];
    }
    return ["t", tag.substring(1)];
  });

  return { tags, cleanDescription };
}

export function removeTagsFromContent(content: string): string {
  if (!content) return "";
  // Updated regex to match hashtags with:
  // 1. [kind:value with spaces] format
  // 2. simple values (word)
  // 3. key:attr format without spaces
  const hashtagRegex = /#(?:\[(\w+:[^\]]+)\]|(\w+:(?:[^\s#]+)?|\w+))/g;

  // Remove hashtags from the description
  const cleanDescription = content
    .replace(hashtagRegex, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleanDescription;
}

type URIObject = {
  blockchain: string;
  addressType: string;
  chainId?: number;
  txHash?: string;
  txid?: string;
  address?: string;
};

export function decomposeURI(uri: string): URIObject {
  if (uri.startsWith("ethereum")) {
    const [blockchain, chainId, addressType, value] = uri.split(":");
    const res: URIObject = {
      blockchain,
      chainId: parseInt(chainId),
      addressType,
    };
    if (addressType === "tx") {
      res.txHash = value;
    } else if (addressType === "address") {
      res.address = value;
    }
    return res;
  } else if (uri.startsWith("bitcoin")) {
    const [blockchain, addressType, value] = uri.split(":");
    const res: URIObject = {
      blockchain,
      addressType,
    };
    if (addressType === "tx") {
      res.txid = value;
    } else if (addressType === "address") {
      res.address = value;
    }
    return res;
  } else {
    throw new Error("Invalid URI");
  }
}
