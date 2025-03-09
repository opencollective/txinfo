"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import {
  SimplePool,
  type EventTemplate,
  finalizeEvent,
  NostrEvent,
  generateSecretKey,
  getPublicKey,
} from "nostr-tools";
import relays from "@/relays.json";
import { decode, nsecEncode, npubEncode } from "nostr-tools/nip19";
import { db } from "@/services/db";

type HexString<Length extends number> = `0x${string}` & { length: Length };
export type Address = HexString<42>;
export type TxHash = HexString<66>;
export type ChainId = number;
export type AddressType = "address" | "tx";
export type URI = `${ChainId}:${AddressType}:${Address | TxHash}`;

export type NostrNote = {
  id: string;
  content: string;
  created_at: number;
  pubkey: string;
  sig?: string;
  tags: string[][];
};

export type NostrProfile = {
  npub?: string;
  name: string;
  about: string;
  picture: string;
  website: string;
};

interface NostrContextType {
  pool: SimplePool | null;
  connectedRelays: string[];
  profiles: Record<string, NostrProfile>;
  notesByURI: Record<URI, NostrNote[]>;
  subscribeToNotesByURI: (URIs: URI[]) => void;
  subscribeToProfiles: (pubkeys: string[]) => void;
  updateProfile: ({
    name,
    about,
    picture,
    website,
  }: {
    name: string;
    about: string;
    picture: string;
    website: string;
  }) => Promise<void>;
  publishNote: (
    URI: URI,
    { content, tags }: { content: string; tags: string[][] }
  ) => Promise<void>;
}

const NostrContext = createContext<NostrContextType | null>(null);

export type RelaySubscription = {
  close: () => void;
};

const getItem = (key: string) => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(key);
};

const setItem = (key: string, data: string) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, data);
};

export function NostrProvider({ children }: { children: React.ReactNode }) {
  const [pool, setPool] = useState<SimplePool | null>(null);
  const [connectedRelays, setConnectedRelays] = useState<string[]>([]);
  const [notesByURI, setNotesByURI] = useState<Record<string, NostrEvent[]>>(
    {}
  ); // Stores kind 1111 events
  const [profiles, setProfiles] = useState<Record<string, NostrProfile>>({});
  const subRef = useRef<RelaySubscription | undefined>(null);
  const profilesSubscriptionsRef = useRef<RelaySubscription | undefined>(null);
  const subscribedURIs = useRef<URI[]>([]);
  const subscribedProfiles = useRef<string[]>([]);

  useEffect(() => {
    const _pool = new SimplePool();

    let nsec = getItem("nostr_nsec");
    let pubkey = getItem("nostr_pubkey");

    if (!nsec) {
      const secretKey = generateSecretKey();
      nsec = nsecEncode(secretKey);
      setItem("nostr_nsec", nsec);
      pubkey = getPublicKey(secretKey);
      setItem("nostr_pubkey", pubkey);
    }
    if (!pubkey) {
      const { data: secretKey } = decode(nsec);
      pubkey = getPublicKey(secretKey as Uint8Array);
      setItem("nostr_pubkey", pubkey);
    }
    const npub = npubEncode(pubkey);
    setItem("nostr_npub", npub);
    if (!npub) {
      throw new Error("useNostr: No npub");
    }

    // Try to connect to each relay independently
    relays.forEach(async (url) => {
      try {
        await _pool.ensureRelay(url, {
          // Add WebSocket options
          connectionTimeout: 3000, // 3 seconds timeout
        });
        console.log(`Connected to ${url}`);
        setConnectedRelays((prev) => [...prev, url]);
      } catch (err) {
        console.warn(`Failed to connect to ${url}:`, err);
        // Continue with other relays even if one fails
      }
    });

    // Set pool even if some relays fail
    setPool(_pool);

    return () => {
      try {
        _pool.close(relays);
      } catch (err) {
        console.warn("Error closing pool:", err);
      }
    };
  }, []);

  const getURIFromNostrEvent = (event: NostrEvent): URI | undefined => {
    return event.tags.find((t) => t[0] === "I")?.[1] as URI | undefined;
  };

  const addNostrEventsToState = (events: NostrEvent[]) => {
    if (events.length === 0) return;
    setNotesByURI((prev) => {
      events.forEach((event) => {
        const uri = getURIFromNostrEvent(event);
        if (!uri) return;
        prev[uri] = prev[uri] || [];
        // Avoid duplicate notes
        if (!prev[uri].some((e) => e.id === event.id)) {
          prev[uri].push(event);
        }
      });
      return prev;
    });
  };

  const subscribeToProfiles = (pubkeys: string[]) => {
    if (pubkeys.length === 0) return;

    // Close any existing subscription before starting a new one
    if (profilesSubscriptionsRef.current) {
      profilesSubscriptionsRef.current.close();
    }

    const newPubkeys = pubkeys.filter(
      (pk) => !subscribedProfiles.current.some((p) => p === pk)
    );

    if (newPubkeys.length === 0) return;

    // Subscribing to new URIs
    subscribedProfiles.current = [...subscribedProfiles.current, ...newPubkeys];

    profilesSubscriptionsRef.current = pool?.subscribeMany(
      relays,
      [{ kinds: [0], authors: subscribedProfiles.current }],
      {
        onevent: (event) => {
          const profile = JSON.parse(event.content) as NostrProfile;
          setProfiles((prev) => {
            prev[event.pubkey] = profile;
            return prev;
          });
        },
      }
    );
  };

  // Subscribe to kind 1111 notes with #i tags
  const subscribeToNotesByURI = async (URIs: URI[]) => {
    if (URIs.length === 0) return;

    // Close any existing subscription before starting a new one
    if (subRef.current) {
      subRef.current.close();
    }

    const cachedEvents = await db.getNostrEventsByURIs(URIs);
    addNostrEventsToState(cachedEvents);

    const newURIs = URIs.filter(
      (uri) => !subscribedURIs.current.some((u) => u === uri.toLowerCase())
    );

    if (newURIs.length === 0) return;

    subscribedURIs.current = [
      ...subscribedURIs.current,
      ...newURIs.map((u) => u.toLowerCase() as URI),
    ];

    const filter = {
      kinds: [1111], // Listen for kind 1111 notes
      "#I": subscribedURIs.current, // Subscribe to multiple #i tags
    };

    subRef.current = pool?.subscribeMany(relays, [filter], {
      onevent: (event) => {
        // cache event in indexedDB
        const uri = getURIFromNostrEvent(event);
        console.log(">>> NostrProvider event received:", uri, event);
        if (!uri) return;
        addNostrEventsToState([event]);
        db.addNostrEvent(uri, event);
      },
    });
  };

  const publishNote = async (
    URI: URI,
    { content, tags }: { content: string; tags: string[][] }
  ) => {
    if (!pool) throw new Error("Not connected");
    const nsec = getItem("nostr_nsec");
    if (!nsec) throw new Error("Not logged in");

    const { data: secretKey } = decode(nsec);
    const event: EventTemplate = {
      kind: 1111,
      created_at: Math.floor(Date.now() / 1000),
      content,
      tags: [["I", URI.toLowerCase()], ...tags],
    };
    const signedEvent = finalizeEvent(event, secretKey as Uint8Array);
    console.log(">>> NostrProvider publishNote: signedEvent", signedEvent);
    await Promise.any(pool.publish(relays, signedEvent));
    db.addNostrEvent(URI, signedEvent);
    addNostrEventsToState([signedEvent]);
  };

  const updateProfile = async ({
    name,
    about,
    picture,
    website,
  }: {
    name: string;
    about: string;
    picture: string;
    website: string;
  }) => {
    if (!pool) throw new Error("Not connected");
    const nsec = getItem("nostr_nsec");
    if (!nsec) throw new Error("Not logged in");

    const { data: secretKey } = decode(nsec);
    const profile = { name, about, picture, website } as NostrProfile;
    const event: EventTemplate = {
      kind: 0,
      created_at: Math.floor(Date.now() / 1000),
      content: JSON.stringify(profile),
      tags: [],
    };
    const signedEvent = finalizeEvent(event, secretKey as Uint8Array);
    setProfiles((prev) => {
      prev[signedEvent.pubkey] = profile;
      return prev;
    });
    await Promise.any(pool.publish(relays, signedEvent));
  };

  // Proceed if at least one relay is connected
  // const isReady = pool && connectedRelays.length > 0;

  return (
    <NostrContext.Provider
      value={{
        pool,
        connectedRelays,
        notesByURI,
        subscribeToNotesByURI,
        subscribeToProfiles,
        profiles,
        updateProfile,
        publishNote,
      }}
    >
      {children}
    </NostrContext.Provider>
  );
}

export const useProfile = (pubkey?: string) => {
  const context = useContext(NostrContext);
  if (!context) {
    throw new Error("useProfile must be used within NostrProvider");
  }
  const nostr_pubkey = pubkey || getItem("nostr_pubkey");
  if (!nostr_pubkey) {
    console.log(">>> useProfile: Not logged in");
    return {
      profile: null,
      updateProfile: context.updateProfile,
    };
  }

  context.subscribeToProfiles([nostr_pubkey]);

  return {
    profile: context.profiles[nostr_pubkey],
    updateProfile: context.updateProfile,
  };
};

export const useProfiles = (pubkeys: string[]) => {
  const context = useContext(NostrContext);
  if (!context) {
    throw new Error("useProfiles must be used within NostrProvider");
  }
  context.subscribeToProfiles(pubkeys);
  return { profiles: context.profiles };
};

export const useNotes = (URIs: URI[]) => {
  const context = useContext(NostrContext);
  if (!context) {
    throw new Error("useNotes must be used within NostrProvider");
  }
  context.subscribeToNotesByURI(URIs);
  return {
    notes: context.notesByURI,
  };
};

export const useNostr = () => {
  const context = useContext(NostrContext);
  if (!context) {
    throw new Error("useNostr must be used within NostrProvider");
  }
  return {
    pool: context.pool,
    connectedRelays: context.connectedRelays,
    updateProfile: context.updateProfile,
    profiles: context.profiles,
    publishNote: context.publishNote,
    notesByURI: context.notesByURI,
    subscribeToNotesByURI: context.subscribeToNotesByURI,
    subscribeToProfiles: context.subscribeToProfiles,
  };
};
