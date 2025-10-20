"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useNostr } from "@/providers/NostrProvider";
import { Edit, ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import chains from "../chains.json";
import CopyableValue from "./CopyableValue";

import EditMetadataForm from "@/components/EditMetadataForm";
import { generateURI, getProfileFromNote } from "@/lib/utils";
import type { Address, ChainConfig, URI } from "@/types";
import { getENSDetailsFromAddress } from "@/utils/crypto.server";
import Avatar from "./Avatar";
import TagsList from "./TagsList";
import TagValue from "./TagValue";

export default function AddressInfo({
  chain,
  address,
  ensName,
  addressType = "address",
}: {
  chain: string;
  address: Address;
  ensName?: string;
  addressType?: "address" | "token" | "eoa" | "contract";
}) {
  const chainConfig = chains[chain as keyof typeof chains] as ChainConfig;
  const providerType = chainConfig.type;
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { notesByURI, subscribeToNotesByURI } = useNostr();
  const uri = generateURI(providerType, { chainId: chainConfig.id, address });
  subscribeToNotesByURI([uri]);
  const latestNote = notesByURI[uri as URI]?.[0];
  const profileFromNote = getProfileFromNote(latestNote);
  const [profile, setProfile] = useState(
    profileFromNote || {
      uri,
      address,
      name: ensName,
    }
  );

  useEffect(() => {
    const profileFromNote = getProfileFromNote(latestNote);
    if (profileFromNote) {
      setProfile(profileFromNote);
      return;
    }
  }, [latestNote]);

  useEffect(() => {
    const fetchENSDetails = async () => {
      const ensDetails = await getENSDetailsFromAddress(address);
      setProfile((prev) => {
        if (prev.name) return prev;
        return {
          uri,
          address,
          name: ensDetails?.name || ensName,
          about: ensDetails?.description,
          picture: ensDetails?.avatar,
          website: ensDetails?.url,
        };
      });
    };
    if (!latestNote?.content) {
      switch (providerType) {
        case "ethereum":
          fetchENSDetails();
          break;
        default:
        // For other chains, we do not support name, so we can skip this
      }
    }
  }, [address, uri, ensName, latestNote]);

  if (!chainConfig) {
    return <div>Chain not found</div>;
  }

  const onCancelEditing = () => {
    setIsEditing(false);
  };

  return (
    <Card>
      <CardContent className="space-y-6 p-4">
        <div className="flex flex-row gap-2 items-center">
          <div className="flex flex-row">
            <Avatar profile={profile} className="h-16 w-16 mr-2" />
          </div>
          <div>
            <div className="flex flex-col">
              {isEditing ? (
                <div className="space-y-2">
                  <EditMetadataForm
                    uri={uri}
                    content={latestNote?.content}
                    tags={latestNote?.tags}
                    inputRef={inputRef}
                    onCancel={onCancelEditing}
                  />
                </div>
              ) : (
                <div className="group relative flex flex-row items-center">
                  <span className="pr-2">{profile.name}</span>

                  <button
                    onClick={() => {
                      setIsEditing(true);

                      // Focus the input when entering edit mode
                      setTimeout(() => {
                        inputRef.current?.select();
                      }, 0);
                    }}
                    className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>
              )}
            </div>
            <p>
              <TagValue note={latestNote} kind="about" />
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <TagsList tags={latestNote?.tags} kinds={["t", "website"]} />
              <CopyableValue
                value={providerType === "stacks" ? address.toUpperCase() : address}
                className="text-xs bg-transparent"
                truncate
              />
              <a
                href={`${chainConfig?.explorer_url}/${addressType}/${address}`}
                target="_blank"
                title={`View on ${chainConfig?.explorer_name}`}
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
