"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";
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
import { insertEventIntoDescendingList } from "nostr-tools/utils";
import { URI } from "@/types";

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
  publishMetadata: (
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

const getURIFromNostrEvent = (event: NostrEvent): URI | undefined => {
  return event.tags.find((t) => t[0] === "I" || t[0] === "i")?.[1] as
    | URI
    | undefined; // TODO: remove "I" (backward compatibility)
};

const getKindFromURI = (uri: URI): string => {
  const type = uri.match(/:tx:/) ? "tx" : "address";
  const blockchain = uri.startsWith("bitcoin") ? "bitcoin" : "ethereum";
  return `${blockchain}:${type}`;
};

const convertOldNostrEvent = (event: NostrEvent): NostrEvent => {
  const oldURI = getURIFromNostrEvent(event);
  const newURI = `ethereum:${oldURI}`;
  const newEvent: NostrEvent = {
    ...event,
    id: "", // Will be set by finalizeEvent
    sig: "", // Will be set by finalizeEvent
    tags: [
      ["i", newURI],
      ["k", getKindFromURI(getURIFromNostrEvent(event) as URI)],
      ...event.tags.filter((t) => t[0] !== "I"),
    ],
  };
  return newEvent;
};

export function NostrProvider({ children }: { children: React.ReactNode }) {
  const [pool, setPool] = useState<SimplePool | null>(null);
  const [connectedRelays, setConnectedRelays] = useState<string[]>([]);
  const [notesByURI, setNotesByURI] = useState<Record<string, NostrEvent[]>>(
    {}
  ); // Stores kind 1111 events
  const [profiles, setProfiles] = useState<Record<string, NostrProfile>>({});
  const subRef = useRef<RelaySubscription[]>([]);
  const profilesSubscriptionsRef = useRef<RelaySubscription | undefined>(null);
  const subscribedURIs = useRef<Record<URI, number>>({});
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
        console.log(`>>> NostrProvider connected to ${url}`);
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

  const addNostrEventsToState = useCallback((events: NostrEvent[]) => {
    if (!events || events.length === 0) return;

    setNotesByURI((prev) => {
      let hasNewEvents = false;
      const next = { ...prev };

      events.forEach((event) => {
        const uri = getURIFromNostrEvent(event);
        if (!uri) return;

        next[uri] = next[uri] || [];
        // Check if event already exists
        if (!next[uri].some((e) => e.id === event.id)) {
          hasNewEvents = true;
          next[uri] = insertEventIntoDescendingList(next[uri], event);
        }
      });

      // Only return new state if we actually added new events
      return hasNewEvents ? next : prev;
    });
  }, []);

  const subscribeToProfiles = useCallback(
    (pubkeys: string[]) => {
      if (pubkeys.length === 0) return;

      // Close any existing subscription before starting a new one
      if (profilesSubscriptionsRef.current) {
        profilesSubscriptionsRef.current.close();
      }

      const newPubkeys = pubkeys.filter(
        (pk) => !subscribedProfiles.current.some((p) => p === pk)
      );

      if (newPubkeys.length === 0) return;
      console.log(
        ">>> NostrProvider subscribeToProfiles: newPubkeys",
        newPubkeys
      );

      // Subscribing to new URIs
      subscribedProfiles.current = [
        ...subscribedProfiles.current,
        ...newPubkeys,
      ];

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
    },
    [pool]
  );

  // Get a number between 0 and 20 based on the uri
  const getSubscriptionGroup = (uri: URI) => {
    // Use the last 2 characters of the hash for better distribution
    const hash = uri.split(":").pop() || "";
    const lastTwoChars = hash.slice(-2);
    return parseInt(lastTwoChars, 16) % 20;
  };

  const createNewSubscription = useCallback(
    (uris: URI[], groupIndex: number) => {
      const filter = {
        kinds: [1111], // Listen for kind 1111 notes
        "#I": uris, // Subscribe to multiple #i tags
      };

      if (subRef.current[groupIndex]) {
        subRef.current[groupIndex].close();
      }
      subRef.current[groupIndex] = pool?.subscribeMany(relays, [filter], {
        onevent: (event) => {
          // cache event in indexedDB
          const uri = getURIFromNostrEvent(event);
          console.log(">>> NostrProvider event received:", uri, event);
          if (!uri) return;
          addNostrEventsToState([event]);
          db?.addNostrEvent(uri, event);
        },
      }) as RelaySubscription;
    },
    [pool, addNostrEventsToState]
  );

  // Subscribe to kind 1111 notes with #i tags
  const subscribeToNotesByURI = useCallback(
    async (URIs: URI[]) => {
      if (URIs.length === 0) return;

      const newURIs: URI[] = [];
      const subscriptionGroupsToUpdate: Set<number> = new Set();
      URIs.forEach((u) => {
        const uri = u.toLowerCase() as URI;
        if (!subscribedURIs.current[uri]) {
          newURIs.push(uri);
          subscribedURIs.current[uri] = getSubscriptionGroup(uri);
          subscriptionGroupsToUpdate.add(subscribedURIs.current[uri]);
        }
      });
      if (newURIs.length === 0) return;

      const cachedEvents = await db?.getNostrEventsByURIs(newURIs);
      addNostrEventsToState(cachedEvents);

      Array.from(subscriptionGroupsToUpdate).forEach((groupIndex) => {
        const groupURIs = Object.keys(subscribedURIs.current).filter(
          (uri: string) => subscribedURIs.current[uri as URI] === groupIndex
        );
        createNewSubscription(groupURIs as URI[], groupIndex);
      });
    },
    [addNostrEventsToState, createNewSubscription]
  );

  const publishEvent = useCallback(
    async (event: EventTemplate, nsec: string) => {
      if (!pool) throw new Error("Not connected");

      const { data: secretKey } = decode(nsec);
      const signedEvent = finalizeEvent(event, secretKey as Uint8Array);
      console.log(">>> NostrProvider publishEvent: signedEvent", signedEvent);
      await Promise.any(pool.publish(relays, signedEvent));
      addNostrEventsToState([signedEvent]);
      console.log(
        ">>> NostrProvider publishEvent: signedEvent added to state",
        signedEvent
      );
      return signedEvent;
    },
    [pool, addNostrEventsToState]
  );

  const publishMetadata = useCallback(
    async (
      uri: URI,
      { content, tags }: { content: string; tags: string[][] }
    ) => {
      const nsec = getItem("nostr_nsec");
      if (!nsec) throw new Error("Not logged in");

      const event: EventTemplate = {
        kind: 1111,
        created_at: Math.floor(Date.now() / 1000),
        content,
        tags: [["i", uri], ["k", getKindFromURI(uri)], ...tags],
      };

      const signedEvent = await publishEvent(event, nsec);
      db?.addNostrEvent(uri, signedEvent);
      return signedEvent;
    },
    [publishEvent]
  );

  const updateProfile = useCallback(
    async ({
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
    },
    [pool]
  );

  // Proceed if at least one relay is connected
  // const isReady = pool && connectedRelays.length > 0;

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      pool,
      connectedRelays,
      notesByURI,
      subscribeToNotesByURI,
      subscribeToProfiles,
      profiles,
      updateProfile,
      publishMetadata,
    }),
    [
      pool,
      connectedRelays,
      notesByURI,
      subscribeToNotesByURI,
      subscribeToProfiles,
      profiles,
      updateProfile,
      publishMetadata,
    ] // Include all dependencies
  );

  // Upgrade old events (deprecated)
  useEffect(() => {
    const nsec = getItem("nostr_nsec") as string;
    db?.getNostrEvents().then((events) => {
      console.log(
        ">>> NostrProvider events",
        events.filter((e) => getURIFromNostrEvent(e)?.startsWith("ethereum:"))
          .length,
        "starts with ethereum out of",
        events.length,
        events
      );
      events.slice(0, 20).forEach(async (event) => {
        const uri = getURIFromNostrEvent(event);
        if (!uri) return;
        if (uri.match(/^[0-9]+:/)) {
          const newEvent = convertOldNostrEvent(event);
          console.log(">>> waiting 3 seconds to connect to pool");
          await new Promise((resolve) => setTimeout(resolve, 3000));
          try {
            const signedEvent = await publishEvent(newEvent, nsec);
            if (signedEvent.id) {
              db?.addNostrEvent(`ethereum:${uri}` as URI, signedEvent);
              db?.deleteNostrEvent(event.id);
              console.log(">>> Upgraded", event, newEvent);
            }
          } catch (error) {
            console.error(">>> Error upgrading event", error, event, newEvent);
          }
        }
      });
    });
  }, [publishEvent]);

  return (
    <NostrContext.Provider value={contextValue}>
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
    publishMetadata: context.publishMetadata,
    notesByURI: context.notesByURI,
    subscribeToNotesByURI: context.subscribeToNotesByURI,
    subscribeToProfiles: context.subscribeToProfiles,
  };
};
